# ============================================================
# 文件功能：关于管理接口（about_info / about_timeline / company_info）
# 接口（需 about:* 权限）：
#   GET    /admin/about/pages               关于子页列表（公司简介=关于我们 D1 等）
#   PUT    /admin/about/pages/{page_key}    更新子页内容（结构化 JSON）
#   GET    /admin/about/timeline            时间轴条目（?type=history|brand_history）
#   POST   /admin/about/timeline            新增时间轴条目
#   PUT    /admin/about/timeline/{id}       编辑时间轴条目
#   DELETE /admin/about/timeline/{id}       软删时间轴条目
#   GET    /admin/about/company             联系方式/公共信息列表
#   POST   /admin/about/company             新增公共信息键值
#   PUT    /admin/about/company/{id}        编辑公共信息（值/备注）
# 权威依据：实施方案 Phase C §5（关于管理 8 tab，D1 关于我们）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.core.redis import redis_cache
from app.models.content import AboutInfo, AboutTimeline, CompanyInfo
from app.schemas.content import (
    AboutInfoOut, AboutInfoUpdate, CompanyInfoCreate, CompanyInfoOut,
    CompanyInfoUpdate, TimelineCreate, TimelineOut, TimelineUpdate,
)
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/about", tags=["后台-关于"])


# ---------- 关于子页（about_info：键值表，不做软删） ----------
@router.get("/pages", response_model=ApiResp)
def list_pages(
    _: CurrentUser = Depends(require_perm("about:list")),
    db: Session = Depends(get_db),
):
    """关于子页列表：page_key（company_intro 即"关于我们"）+ 结构化内容。"""
    items = db.query(AboutInfo).order_by(AboutInfo.id.asc()).all()
    return ApiResp.ok(data=[AboutInfoOut.model_validate(i) for i in items])


@router.put("/pages/{page_key}", response_model=ApiResp)
def update_page(
    page_key: str,
    body: AboutInfoUpdate,
    cur: CurrentUser = Depends(require_perm("about:update")),
    db: Session = Depends(get_db),
):
    """更新关于子页内容（upsert：不存在则创建，支持新增 tab 如资质荣誉）。"""
    info = db.query(AboutInfo).filter(AboutInfo.page_key == page_key).first()
    if not info:
        info = AboutInfo(page_key=page_key, content=body.content,
                         created_at=cur.user.username, update_at=cur.user.username)
        db.add(info)
    else:
        info.content = body.content
        info.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:about_pages")  # 缓存失效：前台即时反映
    db.refresh(info)
    return ApiResp.ok(data=AboutInfoOut.model_validate(info), message="更新成功")


# ---------- 时间轴（about_timeline：发展历程 / 品牌历程，软删） ----------
@router.get("/timeline", response_model=ApiResp)
def list_timeline(
    type: str | None = None,
    _: CurrentUser = Depends(require_perm("about:list")),
    db: Session = Depends(get_db),
):
    """时间轴条目列表：可按类型（history/brand_history）筛选，按 sort 升序。"""
    q = db.query(AboutTimeline).filter(AboutTimeline.deleted_at.is_(None))
    if type:
        q = q.filter(AboutTimeline.type == type)
    items = q.order_by(AboutTimeline.sort.asc(), AboutTimeline.id.asc()).all()
    return ApiResp.ok(data=[TimelineOut.model_validate(i) for i in items])


@router.post("/timeline", response_model=ApiResp)
def create_timeline(
    body: TimelineCreate,
    cur: CurrentUser = Depends(require_perm("about:create")),
    db: Session = Depends(get_db),
):
    """新增时间轴条目。"""
    t = AboutTimeline(**body.model_dump(), created_at=cur.user.username,
                      update_at=cur.user.username)
    db.add(t)
    db.commit()
    db.refresh(t)
    return ApiResp.ok(data=TimelineOut.model_validate(t), message="新增成功")


@router.put("/timeline/{item_id}", response_model=ApiResp)
def update_timeline(
    item_id: int,
    body: TimelineUpdate,
    cur: CurrentUser = Depends(require_perm("about:update")),
    db: Session = Depends(get_db),
):
    """编辑时间轴条目：部分更新。"""
    t = db.get(AboutTimeline, item_id)
    if not t or t.deleted_at is not None:
        return ApiResp.fail(code=40001, message="条目不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    t.update_at = cur.user.username
    db.commit()
    db.refresh(t)
    return ApiResp.ok(data=TimelineOut.model_validate(t), message="更新成功")


@router.delete("/timeline/{item_id}", response_model=ApiResp)
def delete_timeline(
    item_id: int,
    cur: CurrentUser = Depends(require_perm("about:delete")),
    db: Session = Depends(get_db),
):
    """软删时间轴条目。"""
    t = db.get(AboutTimeline, item_id)
    if not t or t.deleted_at is not None:
        return ApiResp.fail(code=40001, message="条目不存在")
    t.deleted_at = datetime.now(timezone.utc)
    t.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")


# ---------- 公共信息（company_info：键值表，不做软删） ----------
@router.get("/company", response_model=ApiResp)
def list_company(
    _: CurrentUser = Depends(require_perm("about:list")),
    db: Session = Depends(get_db),
):
    """联系方式/公共信息列表（全站页脚与联系页共用）。"""
    items = db.query(CompanyInfo).order_by(CompanyInfo.id.asc()).all()
    return ApiResp.ok(data=[CompanyInfoOut.model_validate(i) for i in items])


@router.post("/company", response_model=ApiResp)
def create_company(
    body: CompanyInfoCreate,
    cur: CurrentUser = Depends(require_perm("about:create")),
    db: Session = Depends(get_db),
):
    """新增公共信息键值（键唯一）。"""
    if db.query(CompanyInfo).filter(CompanyInfo.info_key == body.info_key).first():
        return ApiResp.fail(code=40001, message="该键已存在")
    c = CompanyInfo(**body.model_dump(), created_at=cur.user.username,
                    update_at=cur.user.username)
    db.add(c)
    db.commit()
    db.refresh(c)
    return ApiResp.ok(data=CompanyInfoOut.model_validate(c), message="新增成功")


@router.put("/company/{info_id}", response_model=ApiResp)
def update_company(
    info_id: int,
    body: CompanyInfoUpdate,
    cur: CurrentUser = Depends(require_perm("about:update")),
    db: Session = Depends(get_db),
):
    """编辑公共信息：仅值/备注可改（键固定）。"""
    c = db.get(CompanyInfo, info_id)
    if not c:
        return ApiResp.fail(code=40001, message="信息项不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    c.update_at = cur.user.username
    db.commit()
    db.refresh(c)
    return ApiResp.ok(data=CompanyInfoOut.model_validate(c), message="更新成功")
