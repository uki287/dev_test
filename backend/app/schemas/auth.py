# ============================================================
# 文件功能：认证模块请求/响应 Schema（Pydantic v2）
# 说明：登录 / 刷新 / 重置密码 / 当前用户信息的出入参定义（验证码字段已移除）。
# 权威依据：实施方案 Phase B §5（认证模块 /auth）。
# ============================================================
from typing import List

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """登录请求：用户名 + 密码（验证码功能已移除）。"""
    username: str = Field(..., min_length=1, description="登录名")
    password: str = Field(..., min_length=1, description="密码")


class UserInfoOut(BaseModel):
    """当前用户基础信息（含角色与权限码集合）。"""
    id: int
    username: str
    cn_name: str | None = None
    role_code: str | None = None
    role_name: str | None = None
    perms: List[str] = []
    force_pwd: bool = False


class TokenOut(BaseModel):
    """登录成功返回：JWT + 用户信息与强制改密标记。"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="有效期（秒）")
    force_pwd: bool = False
    user: UserInfoOut


class RefreshOut(BaseModel):
    """刷新令牌返回。"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ResetPasswordRequest(BaseModel):
    """重置（强制改密）请求：校验旧密码后设置新密码。"""
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, description="新密码（≥6 位）")
