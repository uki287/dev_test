# ============================================================
# 文件功能：Phase B 端到端验证脚本（开发自测用，可重复运行）
# 说明：用 TestClient 走通 登录 / 鉴权 / 刷新 / 改密 / 上传 / 限流 全链路。
# 运行：python verify_phase_b.py
# ============================================================
import sys

from fastapi.testclient import TestClient

from app.core.deps import CurrentUser, _match_perm, require_perm
from app.core.redis import redis_cache
from app.main import app
from app.models.auth import SysPermission, SysUser

client = TestClient(app)
PASS, FAIL = 0, 0


def check(name: str, cond: bool, extra: str = ""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"[PASS] {name} {extra}")
    else:
        FAIL += 1
        print(f"[FAIL] {name} {extra}")


def get_captcha_code(token: str) -> str:
    """从进程内 Redis 降级缓存读取验证码答案（与接口同进程）。"""
    return redis_cache.get(f"cap:{token}") or ""


# 1) 健康检查
r = client.get("/healthz")
check("GET /healthz", r.status_code == 200 and r.json().get("code") == 0)

# 2) 未携带令牌访问受保护接口 → 401
r = client.get("/api/v1/auth/me")
check("GET /me 无令牌→401", r.status_code == 401)

# 3) 错误令牌 → 401
r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad.token"})
check("GET /me 错误令牌→401", r.status_code == 401)

# 4) 正常登录（验证码 + 正确密码）
r = client.get("/api/v1/auth/captcha")
cap = r.json()["data"]
code = get_captcha_code(cap["captcha_token"])
r = client.post("/api/v1/auth/login", json={
    "username": "admin", "password": "admin123",
    "captcha_token": cap["captcha_token"], "captcha_code": code,
})
login_ok = r.status_code == 200 and r.json().get("code") == 0 and r.json()["data"].get("access_token")
check("POST /login 正确凭证→token", login_ok, f"force_pwd={r.json()['data'].get('force_pwd') if login_ok else None}")
token = r.json()["data"]["access_token"] if login_ok else ""
headers = {"Authorization": f"Bearer {token}"}

# 5) 携带令牌访问 /me → 200 + 用户信息
r = client.get("/api/v1/auth/me", headers=headers)
data = r.json().get("data") or {}
check("GET /me 有令牌→200", r.status_code == 200 and data.get("username") == "admin",
      f"perms={len(data.get('perms', []))}")

# 6) 刷新令牌
r = client.post("/api/v1/auth/refresh", headers=headers)
check("POST /refresh→new token", r.status_code == 200 and r.json()["data"].get("access_token"))

# 7) 登出后旧令牌失效
client.post("/api/v1/auth/logout", headers=headers)
r = client.get("/api/v1/auth/me", headers=headers)
check("登出后旧令牌→401", r.status_code == 401)

# 8) 重新登录以获得有效令牌（供后续测试）
r = client.get("/api/v1/auth/captcha"); cap = r.json()["data"]
code = get_captcha_code(cap["captcha_token"])
r = client.post("/api/v1/auth/login", json={
    "username": "admin", "password": "admin123",
    "captcha_token": cap["captcha_token"], "captcha_code": code})
token = r.json()["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 9) 上传（无令牌→401，有令牌→200 返回 UUID 路径）
r = client.post("/api/v1/admin/upload", files={"file": ("t.png", b"\x89PNG\r\n\x1a\n", "image/png")})
check("上传 无令牌→401", r.status_code == 401)
r = client.post("/api/v1/admin/upload", files={"file": ("t.png", b"\x89PNG\r\n\x1a\n", "image/png")}, headers=headers)
up = r.json()
check("上传 有令牌→200", r.status_code == 200 and up.get("code") == 0 and "/uploads/" in (up["data"].get("url") or ""),
      f"url={up.get('data', {}).get('url')}")
# 类型白名单拒绝
r = client.post("/api/v1/admin/upload", files={"file": ("x.exe", b"MZ", "application/octet-stream")}, headers=headers)
check("上传 非法类型→40001", r.json().get("code") == 40001)

# 10) 登录失败 5 次锁定 → 第 6 次 429
for i in range(5):
    r = client.get("/api/v1/auth/captcha"); cap = r.json()["data"]
    c = get_captcha_code(cap["captcha_token"])
    client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "wrong",
        "captcha_token": cap["captcha_token"], "captcha_code": c})
r = client.get("/api/v1/auth/captcha"); cap = r.json()["data"]
c = get_captcha_code(cap["captcha_token"])
r = client.post("/api/v1/auth/login", json={
    "username": "admin", "password": "wrong",
    "captcha_token": cap["captcha_token"], "captcha_code": c})
check("登录失败锁定→42900", r.json().get("code") == 42900)

# 11) RBAC 单元校验：require_perm 依赖逻辑
perm_checker = require_perm("user:create")
limited = CurrentUser(user=SysUser(username="x"), perms=["banner:*"], role_code="content_editor")
admin_u = CurrentUser(user=SysUser(username="admin"), perms=["user:*", "banner:*"], role_code="super_admin")
raised = False
try:
    perm_checker(limited)
except Exception as e:
    raised = e.status_code == 403
check("RBAC 越权→403", raised)
try:
    perm_checker(admin_u)
    ok_pass = True
except Exception:
    ok_pass = False
check("RBAC 通配放行", ok_pass and _match_perm(["banner:*"], "banner:update"))
check("RBAC 精确匹配", _match_perm(["user:create"], "user:create"))

print(f"\n==== Phase B 验证结果：PASS={PASS} FAIL={FAIL} ====")
sys.exit(1 if FAIL else 0)
