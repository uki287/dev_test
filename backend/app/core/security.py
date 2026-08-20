# ============================================================
# 文件功能：安全工具集（密码哈希 + JWT 令牌）
# 说明：
#   - hash_password / verify_password：基于 bcrypt 的密码加解密；
#   - create_access_token / decode_access_token：JWT 签发与解析。
# 供认证模块（Phase B 的 /auth）与依赖注入层复用。
# 权威依据：方案 §4.1 认证（JWT + bcrypt）、§6 安全合规。
# ============================================================
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bleach
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# 富文本白名单（S-03）：仅放行安全标签与属性，杜绝 XSS
_ALLOWED_TAGS = {"p", "br", "img", "a", "strong", "em", "ul", "ol", "li", "span", "div", "h3", "h4"}
_ALLOWED_ATTRS = {"img": ["src", "alt", "width", "height"], "a": ["href", "target", "rel"]}

# bcrypt 密码哈希上下文：自动处理加盐与校验，deprecated 标记弃用算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------- 密码处理 ----------------
def hash_password(plain: str) -> str:
    """对明文密码进行 bcrypt 哈希，返回可安全存储的密文。"""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """校验明文密码与数据库中密文是否匹配，返回布尔值。"""
    return pwd_context.verify(plain, hashed)


# ---------------- JWT 处理 ----------------
def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """
    生成 JWT 访问令牌。
    :param subject: 令牌主体，通常为用户 ID 或用户名
    :param expires_minutes: 有效期（分钟），缺省取配置值（8 小时）
    """
    # 计算过期时间（使用 UTC，避免时区歧义）
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    # payload：主体 + 过期时间 + 令牌类型 + 唯一 jti（用于登出黑名单精确失效）
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "access",
        "jti": uuid4().hex,
    }
    # 使用配置的密钥与算法签发令牌
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    解析并校验 JWT，返回 payload 字典。
    :raises jwt.PyJWTError: 令牌无效或过期时由调用方捕获
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# ---------------- 富文本 XSS 清洗（S-03） ----------------
def clean_html(value: str | None) -> str | None:
    """
    对富文本做白名单清洗，入库前调用，防止存储型 XSS。
    - 仅保留 _ALLOWED_TAGS 内的标签；img 仅保留安全属性，a 强制 rel=noopener；
    - 移除 on* 事件属性、javascript: 协议、<script> 等危险内容；
    - 空值原样返回，避免误改 None。
    """
    if not value:
        return value
    cleaned = bleach.clean(
        value,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
    return cleaned
