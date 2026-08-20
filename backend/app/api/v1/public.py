# ============================================================
# 文件功能：前台公开接口（Phase E，无鉴权）
# 公开只读 GET：
#   /banners           轮播（启用+时间范围内，缓存 60s）
#   /series            产品系列（启用）
#   /products          产品列表（on_shelf，分页 + 系列筛选）
#   /products/{id}     产品详情（views+1 + 搭配产品名）
#   /news              新闻列表（published，栏目筛选）
#   /news/{id}         新闻详情（views+1 + 上下篇）
#   /jobs              招聘列表（启用，栏目筛选）
#   /about/pages       关于子页（company_intro 即"关于我们" D1，缓存 60s）
#   /about/timeline    时间轴（history/brand_history）
#   /about/company     联系方式
#   /settings          站点配置（sliderInterval 等，缓存 60s）
# 公开提交 POST（Redis 限流 10 次/分/IP）：
#   /appointments      在线预约（校验+记录 IP）
#   /messages          留言咨询（校验+记录 IP，弱关联产品）
# 权威依据：实施方案 Phase E + §6 接口约定 + 数据库设计 §4。
# ============================================================
import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.redis import redis_cache
from app.models.business import Appointment, Message
from app.models.content import (
    AboutInfo, AboutTimeline, Banner, CompanyInfo, Job, News, Product,
    ProductSeries, SystemSettings,
)
from app.schemas.response import ApiResp

router = APIRouter(tags=["前台-公开"])

_CACHE_TTL = 60  # 内容接口缓存 60s（方案决策 D2）


def _get_cached(key: str, builder):
    """读缓存（JSON），未命中则构建并写入。"""
    cached = redis_cache.get(key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass
    data = builder()
    redis_cache.set(key, json.dumps(data, ensure_ascii=False, default=str), ttl=_CACHE_TTL)
    return data


def _jsonify(rows, out=None):
    """ORM 行 → dict 列表（字段对齐原型 STORE，时间转字符串）。"""
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        for k, v in list(d.items()):
            if isinstance(v, (datetime, date)):
                d[k] = v.isoformat()
        if out:
            d = {k: d[k] for k in out if k in d}
        result.append(d)
    return result


# ---------------- 轮播 / 系列 / 配置 ----------------
@router.get("/banners")
def public_banners(db: Session = Depends(get_db)):
    """轮播列表：启用 + 起止时间范围内，按 sort 升序（缓存 60s）。"""
    now = datetime.now(timezone.utc)
    data = _get_cached("pub:banners", lambda: _jsonify(
        db.query(Banner)
        .filter(Banner.deleted_at.is_(None), Banner.is_activate == 1)
        .filter((Banner.start_at.is_(None)) | (Banner.start_at <= now))
        .filter((Banner.end_at.is_(None)) | (Banner.end_at >= now))
        .order_by(Banner.sort.asc(), Banner.id.asc())
        .all(),
        out=["id", "title", "image", "link_url", "start_at", "end_at", "sort"],
    ))
    return ApiResp.ok(data=data)


@router.get("/series")
def public_series(db: Session = Depends(get_db)):
    """产品系列（启用），缓存 60s。"""
    data = _get_cached("pub:series", lambda: _jsonify(
        db.query(ProductSeries)
        .filter(ProductSeries.deleted_at.is_(None), ProductSeries.is_activate == 1)
        .order_by(ProductSeries.sort.asc(), ProductSeries.id.asc())
        .all(),
        out=["id", "name", "cover_image", "description", "sort"],
    ))
    return ApiResp.ok(data=data)


@router.get("/settings")
def public_settings(db: Session = Depends(get_db)):
    """站点配置（站名/Logo/ICP/版权/轮播间隔/百度地图 AK/地图图片），缓存 60s。"""
    def _build():
        s = db.query(SystemSettings).order_by(SystemSettings.id.asc()).first()
        return {
            "site_name": s.site_name if s else None,
            "logo": s.logo if s else None,
            "icp": s.icp if s else None,
            "copyright": s.copyright if s else None,
            "slider_interval": s.slider_interval if s else 4,
            "baidu_map_ak": s.baidu_map_ak if s else None,
            "map_image": s.map_image if s else None,
        }
    return ApiResp.ok(data=_get_cached("pub:settings", _build))


# ---------------- 产品 ----------------
@router.get("/products")
def public_products(
    page: int = 1,
    page_size: int = 12,
    series_id: int | None = None,
    db: Session = Depends(get_db),
):
    """产品列表：仅上架，支持系列筛选与分页（方案 Phase E）。"""
    page = max(1, page)
    page_size = min(50, max(1, page_size))
    q = db.query(Product).filter(
        Product.deleted_at.is_(None), Product.pub_status == "on_shelf"
    )
    if series_id:
        q = q.filter(Product.series_id == series_id)
    total = q.count()
    items = (
        q.order_by(Product.sort.asc(), Product.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    data = _jsonify(items, out=[
        "id", "product_code", "name", "description", "spec", "cover_image", "images",
        "is_top", "price_desc", "related_products", "series_id",
    ])
    return ApiResp.page(data, total, page, page_size)


@router.get("/products/{product_id}")
def public_product_detail(product_id: int, db: Session = Depends(get_db)):
    """产品详情：views+1；搭配产品返回名称/封面供链接卡片。"""
    p = db.get(Product, product_id)
    if not p or p.deleted_at is not None or p.pub_status != "on_shelf":
        return ApiResp.fail(code=40001, message="产品不存在或已下架")
    p.views += 1  # 浏览量 +1
    db.commit()
    d = _jsonify([p], out=[
        "id", "product_code", "name", "description", "spec", "cover_image", "images",
        "is_top", "price_desc", "related_products", "views", "series_id",
    ])[0]
    # 搭配产品（id → 简要信息）
    related_ids = d.get("related_products") or []
    if related_ids:
        rel_rows = db.query(Product).filter(Product.id.in_(related_ids)).all()
        d["related"] = [{
            "id": r.id, "name": r.name, "cover_image": r.cover_image,
            "product_code": r.product_code,
        } for r in rel_rows]
    else:
        d["related"] = []
    return ApiResp.ok(data=d)


# ---------------- 新闻 ----------------
@router.get("/news")
def public_news(
    category: str | None = Query(None, pattern="^(industry|company)$"),
    page: int = 1,
    page_size: int = 9,
    db: Session = Depends(get_db),
):
    """新闻列表：已发布，栏目筛选 + 置顶优先。"""
    page = max(1, page)
    page_size = min(50, max(1, page_size))
    q = db.query(News).filter(News.deleted_at.is_(None), News.pub_status == "published")
    if category:
        q = q.filter(News.category == category)
    total = q.count()
    items = (
        q.order_by(News.is_top.desc(), News.sort.asc(), News.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    data = _jsonify(items, out=[
        "id", "category", "title", "cover_image", "summary", "source", "author",
        "is_top", "views", "published_at",
    ])
    return ApiResp.page(data, total, page, page_size)


@router.get("/news/{news_id}")
def public_news_detail(news_id: int, db: Session = Depends(get_db)):
    """新闻详情：views+1 + 同栏目上下篇。"""
    n = db.get(News, news_id)
    if not n or n.deleted_at is not None or n.pub_status != "published":
        return ApiResp.fail(code=40001, message="新闻不存在")
    n.views += 1
    db.commit()
    d = _jsonify([n], out=[
        "id", "category", "title", "cover_image", "images", "summary", "content", "source",
        "author", "is_top", "views", "published_at",
    ])[0]
    # 上下篇（同栏目已发布，按 id 相邻）
    prev = db.query(News).filter(
        News.deleted_at.is_(None), News.pub_status == "published",
        News.category == n.category, News.id < n.id,
    ).order_by(News.id.desc()).first()
    nxt = db.query(News).filter(
        News.deleted_at.is_(None), News.pub_status == "published",
        News.category == n.category, News.id > n.id,
    ).order_by(News.id.asc()).first()
    d["prev"] = {"id": prev.id, "title": prev.title} if prev else None
    d["next"] = {"id": nxt.id, "title": nxt.title} if nxt else None
    return ApiResp.ok(data=d)


# ---------------- 招聘 ----------------
@router.get("/jobs")
def public_jobs(
    category: str | None = Query(None, pattern="^(industry|campus)$"),
    db: Session = Depends(get_db),
):
    """招聘列表：启用中，栏目筛选。"""
    q = db.query(Job).filter(Job.deleted_at.is_(None), Job.is_activate == 1)
    if category:
        q = q.filter(Job.category == category)
    items = q.order_by(Job.sort.asc(), Job.id.asc()).all()
    return ApiResp.ok(data=_jsonify(items, out=[
        "id", "category", "title", "count", "location", "salary_desc",
        "duty", "requirement", "email", "sort",
    ]))


# ---------------- 关于 / 联系方式 ----------------
@router.get("/about/pages")
def public_about_pages(db: Session = Depends(get_db)):
    """关于子页（company_intro 即"关于我们" D1），缓存 60s。"""
    data = _get_cached("pub:about_pages", lambda: _jsonify(
        db.query(AboutInfo).order_by(AboutInfo.id.asc()).all(),
        out=["page_key", "content"],
    ))
    return ApiResp.ok(data=data)


@router.get("/about/timeline")
def public_about_timeline(
    type: str | None = Query(None, pattern="^(history|brand_history)$"),
    db: Session = Depends(get_db),
):
    """时间轴（发展历程/品牌历程）。"""
    q = db.query(AboutTimeline).filter(AboutTimeline.deleted_at.is_(None))
    if type:
        q = q.filter(AboutTimeline.type == type)
    items = q.order_by(AboutTimeline.sort.asc(), AboutTimeline.id.asc()).all()
    return ApiResp.ok(data=_jsonify(items, out=["id", "type", "year", "title", "description", "sort"]))


@router.get("/about/company")
def public_about_company(db: Session = Depends(get_db)):
    """联系方式（页脚/联系页共用），缓存 60s。"""
    data = _get_cached("pub:company", lambda: _jsonify(
        db.query(CompanyInfo).order_by(CompanyInfo.id.asc()).all(),
        out=["info_key", "info_value", "remark"],
    ))
    return ApiResp.ok(data=data)


# ---------------- 提交：预约 / 留言（限流） ----------------
class AppointmentSubmit(BaseModel):
    """在线预约提交（验证码已按用户要求移除）。"""
    name: str = Field(..., min_length=2, max_length=20, description="姓名")
    phone: str = Field(..., min_length=5, max_length=20, description="手机号")
    appt_type: str = Field(..., pattern="^(showroom|factory)$", description="showroom/factory")
    appt_date: date | None = Field(None, description="期望日期（不早于今天）")
    appt_slot: str | None = Field(None, pattern="^(morning|afternoon)$", description="时段")
    remark: str | None = Field(None, max_length=200, description="备注")


class MessageSubmit(BaseModel):
    """留言咨询提交（验证码已按用户要求移除）。"""
    name: str = Field(..., min_length=2, max_length=20)
    phone: str = Field(..., min_length=5, max_length=20)
    email: str | None = Field(None, max_length=120)
    type: str = Field(..., pattern="^(product|cooperation|aftersale|other)$", description="咨询类型")
    content: str = Field(..., min_length=10, max_length=500, description="咨询内容（10-500 字）")
    product_id: int | None = Field(None, description="弱关联产品")
    source_page: str | None = Field(None, max_length=255, description="来源页面")


@router.post("/appointments")
def submit_appointment(body: AppointmentSubmit, request: Request, db: Session = Depends(get_db)):
    """提交预约：IP 限流（默认 10 次/分）+ 日期校验。"""
    ip = request.client.host if request.client else ""
    if not redis_cache.rate_limit_try(f"appt:{ip}", limit=10, window=60):
        return ApiResp.fail(code=42900, message="提交过于频繁，请稍后再试")
    if body.appt_date and body.appt_date < date.today():
        return ApiResp.fail(code=40001, message="期望日期不能早于今天")
    a = Appointment(
        name=body.name, phone=body.phone, appt_type=body.appt_type,
        appt_date=body.appt_date, appt_slot=body.appt_slot, remark=body.remark,
        source_page="预约提交", status="pending", ip=ip,
    )
    db.add(a)
    db.commit()
    return ApiResp.ok(message="预约提交成功，我们将尽快与您联系")


@router.post("/messages")
def submit_message(body: MessageSubmit, request: Request, db: Session = Depends(get_db)):
    """提交留言：IP 限流（默认 10 次/分）。"""
    ip = request.client.host if request.client else ""
    if not redis_cache.rate_limit_try(f"msg:{ip}", limit=10, window=60):
        return ApiResp.fail(code=42900, message="提交过于频繁，请稍后再试")
    m = Message(
        name=body.name, phone=body.phone, email=body.email, type=body.type,
        content=body.content, product_id=body.product_id,
        source_page=body.source_page, status="pending", ip=ip,
    )
    db.add(m)
    db.commit()
    return ApiResp.ok(message="留言提交成功，感谢您的反馈")
