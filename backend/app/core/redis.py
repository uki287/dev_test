# ============================================================
# 文件功能：Redis 接入（缓存 / 限流 / 验证码 / 令牌黑名单）
# 说明：
#   - 一期启用（方案决策 D2）：内容接口缓存 60s + 登录/预约/留言限流 + 验证码 + 登出黑名单；
#   - Redis 不可用时（开发机未起 Redis）自动降级为进程内字典，保证应用可启动、可验证；
#     生产环境 Redis 就绪后自动切换，无需改业务代码；
#   - 所有 TTL 单位为秒。
# 权威依据：实施方案 Phase B §5（Redis 接入）。
# ============================================================
import time
import uuid
from typing import Optional

import redis

from app.core.config import settings


class RedisCache:
    """Redis 封装：优先使用 Redis，不可用时降级为进程内字典（开发友好）。"""

    def __init__(self) -> None:
        self.available = False
        self._fb: dict[str, tuple[object, Optional[float]]] = {}  # key -> (value, expire_at)
        try:
            # 连接超时 1s，避免 Redis 不可用时阻塞启动
            self.client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
            self.client.ping()
            self.available = True
        except Exception:
            # 降级：仅用进程内字典，功能可用但不跨进程
            self.client = None

    # ---------------- 底层读写 ----------------
    def get(self, key: str) -> Optional[str]:
        if self.available:
            v = self.client.get(key)  # type: ignore[union-attr]
            return v.decode() if v is not None else None
        item = self._fb.get(key)
        if item:
            val, exp = item
            if exp is None or exp > time.time():
                return str(val)
            self._fb.pop(key, None)
        return None

    def set(self, key: str, val: str, ttl: int = 60) -> None:
        if self.available:
            self.client.set(key, val, ex=ttl)  # type: ignore[union-attr]
        else:
            self._fb[key] = (val, time.time() + ttl if ttl else None)

    def delete(self, key: str) -> None:
        if self.available:
            self.client.delete(key)  # type: ignore[union-attr]
        else:
            self._fb.pop(key, None)

    def exists(self, key: str) -> bool:
        if self.available:
            return self.client.exists(key) > 0  # type: ignore[union-attr]
        item = self._fb.get(key)
        if item:
            _, exp = item
            return exp is None or exp > time.time()
        return False

    def incr(self, key: str, ttl: int = 60) -> int:
        """自增计数（首次设置 TTL），返回当前值。用于限流/失败计数。"""
        if self.available:
            n = self.client.incr(key)  # type: ignore[union-attr]
            if n == 1:
                self.client.expire(key, ttl)  # type: ignore[union-attr]
            return int(n)
        item = self._fb.get(key)
        n = (int(item[0]) if item else 0) + 1
        self._fb[key] = (str(n), time.time() + ttl if ttl else None)
        return n

    # ---------------- 登录失败锁定（5 次锁 15 分钟） ----------------
    def login_fail_incr(self, username: str, ttl: int = 900) -> int:
        fk = f"fail:{username}"
        cnt = self.incr(fk, ttl)
        if cnt >= 5:
            self.set(f"lock:{username}", "1", ttl)  # 锁定 15 分钟
        return cnt

    def login_locked(self, username: str) -> bool:
        return self.exists(f"lock:{username}")

    def login_fail_reset(self, username: str) -> None:
        self.delete(f"fail:{username}")
        self.delete(f"lock:{username}")

    # ---------------- 通用限流（固定窗口） ----------------
    def rate_limit_try(self, key: str, limit: int = 10, window: int = 60) -> bool:
        """返回 True 表示允许；False 表示触发限流。默认 10 次/分钟。"""
        n = self.incr(f"rl:{key}", window)
        return n <= limit

    # ---------------- JWT 登出黑名单 ----------------
    def blacklist_add(self, jti: str, ttl: int = 60 * 60 * 8) -> None:
        self.set(f"bl:{jti}", "1", ttl)

    def blacklist_exists(self, jti: str) -> bool:
        return self.exists(f"bl:{jti}")


# 模块级单例：全应用共用一个连接/降级状态
redis_cache = RedisCache()
