# ============================================================
# 文件功能：Phase C-1 后端内容管理 API 验证脚本（开发自测，可重复运行）
# 覆盖：banner(含启用数≥1校验) / series / product(JSON+搭配+批量+复制) /
#       news / job / about / settings 全部 CRUD 与 RBAC。
# 说明：测试后恢复种子状态（不破坏联调数据）；异常用 assert 直接暴露。
# 运行：python verify_phase_c1.py
# ============================================================
import sys
import time

from fastapi.testclient import TestClient

from app.core.redis import redis_cache
from app.main import app

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


def login() -> str:
    """获取管理员 JWT（验证码走进程内缓存，与接口同进程）。"""
    r = client.get("/api/v1/auth/captcha")
    cap = r.json()["data"]
    code = redis_cache.get(f"cap:{cap['captcha_token']}") or ""
    r = client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "admin123",
        "captcha_token": cap["captcha_token"], "captcha_code": code,
    })
    assert r.json().get("code") == 0, f"登录失败: {r.json()}"
    return r.json()["data"]["access_token"]


H = {}  # 鉴权头


# ---------- RBAC：无令牌 / 越权 ----------
r = client.get("/api/v1/admin/banners")
check("banner 无令牌→401", r.status_code == 401)

H = {"Authorization": f"Bearer {login()}"}
r = client.get("/api/v1/admin/settings", headers=H)
check("settings 有令牌→200", r.status_code == 200 and r.json().get("code") == 0)

# ---------- Banner（★ 启用数 ≥1 校验） ----------
r = client.get("/api/v1/admin/banners", headers=H)
d = r.json()["data"]
seed_banners = d["items"]
check("banner 列表→种子4+", d.get("total", 0) >= 4, f"total={d.get('total')}")

# 创建 2 张测试轮播（启用）
ids = []
for i in range(2):
    r = client.post("/api/v1/admin/banners", headers=H, json={
        "title": f"测试轮播{i}", "image": "/uploads/test.png",
        "link_url": "/products?series=lighting", "sort": 90 + i, "is_activate": 1,
    })
    assert r.json().get("code") == 0, r.json()
    ids.append(r.json()["data"]["id"])
check("banner 创建×2→OK", True)

# 停用其中 1 张 → OK
r = client.put(f"/api/v1/admin/banners/{ids[0]}", headers=H, json={"is_activate": 0})
check("banner 停用→OK", r.json().get("code") == 0)

# 删除 1 张（启用态）→ OK
r = client.delete(f"/api/v1/admin/banners/{ids[1]}", headers=H)
check("banner 删除启用→OK", r.json().get("code") == 0)

# 启用数校验：停用 3 张种子（4→1），第 4 张停用 → 403（启用数不得降为 0）
active_seed = [b["id"] for b in seed_banners]
stopped = []
for bid in active_seed[:3]:
    r = client.put(f"/api/v1/admin/banners/{bid}", headers=H, json={"is_activate": 0})
    if r.json().get("code") == 0:
        stopped.append(bid)
r = client.put(f"/api/v1/admin/banners/{active_seed[3]}", headers=H, json={"is_activate": 0})
check("banner 最后1张停用→403", r.status_code == 403, f"code={r.json().get('code')}")
# 恢复种子启用状态
for bid in stopped:
    client.put(f"/api/v1/admin/banners/{bid}", headers=H, json={"is_activate": 1})
# 清理测试轮播
client.delete(f"/api/v1/admin/banners/{ids[0]}", headers=H)
r = client.get("/api/v1/admin/banners", headers=H)
check("banner 清理后恢复种子数", r.json()["data"]["total"] == len(seed_banners))

# ---------- Series ----------
r = client.get("/api/v1/admin/series", headers=H)
check("series 列表→种子3", r.json()["data"]["total"] == 3)
r = client.post("/api/v1/admin/series", headers=H, json={"name": "测试系列", "sort": 99})
sid = r.json()["data"]["id"]
check("series 创建→OK", r.json().get("code") == 0)
r = client.put(f"/api/v1/admin/series/{sid}", headers=H, json={"description": "改"})
check("series 编辑→OK", r.json().get("code") == 0)
r = client.delete(f"/api/v1/admin/series/{sid}", headers=H)
check("series 删除→OK", r.json().get("code") == 0)

# ---------- Product（spec/images/related/batch/duplicate） ----------
SUF = int(time.time()) % 100000  # 随机后缀：保证脚本可重复运行，编号不冲突

def mk_prod(code: str, related=None):
    return client.post("/api/v1/admin/products", headers=H, json={
        "product_code": code, "name": f"产品{code}", "series_id": None,
        "spec": {"材质": "铝合金", "尺寸": "300mm"}, "images": ["/uploads/a.jpg", "/uploads/b.jpg"],
        "pub_status": "on_shelf", "is_top": False, "sort": 88,
        "related_products": related or [], "price_desc": "价格面议",
    })

r1 = mk_prod(f"TP-T-{SUF}-1")
p1 = r1.json()["data"]["id"]
check("product 创建→OK(spec/images JSON)", r1.json().get("code") == 0)
# 搭配数量 1 个 → 40001
r = mk_prod(f"TP-T-{SUF}-2", related=[p1])
check("product 搭配1个→40001", r.json().get("code") == 40001, r.json().get("message"))
# 搭配 2 个 → OK
r2 = mk_prod(f"TP-T-{SUF}-2", related=[p1, p1 + 1])
p2 = r2.json()["data"]["id"]
check("product 搭配2个→OK", r2.json().get("code") == 0)
# 编号重复 → 40001
r = mk_prod(f"TP-T-{SUF}-1")
check("product 编号重复→40001", r.json().get("code") == 40001)
# 更新搭配为 1 个 → 40001
r = client.put(f"/api/v1/admin/products/{p2}", headers=H, json={"related_products": [p1]})
check("product 更新搭配1个→40001", r.json().get("code") == 40001)
# 批量上下架
r = client.post("/api/v1/admin/products/batch-status", headers=H,
                json={"ids": [p1, p2], "pub_status": "off_shelf"})
check("product 批量下架→OK", r.json().get("code") == 0)
# 复制
r = client.post(f"/api/v1/admin/products/{p2}/duplicate", headers=H)
dup = r.json()
check("product 复制→副本", dup.get("code") == 0 and str(dup["data"]["product_code"]).endswith("-copy"))
# 清理
for pid in [p1, p2, dup["data"]["id"]]:
    client.delete(f"/api/v1/admin/products/{pid}", headers=H)
r = client.get("/api/v1/admin/products", headers=H)
check("product 清理后恢复种子数", r.json()["data"]["total"] == 12)

# ---------- News ----------
r = client.get("/api/v1/admin/news", headers=H)
check("news 列表→种子4", r.json()["data"]["total"] == 4)
r = client.post("/api/v1/admin/news", headers=H, json={
    "category": "industry", "title": "测试新闻", "pub_status": "published", "is_top": True})
nid = r.json()["data"]["id"]
check("news 创建→OK", r.json().get("code") == 0)
r = client.put(f"/api/v1/admin/news/{nid}", headers=H, json={"pub_status": "offline"})
check("news 编辑状态→OK", r.json()["data"]["pub_status"] == "offline")
r = client.delete(f"/api/v1/admin/news/{nid}", headers=H)
check("news 删除→OK", r.json().get("code") == 0)

# ---------- Job ----------
r = client.get("/api/v1/admin/jobs", headers=H)
check("job 列表→种子5", r.json()["data"]["total"] == 5)
r = client.post("/api/v1/admin/jobs", headers=H, json={
    "category": "industry", "title": "测试岗位", "count": 2, "location": "深圳", "email": "x@tp.com"})
jid = r.json()["data"]["id"]
check("job 创建→OK", r.json().get("code") == 0)
r = client.post(f"/api/v1/admin/jobs/{jid}/duplicate", headers=H)
copy_id = r.json()["data"]["id"]
check("job 复制→OK", r.json().get("code") == 0)
r = client.delete(f"/api/v1/admin/jobs/{jid}", headers=H)
check("job 删除→OK", r.json().get("code") == 0)
client.delete(f"/api/v1/admin/jobs/{copy_id}", headers=H)  # 清理副本，保证可重复运行

# ---------- About ----------
r = client.get("/api/v1/admin/about/pages", headers=H)
check("about pages→含company_intro(D1)", r.json().get("code") == 0 and
      any(p["page_key"] == "company_intro" for p in r.json()["data"]))
r = client.put("/api/v1/admin/about/pages/company_intro", headers=H, json={
    "content": {"title": "关于我们", "blocks": [{"h": "企业简介", "p": "更新内容"}]}})
check("about page 更新→OK", r.json().get("code") == 0)
r = client.get("/api/v1/admin/about/timeline?type=history", headers=H)
check("about timeline→种子2", r.json()["data"].__len__() == 2)
r = client.post("/api/v1/admin/about/timeline", headers=H, json={
    "type": "history", "year": "2026", "title": "测试事件", "sort": 99})
tid = r.json()["data"]["id"]
r = client.delete(f"/api/v1/admin/about/timeline/{tid}", headers=H)
check("about timeline 增删→OK", r.json().get("code") == 0)
r = client.get("/api/v1/admin/about/company", headers=H)
check("about company→种子4", len(r.json()["data"]) >= 4)
r = client.post("/api/v1/admin/about/company", headers=H, json={"info_key": f"test_key_{SUF}", "info_value": "v"})
cid = r.json()["data"]["id"]
check("about company 创建→OK", r.json().get("code") == 0)
r = client.post("/api/v1/admin/about/company", headers=H, json={"info_key": f"test_key_{SUF}", "info_value": "v2"})
check("about company 重复键→40001", r.json().get("code") == 40001)
r = client.put(f"/api/v1/admin/about/company/{cid}", headers=H, json={"info_value": "v-upd"})
check("about company 编辑→OK", r.json().get("code") == 0)

# ---------- Settings ----------
r = client.get("/api/v1/admin/settings", headers=H)
check("settings 读取→slider=4", r.json()["data"]["slider_interval"] == 4)
r = client.put("/api/v1/admin/settings", headers=H, json={"slider_interval": 5})
check("settings 更新→OK", r.json()["data"]["slider_interval"] == 5)
r = client.put("/api/v1/admin/settings", headers=H, json={"slider_interval": 2})
check("settings 间隔<3→422", r.status_code == 422, f"code={r.json().get('code')}")
client.put("/api/v1/admin/settings", headers=H, json={"slider_interval": 4})

print(f"\n==== Phase C-1 验证结果：PASS={PASS} FAIL={FAIL} ====")
sys.exit(1 if FAIL else 0)
