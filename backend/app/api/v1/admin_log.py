# ============================================================
# 文件功能：操作日志查询接口（Phase D）
# 接口（需 log:view 权限）：
#   GET /admin/logs   只读分页列表（按操作人/模块/时间范围筛选）
# 说明：
#   - 只增不改，保留 180 天（清理任务由部署阶段 cron 落实，方案 D-05 先单表）；
#   - 日志不存明文手机号（S-07）。
# 权威依据：实施方案 Phase D（操作日志）+ 数据库设计 §4.3。
# ============================================================
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.business import OperationLog
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/logs", tags=["后台-操作日志"])

_PAGE_SIZE_MAX = 50


@router.get("", response_model=ApiResp)
def list_logs(
    page: int = 1,
    page_size: int = 20,
    username: str | None = None,
    module: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    _: CurrentUser = Depends(require_perm("log:view")),
    db: Session = Depends(get_db),
):
    """操作日志分页（只读）：支持操作人 / 模块 / 时间范围筛选。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(OperationLog).filter(OperationLog.deleted_at.is_(None))
    if username:
        q = q.filter(OperationLog.username == username)
    if module:
        q = q.filter(OperationLog.module == module)
    if start_at:
        q = q.filter(OperationLog.created_date >= start_at)
    if end_at:
        q = q.filter(OperationLog.created_date <= end_at)
    total = q.count()
    items = q.order_by(OperationLog.created_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    out = [{
        "id": it.id, "username": it.username, "module": it.module, "action": it.action,
        "detail": it.detail, "ip": it.ip,
        "created_date": it.created_date.strftime("%Y-%m-%d %H:%M:%S") if it.created_date else None,
    } for it in items]
    return ApiResp.page(out, total, page, page_size)
