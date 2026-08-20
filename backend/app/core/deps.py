# ============================================================
# 文件功能：依赖注入（数据库会话 + 当前登录用户 + RBAC 权限校验）
# 说明：
#   - get_db：请求级数据库会话；
#   - get_current_user：解析 Bearer 令牌 → 校验黑名单 → 查询用户并加载角色权限；
#   - require_perm(code)：接口级权限闸门，支持 xxx:* 通配（L-05）。
# 这是 FastAPI 依赖注入层（方案 §6：Router → Service → Model → DB）。
# 权威依据：实施方案 Phase B §5（JWT / RBAC）。
# ============================================================
from dataclasses import dataclass
from typing import Generator, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.redis import redis_cache
from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models.auth import SysRole, SysRolePermission, SysUser


@dataclass
class CurrentUser:
    """当前登录用户上下文：ORM 对象 + 角色信息 + 权限码集合。"""
    user: SysUser
    perms: List[str]
    role_code: str | None = None
    role_name: str | None = None


def _load_perms(db: Session, user: SysUser) -> tuple[List[str], str | None, str | None]:
    """根据用户单一角色加载权限码集合（含角色名）。"""
    if not user.role_id:
        return [], None, None
    role = db.get(SysRole, user.role_id)
    if not role:
        return [], None, None
    rows = (
        db.query(SysRolePermission.permission_id)
        .filter(SysRolePermission.role_id == role.id)
        .all()
    )
    perm_ids = [r[0] for r in rows]
    # 直接从关联表取出 code 更高效，但此处经 permission 表查询权限码
    from app.models.auth import SysPermission
    codes = [p.code for p in db.query(SysPermission).filter(SysPermission.id.in_(perm_ids)).all()]
    return codes, role.code, role.name


# Bearer 令牌提取器：自动从请求头 Authorization 读取（缺省不报错）
bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """依赖：提供请求级数据库会话，请求结束自动关闭，避免连接泄漏。"""
    db = get_db_session()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    依赖：校验 Bearer 令牌并返回当前用户（含角色权限）。
    未携带 / 无效 / 已拉黑 / 用户禁用 均返回 401。
    """
    # 情况1：请求未携带令牌
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(creds.credentials)
    except Exception:
        # 情况2：令牌无效或已过期
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌无效或已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 情况3：令牌已在登出黑名单（精确失效）
    jti = payload.get("jti")
    if jti and redis_cache.blacklist_exists(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌已失效，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 情况4：解析主体（用户名）并查询用户
    username = payload.get("sub")
    user = db.query(SysUser).filter(SysUser.username == username).first()
    if not user or not user.is_activate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已停用",
            headers={"WWW-Authenticate": "Bearer"},
        )
    perms, role_code, role_name = _load_perms(db, user)
    return CurrentUser(user=user, perms=perms, role_code=role_code, role_name=role_name)


def _match_perm(perms: List[str], code: str) -> bool:
    """权限匹配：精确匹配，通配码 xxx:* 覆盖 xxx:任意子权限，*:* 覆盖全部。"""
    for p in perms:
        if p == code:
            return True
        if p == "*:*":  # 超管万能通配（未来新增权限码也自动放行）
            return True
        if p.endswith(":*") and code.startswith(p[:-1]):  # 去掉 '*'
            return True
    return False


def require_perm(code: str):
    """
    依赖工厂：接口级权限闸门。
    :param code: 所需权限码（如 'banner:update' / 'appointment:handle'）
    无权限返回 403（方案错误码 40300）。
    """

    def _checker(cur: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not _match_perm(cur.perms, code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要 {code}",
            )
        return cur

    return _checker
