# ============================================================
# 文件功能：认证模块路由 /auth
# 接口：
#   POST /login            登录（bcrypt 校验 + 失败5次锁15分）
#   POST /logout           登出（令牌加入黑名单）
#   GET  /me               当前用户信息（需鉴权）
#   POST /refresh          续期（旧令牌失效，签发新令牌）
#   POST /reset-password   强制改密（L-04）
# 权威依据：实施方案 Phase B §5（认证模块）。
# 注：原 /auth/captcha 图形验证码功能已按用户要求移除（2026-08-19）。
# ============================================================
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUser, _load_perms, get_current_user, get_db
from app.core.redis import redis_cache
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.auth import SysUser
from app.schemas.auth import LoginRequest, RefreshOut, ResetPasswordRequest, TokenOut, UserInfoOut
from app.schemas.response import ApiResp

router = APIRouter(prefix="/auth", tags=["认证"])

_bearer = HTTPBearer(auto_error=False)


def _build_user_info(user: SysUser, db: Session) -> UserInfoOut:
    """构造 UserInfoOut（含角色与权限码）。"""
    perms, role_code, role_name = _load_perms(db, user)
    return UserInfoOut(
        id=user.id, username=user.username, cn_name=user.cn_name,
        role_code=role_code, role_name=role_name, perms=perms,
        force_pwd=bool(user.force_pwd),
    )


@router.post("/login", response_model=ApiResp[TokenOut])
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """登录：锁定 → 密码校验（验证码已移除）。"""
    # 1) 账号锁定检查
    if redis_cache.login_locked(body.username):
        return ApiResp.fail(code=42900, message="账号已锁定，请 15 分钟后再试")
    # 2) 用户与密码校验
    user = db.query(SysUser).filter(SysUser.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        cnt = redis_cache.login_fail_incr(body.username, ttl=900)
        if cnt >= 5:
            return ApiResp.fail(code=42900, message="密码错误次数过多，账号已锁定 15 分钟")
        return ApiResp.fail(code=40001, message="用户名或密码错误")
    # 3) 成功：清除失败计数，签发令牌
    redis_cache.login_fail_reset(body.username)
    token = create_access_token(user.username)
    info = _build_user_info(user, db)
    return ApiResp.ok(
        data=TokenOut(
            access_token=token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            force_pwd=bool(user.force_pwd),
            user=info,
        )
    )


@router.post("/logout", response_model=ApiResp)
def logout(
    cur: CurrentUser = Depends(get_current_user),
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    """登出：当前令牌加入黑名单（精确失效）。"""
    if creds and creds.credentials:
        try:
            old = decode_access_token(creds.credentials)
            jti = old.get("jti")
            if jti:
                redis_cache.blacklist_add(jti)
        except Exception:
            pass
    return ApiResp.ok(message="已登出")


@router.get("/me", response_model=ApiResp[UserInfoOut])
def me(cur: CurrentUser = Depends(get_current_user)):
    """当前登录用户信息。"""
    return ApiResp.ok(data=UserInfoOut(
        id=cur.user.id, username=cur.user.username, cn_name=cur.user.cn_name,
        role_code=cur.role_code, role_name=cur.role_name, perms=cur.perms,
        force_pwd=bool(cur.user.force_pwd),
    ))


@router.post("/refresh", response_model=ApiResp[RefreshOut])
def refresh(
    cur: CurrentUser = Depends(get_current_user),
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
):
    """续期：旧令牌失效，签发新令牌。"""
    if creds and creds.credentials:
        try:
            old = decode_access_token(creds.credentials)
            jti = old.get("jti")
            if jti:
                redis_cache.blacklist_add(jti)
        except Exception:
            pass
    token = create_access_token(cur.user.username)
    return ApiResp.ok(data=RefreshOut(
        access_token=token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    ))


@router.post("/reset-password", response_model=ApiResp)
def reset_password(
    body: ResetPasswordRequest,
    cur: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """强制改密（L-04）：校验旧密码后设置新密码并清除强制改密标记。"""
    if not verify_password(body.old_password, cur.user.password_hash):
        return ApiResp.fail(code=40001, message="原密码错误")
    cur.user.password_hash = hash_password(body.new_password)
    cur.user.force_pwd = 0
    cur.user.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="密码已更新")