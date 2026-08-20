# ============================================================
# 文件功能：全局配置中心（基于 pydantic-settings）
# 说明：
#   - 从环境变量或项目根 .env 读取配置，提供统一访问入口 settings；
#   - 所有敏感信息（密钥）通过环境变量注入，绝不硬编码（代码自检要求）；
#   - 双库兼容：DB_URL 决定 SQLite（开发）或 PostgreSQL（生产）。
# 权威依据：方案 §4.1 技术栈；数据库设计文档（DB_URL）。
# ============================================================
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# 后端根目录（backend/）：基于文件位置解析，不依赖进程启动目录（uvicorn 后台任务 cwd 可能不同）
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """应用配置类：字段名即环境变量名（大写）。"""

    # pydantic-settings 行为配置
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",  # 固定读取 backend/.env（该文件不入库）
        env_file_encoding="utf-8",
        extra="ignore",             # 忽略未在类中声明的环境变量
    )

    # ---------------- 基础 ----------------
    APP_NAME: str = "TP智能家居后台API"
    DEBUG: bool = False

    # ---------------- 数据库 ----------------
    # 开发期使用 SQLite（免容器）；生产切换 PostgreSQL（见方案决策 D-02）
    DB_URL: str = "sqlite:///./app.db"

    # ---------------- JWT / 安全 ----------------
    # 生产环境必须用强随机值并通过环境变量注入（禁止提交到仓库）
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"                  # JWT 签名算法
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480        # 访问令牌有效期 8 小时（方案 §4.1）

    # ---------------- 上传 ----------------
    UPLOAD_DIR: str = "./uploads"   # 本地上传目录（预留 COS/OSS 切换接口，方案 D-03）
    MAX_UPLOAD_MB: int = 5          # 单文件大小上限（MB）

    # ---------------- CORS ----------------
    # 允许跨域的前端 / 后台开发地址（环境变量用逗号分隔）
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174"]

    # ---------------- Redis ----------------
    REDIS_URL: str = "redis://localhost:6379/0"   # 缓存与限流（一期启用，决策 D2）


@lru_cache()
def get_settings() -> Settings:
    """返回单例配置对象（带缓存，避免重复构造开销）。"""
    s = Settings()
    # 生产保护：JWT 使用默认弱密钥时告警（防止忘记配置 .env 直接部署）
    if s.JWT_SECRET == "change-me-in-production":
        import warnings
        warnings.warn(
            "JWT_SECRET 仍为默认值 'change-me-in-production'！生产环境必须设置强随机密钥（backend/.env 或环境变量）。",
            RuntimeWarning,
            stacklevel=2,
        )
    return s


# 全局配置实例，供其他模块直接 `from app.core.config import settings` 使用
settings = get_settings()
