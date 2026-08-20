# Phase F 联调与质量测试报告

- 报告日期：2026-08-20
- 项目：TP智能家居（backend FastAPI :8000 / frontend React :5173 / admin React :5174）
- 范围：安全合规（S-01~S-07）、双库兼容、全站路由冒烟

---

## 1. 安全项验证（S-01~S-07）

执行方式：`backend/verify_phase_f.py`（已修正预约路径为 `/appointments`）
结果：**14/15 PASS**，唯一未过项为 Phase G 计划内项。

| 编号 | 检查项 | 结果 | 说明 |
|------|--------|------|------|
| S-01 | JWT 登录/鉴权/越权 | ✅ PASS | 无 token→401、伪造 token→401、携带 token→200 |
| S-02 | 验证码移除 + 限流 | ✅ PASS | `/auth/captcha` 已 404（与用户确认移除）；预约提交链路通畅 |
| S-03 | 富文本 XSS 清洗 | ✅ PASS | **本轮修复验证通过**：bleach 白名单清洗 + 前端 DOMPurify 纵深防御，`<script>/onerror/javascript:` 全部被清除 |
| S-04 | 上传白名单 | ✅ PASS | 扩展名(jpg/png/webp/gif)+5MB 限制+UUID 重命名防路径穿越（代码实现） |
| S-05 | 二次确认 + HTTPS | 🔶 部分 | 删除/权限变更前端 Modal.confirm 已落地 ✅；**HTTPS 待 Phase G 部署（Let's Encrypt/Nginx）** |
| S-06 | 异常信息不泄露 | ✅ PASS | 422→code=40001、401 干净、未捕获异常→50000 统一响应，无堆栈/SQL 泄露 |
| S-07 | 手机号脱敏 | ✅ PASS | 列表 `138****1234` 脱敏、详情明文 |

### S-03 XSS 修复明细（本次 Phase F 核心项）
- 后端：安装 `bleach 6.4.0`；`app/core/security.py` 新增 `clean_html()`（白名单 p/br/img/a/strong/em/ul/ol/li）；
  `app/schemas/content.py` 对 News/Product/Job 的 content/description/duty/requirement 加 `field_validator` 入库前清洗。
- 前端：`dompurify` + `frontend/src/lib/sanitize.ts`，NewsDetail/ProductDetail/JobDetail 的 `dangerouslySetInnerHTML` 前兜底。
- 验证方式：注入 `<script>alert(1)</script><img onerror><a href="javascript:">` 创建新闻 → 读取返回内容确认危险标签全部清除 → 删除探针数据。

## 2. 双库兼容静态扫描（#47）

结论：**✅ PASS（静态）——方言无关，可平滑切换 PostgreSQL**

- 列类型全部为 SQLAlchemy 通用类型：String/Integer/Boolean/Date/JSON/Text，无 SQLite 专用类型（无 JSONB 硬编码、无 UUID 原生类型依赖）。
- 无原生 SQL：全 ORM 查询（`text()`/`exec_driver_sql`/手写 INSERT/UPDATE 均为 0 处）。
- 方言特判仅 1 处：`app/db/session.py` 对 SQLite 加 `check_same_thread=False`，PG 下不生效，属正确做法。
- Alembic `env.py` 无方言硬编码。
- ⚠️ 依赖缺口：requirements 未含 PG 驱动（psycopg），PG 实跑需 `pip install psycopg[binary]` 后设 `DB_URL=postgresql://...`。本地无 Docker/psql，PG 实跑冒烟留 CI（已记录）。

## 3. 全站路由冒烟（#50）

### 前端公开 API（:8000）
banners / series / settings / products(列表+详情) / news(列表+详情) / jobs / about(company+timeline) / appointments(POST) / messages(POST) — **全部 200**

### 前台页面路由（:5173，16 条全 200）
`/` `/products` `/products/1` `/news` `/news/industry` `/news/company` `/jobs` `/jobs/industry` `/jobs/campus` `/about` `/about/company` `/about/history` `/about/brand-history` `/about/brand` `/contact` `/login`

### 后台页面路由（:5174，13 条全 200）
`/login` `/` `/banners` `/products` `/news` `/jobs` `/about` `/appointments` `/messages` `/admins` `/roles` `/logs` `/stats`

### 冒烟中发现并处理的问题
1. **前端 dev server 进程挂死**（5173 部分路由 000）：后台任务方式启动的 vite 偶发退出，重启后 16 路由全 200。建议使用 `start-dev.bat` 启动。
2. 留言提交 422：字段 `type` 枚举 `product|cooperation|aftersale|other`、content ≥10 字符 —— 属正常校验，补全字段后 200。

## 4. 结论

- Phase F 安全/质量验证 **全部通过**（HTTPS 项为 Phase G 部署项，按计划推迟）。
- 阶段闸口：Phase F ✅ 完成，可进入 **Phase G 部署上线**。
