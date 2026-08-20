# ============================================================
# 文件功能：数据库声明基类与公共 Mixin
# 说明：
#   - Base：SQLAlchemy 2.x 声明基类，所有 ORM 模型继承它；
#   - ActiveMixin：启用/停用开关字段（is_activate，1/0）；
#   - AuditMixin：审计字段，严格对齐《数据库设计文档》§4.0 命名约定：
#         created_at  = 创建人（登录名/姓名，字符串）
#         created_date = 创建时间（时间戳）
#         update_at   = 修改人（登录名/姓名，字符串）
#         update_date = 修改时间（时间戳，更新时自动刷新）
#   - SoftDeleteMixin：逻辑删除标记（deleted_at）。
#   权威依据：数据库设计文档 V1.2 §2 / §4.0。双库兼容：使用通用类型，避免方言专属语法。
# ============================================================
from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """所有 ORM 模型的声明基类。"""
    pass


class ActiveMixin:
    """启用/停用状态 Mixin：记录级总开关（方案 §4.0 公共字段）。"""
    is_activate: Mapped[int] = mapped_column(
        SmallInteger, default=1, nullable=False, comment="1启用/0禁用（记录级总开关）"
    )


class AuditMixin:
    """审计字段 Mixin：注意 _at 后缀存"操作人"，_date 后缀存"时间"（§4.0 命名约定）。"""
    created_at: Mapped[str] = mapped_column(
        String(64), default="system", nullable=False, comment="创建人（登录名/姓名）"
    )
    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, comment="创建时间"
    )
    update_at: Mapped[str] = mapped_column(
        String(64), default="system", nullable=False, comment="修改人（登录名/姓名）"
    )
    update_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),  # 更新时自动刷新修改时间
        nullable=False,
        comment="修改时间",
    )


class SoftDeleteMixin:
    """逻辑删除 Mixin：软删时间标记，内容表/业务表查询恒加 deleted_at IS NULL（§4.0）。"""
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="软删时间；NULL 表示未删除"
    )
