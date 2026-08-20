# ============================================================
# 文件功能：Phase E 公开接口验证脚本（开发自测，可重复运行）
# 覆盖：banners/series/settings/products(+views+1)/news(+views+1+上下篇)/
#       jobs/about/timeline/company + 预约/留言提交校验 + 限流 429。
# 运行：python verify_phase_e.py
# ============================================================
import sys

from fastapi.testclient import TestClient

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


# ---------- 公开只读 ----------
r = client.get("/api/v1/banners")
d = r.json()
check("banners→4+", d["code"] == 0 and len(d["data"]) >= 4, f"n={len(d['data'])}")

r = client.get("/api/v1/series")
check("series→3", r.json()["code"] == 0 and len(r.json()["data"]) == 3)

r = client.get("/api/v1/settings")
s = r.json()["data"]
check("settings→slider_interval", s["slider_interval"] == 4 and s["site_name"])

r = client.get("/api/v1/products")
d = r.json()["data"]
check("products→on_shelf 分页", d["total"] >= 8 and len(d["items"]) <= 12, f"total={d['total']}")
pid = d["items"][0]["id"]

# views+1 验证
v1 = client.get(f"/api/v1/products/{pid}").json()["data"]["views"]
v2 = client.get(f"/api/v1/products/{pid}").json()["data"]["views"]
check("product 详情 views+1", v2 == v1 + 1, f"{v1}→{v2}")
d = client.get(f"/api/v1/products/{pid}").json()["data"]
check("product 详情 related", "related" in d)

r = client.get("/api/v1/news?category=industry")
d = r.json()["data"]
check("news industry→≥2", d["total"] >= 2)
nid = d["items"][0]["id"]
nv1 = client.get(f"/api/v1/news/{nid}").json()["data"]["views"]
nv2 = client.get(f"/api/v1/news/{nid}").json()["data"]["views"]
check("news 详情 views+1", nv2 == nv1 + 1, f"{nv1}→{nv2}")
dd = client.get(f"/api/v1/news/{nid}").json()["data"]
check("news 详情 prev/next", "prev" in dd and "next" in dd)

r = client.get("/api/v1/jobs")
check("jobs→≥5", r.json()["code"] == 0 and len(r.json()["data"]) >= 5)

r = client.get("/api/v1/about/pages")
check("about pages→company_intro(D1)", any(p["page_key"] == "company_intro" for p in r.json()["data"]))

r = client.get("/api/v1/about/timeline?type=history")
check("timeline history→2", len(r.json()["data"]) == 2)

r = client.get("/api/v1/about/company")
check("about company→≥4", len(r.json()["data"]) >= 4)

# ---------- 提交：预约 / 留言 ----------
r = client.post("/api/v1/appointments", json={
    "name": "验收预约", "phone": "13800001111", "appt_type": "showroom",
    "appt_date": "2026-09-01", "appt_slot": "morning", "remark": "验收测试"})
check("预约提交→OK", r.json()["code"] == 0, r.json().get("message"))

r = client.post("/api/v1/appointments", json={
    "name": "验收预约", "phone": "13800001111", "appt_type": "showroom",
    "appt_date": "2020-01-01"})
check("预约过去日期→40001", r.json()["code"] == 40001)

r = client.post("/api/v1/messages", json={
    "name": "验收留言", "phone": "13700001111", "type": "product",
    "content": "咨询全屋智能方案是否支持定制安装与后期升级？"})
check("留言提交→OK", r.json()["code"] == 0, r.json().get("message"))

r = client.post("/api/v1/messages", json={
    "name": "验收留言", "phone": "13700001111", "type": "product", "content": "太短"})
check("留言内容过短→40001", r.json()["code"] == 40001)

# ---------- 限流（同 IP 连发 11 次预约 → 第 11 次 429） ----------
last = None
for i in range(11):
    last = client.post("/api/v1/appointments", json={
        "name": f"限流测试{i}", "phone": "13800002222", "appt_type": "factory"})
check("限流→第11次 42900", last.json().get("code") == 42900, last.json().get("message"))

print(f"\n==== Phase E 验证结果：PASS={PASS} FAIL={FAIL} ====")
sys.exit(1 if FAIL else 0)
