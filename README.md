# TP智能家居（企业官网 + 后台管理）

全栈智能家居企业官网项目：FastAPI 后端 + React 前台官网 + React 后台管理。

## 技术栈

| 端 | 技术 | 端口 |
|----|------|------|
| backend | FastAPI + SQLAlchemy 2.0 + SQLite/PostgreSQL + Redis | 8000 |
| frontend | React 18 + Vite + TypeScript + Tailwind CSS | 5173 |
| admin | React 18 + Vite + TypeScript + Ant Design 5 | 5174 |

## 快速开始

```bash
# 1. 后端（需 Python ≥3.12）
cd backend
pip install -e .          # 或按 pyproject.toml 安装依赖
cp .env.example .env      # 复制环境变量模板（含随机 JWT 密钥生成说明）
python -m alembic upgrade head   # 建表/迁移
python -m uvicorn app.main:app --reload --port 8000

# 2. 前台官网
cd frontend
npm install
npm run dev               # http://localhost:5173

# 3. 后台管理
cd admin
npm install
npm run dev               # http://localhost:5174
```

一键启动（Windows）：双击根目录 `start-dev.bat`。

## 演示数据

```bash
cd backend
python seed.py             # 基础种子数据（管理员 admin/admin123、分类/系列等）
python generate_content.py # 产品/新闻演示内容（幂等）
python enrich_content.py   # 产品描述/新闻正文加深（幂等）
```

## 常用命令

- 迁移：`cd backend && python -m alembic upgrade head`（或 `downgrade -1`）
- 构建：`cd frontend && npm run build` / `cd admin && npm run build`（产物在 `dist/`）
- 安全探针：`cd backend && python verify_phase_f.py`

## 环境变量

- `backend/.env`：后端配置（JWT 密钥、DB_URL、Redis、CORS），模板见 `.env.example`，**禁止提交仓库**
- `frontend/.env`：前台 Vite 变量（百度地图 AK 等），未配置时前台有占位提示

## 目录结构

```
backend/   FastAPI 后端（app/ 业务代码、alembic/ 迁移、seed.py 种子）
frontend/  前台官网（React/Vite/Tailwind）
admin/     后台管理（React/AntD）
static/    设计文档（PRD/UIUX/Dev/DB）+ HTML 原型
```

## 安全说明（Phase F 已验证）

- JWT 鉴权 + RBAC 权限码、越权 401/403
- 富文本 XSS 白名单清洗（bleach）+ 前端 DOMPurify 纵深防御
- 上传白名单（jpg/png/webp/gif + 5MB + UUID 重命名）
- 预约/留言 10 次/分/IP 限流；手机号列表脱敏
- 生产部署前必须：配置强随机 `JWT_SECRET`、启用 HTTPS、切换 PostgreSQL（`pip install "psycopg[binary]"`）
