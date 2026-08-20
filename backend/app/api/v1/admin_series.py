# ============================================================
# 文件功能：产品系列管理接口
# 接口（需 series:* 权限）：
#   GET    /admin/series        分页列表
#   POST   /admin/series        新增
#   PUT    /admin/series/{id}   编辑（含启用停用、排序）
#   DELETE /admin/series/{id}   软删
# 权威依据：实施方案 Phase C §5（产品系列管理）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.core.redis import redis_cache
from app.models.content import ProductSeries
from app.schemas.content import SeriesCreate, SeriesOut, SeriesUpdate
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/series", tags=["后台-产品系列"])

_PAGE_SIZE_MAX = 50


@router.get("", response_model=ApiResp)
def list_series(
    page: int = 1,
    page_size: int = 20,
    _: CurrentUser = Depends(require_perm("series:list")),
    db: Session = Depends(get_db),
):
    """产品系列分页列表（未删除，按 sort 升序）。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(ProductSeries).filter(ProductSeries.deleted_at.is_(None))
    total = q.count()
    items = (
        q.order_by(ProductSeries.sort.asc(), ProductSeries.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # 统一分页结构；ORM → Out 序列化
    return ApiResp.page(
        [SeriesOut.model_validate(i) for i in items], total, page, page_size
    )


@router.post("", response_model=ApiResp)
def create_series(
    body: SeriesCreate,
    cur: CurrentUser = Depends(require_perm("series:create")),
    db: Session = Depends(get_db),
):
    """新增产品系列。"""
    s = ProductSeries(
        name=body.name, cover_image=body.cover_image, description=body.description,
        sort=body.sort, is_activate=body.is_activate,
        created_at=cur.user.username, update_at=cur.user.username,
    )
    db.add(s)
    db.commit()
    redis_cache.delete("pub:series")  # 缓存失效：前台即时反映
    db.refresh(s)
    return ApiResp.ok(data=SeriesOut.model_validate(s), message="新增成功")


@router.put("/{series_id}", response_model=ApiResp)
def update_series(
    series_id: int,
    body: SeriesUpdate,
    cur: CurrentUser = Depends(require_perm("series:update")),
    db: Session = Depends(get_db),
):
    """编辑产品系列：部分更新，审计字段记录操作人。"""
    s = db.get(ProductSeries, series_id)
    if not s or s.deleted_at is not None:
        return ApiResp.fail(code=40001, message="产品系列不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    s.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:series")  # 缓存失效：前台即时反映
    db.refresh(s)
    return ApiResp.ok(data=SeriesOut.model_validate(s), message="更新成功")


@router.delete("/{series_id}", response_model=ApiResp)
def delete_series(
    series_id: int,
    cur: CurrentUser = Depends(require_perm("series:delete")),
    db: Session = Depends(get_db),
):
    """软删产品系列。"""
    s = db.get(ProductSeries, series_id)
    if not s or s.deleted_at is not None:
        return ApiResp.fail(code=40001, message="产品系列不存在")
    s.deleted_at = datetime.now(timezone.utc)
    s.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:series")  # 缓存失效：前台即时反映
    return ApiResp.ok(message="删除成功")
