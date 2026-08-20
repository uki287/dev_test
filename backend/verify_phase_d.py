# ============================================================
# 文件功能：Phase D 后端验证脚本（开发自测，可重复运行）
# 覆盖：预约/留言（脱敏/明文/流转/批量/导出/软删）、管理员（保护规则）、
#       角色（权限树/映射替换/删除保护）、日志筛选、统计聚合与导出。
# 运行：python verify_phase_d.py
# ============================================================
import sys
import time

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


def login() -> str:
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.json().get("code") == 0, r.json()
    return r.json()["data"]["access_token"]


H = {"Authorization": f"Bearer {login()}"}
SUF = int(time.time()) % 100000


# ---------- 预约 ----------
r = client.get("/api/v1/admin/appointments", headers=H)
d = r.json()["data"]
check("预约列表→脱敏手机", d["total"] >= 6 and all(
    (i["phone"] or "").count("*") >= 4 for i in d["items"] if i["phone"]), f"total={d['total']}")
masked = d["items"][0]["phone"]
check("脱敏格式 138****1234", masked and "*" in masked and len(masked) == 11, masked)

appt_id = d["items"][0]["id"]
r = client.get(f"/api/v1/admin/appointments/{appt_id}", headers=H)
detail = r.json()["data"]
check("预约详情→明文手机", detail["phone"] and "*" not in detail["phone"], detail["phone"])

r = client.put(f"/api/v1/admin/appointments/{appt_id}/status", headers=H,
               json={"status": "confirmed", "handle_remark": "已电话确认"})
check("预约状态流转→confirmed", r.json().get("code") == 0)
r = client.put(f"/api/v1/admin/appointments/{appt_id}/status", headers=H, json={"status": "pending"})
check("预约状态回退→pending", r.json().get("code") == 0)

r = client.post("/api/v1/admin/appointments/batch-status", headers=H,
                json={"ids": [appt_id], "status": "completed"})
check("预约批量标记→completed", r.json().get("code") == 0)
client.put(f"/api/v1/admin/appointments/{appt_id}/status", headers=H, json={"status": "pending"})

r = client.get("/api/v1/admin/appointments/export", headers=H)
check("预约导出 xlsx→PK头", r.status_code == 200 and r.content[:2] == b"PK", f"{len(r.content)}B")

# ---------- 留言 ----------
r = client.get("/api/v1/admin/messages", headers=H)
d = r.json()["data"]
check("留言列表→脱敏手机", d["total"] >= 3 and all(
    (i["phone"] or "").count("*") >= 4 for i in d["items"] if i["phone"]))
msg_id = d["items"][0]["id"]
r = client.get(f"/api/v1/admin/messages/{msg_id}", headers=H)
detail = r.json()["data"]
check("留言详情→明文手机", detail["phone"] and "*" not in detail["phone"])
r = client.put(f"/api/v1/admin/messages/{msg_id}/status", headers=H, json={"status": "processed"})
check("留言状态流转→processed", r.json().get("code") == 0)
client.put(f"/api/v1/admin/messages/{msg_id}/status", headers=H, json={"status": "pending"})
r = client.get("/api/v1/admin/messages/export", headers=H)
check("留言导出 xlsx→PK头", r.content[:2] == b"PK")

# ---------- 管理员（含保护规则） ----------
r = client.get("/api/v1/admin/users", headers=H)
check("管理员列表→含 admin", any(u["username"] == "admin" for u in r.json()["data"]["items"]))
# 创建测试用户
r = client.post("/api/v1/admin/users", headers=H, json={
    "username": f"tester_{SUF}", "password": "test123", "cn_name": "测试员",
    "role_id": None, "is_activate": 1})
uid = r.json()["data"]["id"]
check("管理员创建→OK", r.json().get("code") == 0)
# 重复用户名 → 40001
r = client.post("/api/v1/admin/users", headers=H, json={
    "username": f"tester_{SUF}", "password": "test123"})
check("管理员重名→40001", r.json().get("code") == 40001)
# 编辑
r = client.put(f"/api/v1/admin/users/{uid}", headers=H, json={"cn_name": "测试员2"})
check("管理员编辑→OK", r.json().get("code") == 0)
# 重置密码
r = client.post(f"/api/v1/admin/users/{uid}/reset-password", headers=H, json={"new_password": "newpass123"})
check("管理员重置密码→OK(force_pwd)", r.json().get("code") == 0)
# 保护：删除自己 → 40001
me = next(u for u in client.get("/api/v1/admin/users", headers=H).json()["data"]["items"] if u["username"] == "admin")
r = client.delete(f"/api/v1/admin/users/{me['id']}", headers=H)
check("删除自己→40001", r.json().get("code") == 40001, r.json().get("message"))
# 保护：停用自己 → 40001
r = client.put(f"/api/v1/admin/users/{me['id']}", headers=H, json={"is_activate": 0})
check("停用自己→40001", r.json().get("code") == 40001)
# 清理测试用户
client.delete(f"/api/v1/admin/users/{uid}", headers=H)

# ---------- 角色 ----------
r = client.get("/api/v1/admin/roles/perm-tree", headers=H)
tree = r.json()["data"]
check("权限树→含 banner:*", any(n["code"] == "banner:*" for n in tree["tree"]))
r = client.get("/api/v1/admin/roles", headers=H)
roles = r.json()["data"]
check("角色列表→3个预置", len(roles) == 3)
# 创建角色 + 权限映射
r = client.post("/api/v1/admin/roles", headers=H, json={
    "code": f"test_role_{SUF}", "name": "测试角色",
    "perms": ["banner:*", "news:list"], "is_activate": 1})
rid = r.json()["data"]["id"]
check("角色创建→OK", r.json().get("code") == 0)
# 编辑权限映射（整体替换）
r = client.put(f"/api/v1/admin/roles/{rid}", headers=H, json={"perms": ["product:*"]})
check("角色权限替换→OK", r.json().get("code") == 0)
# 删除角色
r = client.delete(f"/api/v1/admin/roles/{rid}", headers=H)
check("角色删除→OK", r.json().get("code") == 0)
# 删除被引用角色 → 40001
super_role = next(rr for rr in client.get("/api/v1/admin/roles", headers=H).json()["data"] if rr["code"] == "super_admin")
r = client.delete(f"/api/v1/admin/roles/{super_role['id']}", headers=H)
check("删除被引用角色→40001", r.json().get("code") == 40001)

# ---------- 操作日志 ----------
r = client.get("/api/v1/admin/logs", headers=H)
check("日志列表→有数据", r.json()["data"]["total"] > 0)
r = client.get("/api/v1/admin/logs?module=auth", headers=H)
check("日志按模块筛选→OK", r.json().get("code") == 0)
r = client.get("/api/v1/admin/logs?username=admin", headers=H)
check("日志按操作人筛选→OK", r.json().get("code") == 0)

# ---------- 统计 ----------
r = client.get("/api/v1/admin/stats/overview", headers=H)
ov = r.json()["data"]
check("统计概览→字段齐全", all(k in ov for k in ["appointment", "message", "product", "news", "job", "today_pv"]))
r = client.get("/api/v1/admin/stats/pv-trend?days=30", headers=H)
check("PV趋势→30天", len(r.json()["data"]) == 30)
r = client.get("/api/v1/admin/stats/top-pages?days=7", headers=H)
check("Top10页面→列表", isinstance(r.json()["data"], list))
r = client.get("/api/v1/admin/stats/aggregate?kind=appointment&dimension=status", headers=H)
check("预约状态聚合→OK", r.json().get("code") == 0 and len(r.json()["data"]) > 0)
r = client.get("/api/v1/admin/stats/export?days=7", headers=H)
check("统计报表导出→PK头", r.content[:2] == b"PK")

print(f"\n==== Phase D 验证结果：PASS={PASS} FAIL={FAIL} ====")
sys.exit(1 if FAIL else 0)
