# ============================================================
# 文件功能：新闻管理接口
# 接口（需 news:* 权限）：
#   GET    /admin/news        分页列表（可选 category / pub_status 过滤）
#   POST   /admin/news        新增
#   PUT    /admin/news/{id}   编辑（draft/published/offline 状态、置顶、封面、截止时间）
#   DELETE /admin/news/{id}   软删
# 权威依据：实施方案 Phase C §5（新闻管理）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.content import News
from app.schemas.content import NewsCreate, NewsOut, NewsUpdate
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/news", tags=["后台-新闻"])

_PAGE_SIZE_MAX = 50


@router.get("", response_model=ApiResp)
def list_news(
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    pub_status: str | None = None,
    _: CurrentUser = Depends(require_perm("news:list")),
    db: Session = Depends(get_db),
):
    """新闻分页列表：支持栏目与发布状态筛选。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(News).filter(News.deleted_at.is_(None))
    if category:
        q = q.filter(News.category == category)
    if pub_status:
        q = q.filter(News.pub_status == pub_status)
    total = q.count()
    items = (
        q.order_by(News.is_top.desc(), News.sort.asc(), News.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # 统一分页结构；ORM → Out 序列化
    return ApiResp.page(
        [NewsOut.model_validate(i) for i in items], total, page, page_size
    )


@router.post("", response_model=ApiResp)
def create_news(
    body: NewsCreate,
    cur: CurrentUser = Depends(require_perm("news:create")),
    db: Session = Depends(get_db),
):
    """新增新闻。"""
    n = News(**body.model_dump(), created_at=cur.user.username,
             update_at=cur.user.username)
    db.add(n)
    db.commit()
    db.refresh(n)
    return ApiResp.ok(data=NewsOut.model_validate(n), message="新增成功")


@router.put("/{news_id}", response_model=ApiResp)
def update_news(
    news_id: int,
    body: NewsUpdate,
    cur: CurrentUser = Depends(require_perm("news:update")),
    db: Session = Depends(get_db),
):
    """编辑新闻：部分更新。"""
    n = db.get(News, news_id)
    if not n or n.deleted_at is not None:
        return ApiResp.fail(code=40001, message="新闻不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(n, field, value)
    n.update_at = cur.user.username
    db.commit()
    db.refresh(n)
    return ApiResp.ok(data=NewsOut.model_validate(n), message="更新成功")


@router.delete("/{news_id}", response_model=ApiResp)
def delete_news(
    news_id: int,
    cur: CurrentUser = Depends(require_perm("news:delete")),
    db: Session = Depends(get_db),
):
    """软删新闻。"""
    n = db.get(News, news_id)
    if not n or n.deleted_at is not None:
        return ApiResp.fail(code=40001, message="新闻不存在")
    n.deleted_at = datetime.now(timezone.utc)
    n.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")
