# ============================================================
# 文件功能：统计与操作日志中间件
# 说明：
#   - PV 统计：GET 请求按 日期+path 日聚合写入 visit_stat（跳过文档/健康检查/静态）；
#   - 操作日志：写操作（POST/PUT/DELETE/PATCH）写入 operation_log（不存明文手机，S-07）；
#   - 均采用 best-effort：异常不阻塞主流程。
# 权威依据：实施方案 Phase B §5（操作日志 / PV 统计）。
# ============================================================
from datetime import date

from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models.business import OperationLog, VisitStat

# 跳过统计的路径前缀（文档/健康检查/OpenAPI）
_SKIP_PREFIXES = ("/docs", "/redoc", "/openapi.json", "/healthz", "/uploads")


def _incr_pv(path: str) -> None:
    """PV 日聚合：已存在则 +1，否则新建。"""
    db = get_db_session()
    try:
        today = date.today()
        row = db.query(VisitStat).filter_by(stat_date=today, path=path).first()
        if row:
            row.pv += 1
        else:
            db.add(VisitStat(stat_date=today, path=path, pv=1,
                             created_at="system", update_at="system"))
        db.commit()
    finally:
        db.close()


def _log_operation(request: Request, username: str | None) -> None:
    """写操作落 operation_log（best-effort）。"""
    db = get_db_session()
    try:
        db.add(OperationLog(
            module=request.url.path, action=request.method,
            username=username, ip=request.client.host if request.client else None,
            created_at=username or "system", update_at=username or "system",
        ))
        db.commit()
    finally:
        db.close()


class StatsMiddleware(BaseHTTPMiddleware):
    """请求级统计与操作日志中间件。"""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # PV 统计（GET，跳过非业务路径）
        if method == "GET" and not path.startswith(_SKIP_PREFIXES):
            try:
                _incr_pv(path)
            except Exception:
                pass

        # 操作日志（写操作）
        if method in ("POST", "PUT", "DELETE", "PATCH"):
            username = None
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                try:
                    payload = decode_access_token(auth[7:])
                    username = payload.get("sub")
                except Exception:
                    pass
            try:
                _log_operation(request, username)
            except Exception:
                pass

        return await call_next(request)
