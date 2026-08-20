# ============================================================
# 文件功能：轮播图管理接口（★ 后台内容管理重中之重）
# 接口（全部需鉴权 + banner:* 权限）：
#   GET    /admin/banners        分页列表（未删除，按 sort 升序）
#   POST   /admin/banners        新增
#   PUT    /admin/banners/{id}   编辑（停用前校验剩余启用数 ≥ 1）
#   DELETE /admin/banners/{id}   软删（删除启用态前校验剩余启用数 ≥ 1）
# 核心业务规则（PRD §6.4.1 / Dev §6.6）：删除或停用前校验"剩余启用数 ≥ 1"，
#   即任何操作不得导致启用轮播图数量降为 0，保证前台首页始终有可展示轮播。
# 权威依据：实施方案 Phase C §5（轮播图管理）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from pydantic import Field, field_validator

from app.core.deps import CurrentUser, get_db, require_perm
from app.core.redis import redis_cache
from app.models.content import Banner
from app.schemas.content import BannerCreate, BannerOut, BannerUpdate
from app.schemas.response import ApiResp


def _empty_str_to_none(v):
    """空字符串/纯空白视为 None（用于 datetime 等字段，防御前端边界）。"""
    if v is None:
        return None
    if isinstance(v, str) and not v.strip():
        return None
    return v

router = APIRouter(prefix="/admin/banners", tags=["后台-轮播图"])

_PAGE_SIZE_MAX = 50  # 单页上限（方案 §6 接口约定）


def _active_count(db: Session) -> int:
    """当前启用中的轮播图数量（未删除 + is_activate=1）。"""
    return (
        db.query(Banner)
        .filter(Banner.deleted_at.is_(None), Banner.is_activate == 1)
        .count()
    )


def _ensure_active_left(db: Session, exclude_id: int | None = None) -> None:
    """
    校验"剩余启用数 ≥ 1"：
    若当前启用数 ≤ 1（且目标记录本身是启用态），删除/停用将导致启用数为 0，直接拒绝。
    exclude_id 用于编辑场景：目标记录不在"即将被移除"的计数里（它本身就是要停用的那一个）。
    """
    active = _active_count(db)
    if active <= 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="至少需保留 1 张启用中的轮播图，请先启用其他轮播图",
        )


@router.get("", response_model=ApiResp)
def list_banners(
    page: int = 1,
    page_size: int = 20,
    _: CurrentUser = Depends(require_perm("banner:list")),
    db: Session = Depends(get_db),
):
    """轮播图分页列表：按 sort 升序、id 降序（后创建的优先）。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(Banner).filter(Banner.deleted_at.is_(None))
    total = q.count()
    items = (
        q.order_by(Banner.sort.asc(), Banner.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # 统一分页结构 {items, total, page, page_size}；ORM → Out 序列化
    return ApiResp.page(
        [BannerOut.model_validate(i) for i in items], total, page, page_size
    )


@router.post("", response_model=ApiResp)
def create_banner(
    body: BannerCreate,
    cur: CurrentUser = Depends(require_perm("banner:create")),
    db: Session = Depends(get_db),
):
    """新增轮播图：审计字段记录操作人。"""
    b = Banner(
        title=body.title, image=body.image, link_url=body.link_url,
        start_at=body.start_at, end_at=body.end_at, sort=body.sort,
        is_activate=body.is_activate, created_at=cur.user.username,
        update_at=cur.user.username,
    )
    db.add(b)
    db.commit()
    redis_cache.delete("pub:banners")  # 缓存失效：前台即时反映
    db.refresh(b)
    return ApiResp.ok(data=BannerOut.model_validate(b), message="新增成功")


@router.put("/{banner_id}", response_model=ApiResp)
def update_banner(
    banner_id: int,
    body: BannerUpdate,
    cur: CurrentUser = Depends(require_perm("banner:update")),
    db: Session = Depends(get_db),
):
    """编辑轮播图：停用操作前执行启用数校验（★）。"""
    b = db.get(Banner, banner_id)
    if not b or b.deleted_at is not None:
        return ApiResp.fail(code=40001, message="轮播图不存在")
    # 停用校验：当前启用且本次要停用 → 不允许把启用数降到 0
    if body.is_activate == 0 and b.is_activate == 1:
        _ensure_active_left(db)
    # 时间校验：end_at 不得早于 start_at（与表级 CHECK 一致，接口层友好提示）
    start = body.start_at if body.start_at is not None else b.start_at
    end = body.end_at if body.end_at is not None else b.end_at
    if start and end and end < start:
        return ApiResp.fail(code=40001, message="结束时间不能早于开始时间")
    # 部分更新：仅应用传入的非 None 字段
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(b, field, value)
    b.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:banners")  # 缓存失效：前台即时反映
    db.refresh(b)
    return ApiResp.ok(data=BannerOut.model_validate(b), message="更新成功")


@router.delete("/{banner_id}", response_model=ApiResp)
def delete_banner(
    banner_id: int,
    cur: CurrentUser = Depends(require_perm("banner:delete")),
    db: Session = Depends(get_db),
):
    """软删轮播图：若目标处于启用态，先校验剩余启用数 ≥ 1（★）。"""
    b = db.get(Banner, banner_id)
    if not b or b.deleted_at is not None:
        return ApiResp.fail(code=40001, message="轮播图不存在")
    # 删除启用中的轮播 → 同样触发启用数校验
    if b.is_activate == 1:
        _ensure_active_left(db)
    b.deleted_at = datetime.now(timezone.utc)  # 软删标记
    b.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:banners")  # 缓存失效：前台即时反映
    return ApiResp.ok(message="删除成功")
