# ============================================================
# 文件功能：FastAPI 应用入口（程序启动文件）
# 说明：
#   1. 创建 app 实例；
#   2. 配置 CORS 跨域（允许前端/后台开发服务器访问）；
#   3. 注册全局统一异常处理；
#   4. 挂载健康检查 / 根路径占位接口。
# Phase A 仅搭骨架，业务路由在后续阶段（B/C/D）补充。
# 启动命令：uvicorn app.main:app --reload --port 8000
# ============================================================
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.admin_about import router as admin_about_router
from app.api.v1.admin_banner import router as admin_banner_router
from app.api.v1.admin_business import router as admin_business_router
from app.api.v1.admin_job import router as admin_job_router
from app.api.v1.admin_log import router as admin_log_router
from app.api.v1.admin_news import router as admin_news_router
from app.api.v1.admin_product import router as admin_product_router
from app.api.v1.admin_role import router as admin_role_router
from app.api.v1.admin_series import router as admin_series_router
from app.api.v1.admin_settings import router as admin_settings_router
from app.api.v1.admin_stats import router as admin_stats_router
from app.api.v1.admin_user import router as admin_user_router
from app.api.v1.auth import router as auth_router
from app.api.v1.public import router as public_router
from app.api.v1.upload import router as upload_router
from app.core.config import settings
from app.core.exception import register_exception_handlers
from app.core.middleware import StatsMiddleware
from app.schemas.response import ApiResp

# 创建 FastAPI 应用实例
# title / version 会展示在自动生成的 Swagger 文档（/docs）中
app = FastAPI(title=settings.APP_NAME, version="0.1.0")

# 配置跨域中间件（CORS）
# 允许列表来自配置 settings.CORS_ORIGINS（前端 :5173 / 后台 :5174）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # 允许的源
    allow_credentials=True,                # 允许携带 Cookie / Authorization
    allow_methods=["*"],                   # 允许所有 HTTP 方法
    allow_headers=["*"],                   # 允许所有请求头
)

# 注册全局异常处理器：把异常统一转换成 {code, message, data}
register_exception_handlers(app)

# 统计 / 操作日志中间件（Phase B §5）
app.add_middleware(StatsMiddleware)

# 挂载业务路由（统一前缀 /api/v1）
app.include_router(public_router, prefix="/api/v1")   # Phase E：前台公开接口
app.include_router(auth_router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
# Phase C：后台内容管理路由
app.include_router(admin_banner_router, prefix="/api/v1")
app.include_router(admin_series_router, prefix="/api/v1")
app.include_router(admin_product_router, prefix="/api/v1")
app.include_router(admin_news_router, prefix="/api/v1")
app.include_router(admin_job_router, prefix="/api/v1")
app.include_router(admin_about_router, prefix="/api/v1")
app.include_router(admin_settings_router, prefix="/api/v1")
app.include_router(admin_stats_router, prefix="/api/v1")
# Phase D：业务 + 系统管理路由
app.include_router(admin_business_router, prefix="/api/v1")
app.include_router(admin_user_router, prefix="/api/v1")
app.include_router(admin_role_router, prefix="/api/v1")
app.include_router(admin_log_router, prefix="/api/v1")

# 确保上传目录存在（开发期本地磁盘）
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# 挂载上传文件静态目录：/uploads/xxx.png 可直接访问（Nginx 部署时由 Nginx 直接服务）
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# 健康检查接口：用于部署探针（K8s/容器）与联调自检
@app.get("/healthz", tags=["系统"])
def health_check():
    # 返回 200 + 统一结构，data 给出服务状态
    return ApiResp.ok(data={"status": "ok", "service": settings.APP_NAME})


# 根路径占位：便于快速确认服务已启动并查看文档入口
@app.get("/", tags=["系统"])
def root():
    return ApiResp.ok(data={"msg": settings.APP_NAME, "docs": "/docs"})
