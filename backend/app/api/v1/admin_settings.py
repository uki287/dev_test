# ============================================================
# 文件功能：系统设置接口（system_settings 单行配置）
# 接口（需 setting:* 权限）：
#   GET /admin/settings      读取站点配置（站名/Logo/ICP/版权/轮播间隔）
#   PUT /admin/settings      更新配置（slider_interval 最小 3 秒）
# 说明：单行记录；无数据时返回默认值，更新时不存在则自动创建首行。
# 权威依据：实施方案 Phase C §5（系统设置）+ 数据库设计 §4.2。
# ============================================================
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.core.redis import redis_cache
from app.models.content import SystemSettings
from app.schemas.content import SettingsOut, SettingsUpdate
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/settings", tags=["后台-系统设置"])


def _get_or_create(db: Session) -> SystemSettings:
    """获取单行设置，不存在则创建默认行（避免空表读不到）。"""
    row = db.query(SystemSettings).order_by(SystemSettings.id.asc()).first()
    if row is None:
        row = SystemSettings(slider_interval=4)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("", response_model=ApiResp)
def get_settings(
    _: CurrentUser = Depends(require_perm("setting:list")),
    db: Session = Depends(get_db),
):
    """读取系统设置。"""
    row = _get_or_create(db)
    return ApiResp.ok(data=SettingsOut.model_validate(row))


@router.put("", response_model=ApiResp)
def update_settings(
    body: SettingsUpdate,
    cur: CurrentUser = Depends(require_perm("setting:update")),
    db: Session = Depends(get_db),
):
    """更新系统设置：部分更新（轮播间隔受 3-60 秒约束）。"""
    row = _get_or_create(db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.update_at = cur.user.username
    db.commit()
    redis_cache.delete("pub:settings")  # 缓存失效：前台即时反映
    db.refresh(row)
    return ApiResp.ok(data=SettingsOut.model_validate(row), message="更新成功")
