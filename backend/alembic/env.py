from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# ---- 项目接入：让 alembic 能导入 app 包 ----
import os
import sys

# 将 backend 目录加入 sys.path（env.py 位于 backend/alembic/）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入声明基类（汇聚所有 ORM 模型的 metadata）与全局配置
from app.db.base import Base
from app.core.config import settings
# 关键：导入全部 ORM 模型模块，使 19 张表注册到 Base.metadata，
# 否则 autogenerate 检测不到表结构（仅导入 Base 不够）。
import app.models  # noqa: F401

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# 声明基类的 metadata 即所有 ORM 模型的元数据集合，自动生成迁移的依据
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # 使用配置中的数据库地址（SQLite 开发 / PostgreSQL 生产，见方案双库兼容）
    url = settings.DB_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # 依据配置中的 DB_URL 创建引擎（不再依赖 alembic.ini 的 sqlalchemy.url）
    from sqlalchemy import create_engine

    connectable = create_engine(settings.DB_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
