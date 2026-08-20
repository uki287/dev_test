# ============================================================
# 文件功能：数据库引擎与会话工厂
# 说明：
#   - 依据 settings.DB_URL 创建引擎（SQLite 开发 / PostgreSQL 生产）；
#   - 提供 get_db_session() 获取会话，配合依赖注入 get_db 使用；
#   - 双库兼容由 URL 前缀决定，无需改代码（方案 §6 双库兼容）。
# ============================================================
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# 判断是否为 SQLite：SQLite 在多线程下需关闭同线程限制
is_sqlite = settings.DB_URL.startswith("sqlite")

# 创建引擎
# - SQLite：connect_args 关闭 check_same_thread，支持多线程访问；
# - 其他库：使用默认连接池；pool_pre_ping 在取连接前探活，避免陈旧连接。
engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    pool_pre_ping=True,
)

# 会话工厂：关闭自动 flush、提交后不使对象过期，行为更可控
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db_session() -> Session:
    """返回一个新的数据库会话实例（由依赖层 get_db 管理生命周期）。"""
    return SessionLocal()
