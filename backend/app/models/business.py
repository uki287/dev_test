# ============================================================
# 文件功能：业务域模型（4 张表）
# 表清单：appointment / message / operation_log / visit_stat
# 软删规则（§4.0）：业务表统一含 deleted_at（内容/业务表软删）。
# 隐私最小化：手机号由应用层脱敏输出（列表脱敏、详情明文，S-07）。
# 权威依据：数据库设计文档 V1.2 §4.3。
# ============================================================
from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ActiveMixin, AuditMixin, Base, SoftDeleteMixin


class Appointment(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """在线预约表：手机号应用层脱敏；status 为处理工作流。"""
    __tablename__ = "appointment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, comment="姓名（2-20 字符）")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="手机号")
    appt_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="showroom/factory")
    appt_date: Mapped[Date | None] = mapped_column(Date, comment="期望日期（不早于今天）")
    appt_slot: Mapped[str | None] = mapped_column(String(10), comment="morning/afternoon")
    remark: Mapped[str | None] = mapped_column(String(200), comment="备注（≤200 字）")
    source_page: Mapped[str | None] = mapped_column(String(255), comment="来源页面")
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, comment="处理状态")
    handle_remark: Mapped[str | None] = mapped_column(String(500), comment="处理备注")
    handler_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sys_user.id", ondelete="SET NULL"), comment="处理人"
    )
    handled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="处理时间")
    ip: Mapped[str | None] = mapped_column(String(45), comment="提交 IP")

    __table_args__ = (
        CheckConstraint("appt_type IN ('showroom','factory')", name="ck_appt_type"),
        CheckConstraint(
            "appt_slot IS NULL OR appt_slot IN ('morning','afternoon')", name="ck_appt_slot"
        ),
        CheckConstraint(
            "status IN ('pending','confirmed','completed','cancelled')", name="ck_appt_status"
        ),
    )


class Message(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """留言咨询表：弱关联 product_id（来自产品详情页）；status 处理工作流。"""
    __tablename__ = "message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), nullable=False, comment="姓名（2-20 字符）")
    phone: Mapped[str] = mapped_column(String(20), nullable=False, comment="手机号")
    email: Mapped[str | None] = mapped_column(String(120), comment="邮箱（选填）")
    type: Mapped[str] = mapped_column(String(20), nullable=False, comment="咨询类型")
    content: Mapped[str] = mapped_column(String(500), nullable=False, comment="咨询内容（10-500 字）")
    source_page: Mapped[str | None] = mapped_column(String(255), comment="来源页面")
    product_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product.id", ondelete="SET NULL"), comment="弱关联产品"
    )
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, comment="处理状态")
    handle_remark: Mapped[str | None] = mapped_column(String(500), comment="处理备注")
    handler_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sys_user.id", ondelete="SET NULL"), comment="处理人"
    )
    handled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="处理时间")
    ip: Mapped[str | None] = mapped_column(String(45), comment="提交 IP")

    __table_args__ = (
        CheckConstraint(
            "type IN ('product','cooperation','aftersale','other')", name="ck_msg_type"
        ),
        CheckConstraint(
            "status IN ('pending','processed','closed')", name="ck_msg_status"
        ),
    )


class OperationLog(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """操作日志表：只增不改，保留 180 天；不存明文手机号（S-07）。"""
    __tablename__ = "operation_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sys_user.id", ondelete="SET NULL"), comment="操作人"
    )
    username: Mapped[str | None] = mapped_column(String(50), comment="操作人名称（快照）")
    module: Mapped[str | None] = mapped_column(String(50), comment="模块")
    action: Mapped[str | None] = mapped_column(String(50), comment="动作")
    detail: Mapped[str | None] = mapped_column(Text, comment="详情描述")
    ip: Mapped[str | None] = mapped_column(String(45), comment="IP")


class VisitStat(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """访问统计表：按 path 日聚合，stat_date+path 唯一便于 upsert 累加。"""
    __tablename__ = "visit_stat"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stat_date: Mapped[Date] = mapped_column(Date, nullable=False, comment="统计日期")
    path: Mapped[str] = mapped_column(String(255), nullable=False, comment="页面路由")
    pv: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="当日 PV")

    __table_args__ = (
        UniqueConstraint("stat_date", "path", name="uq_visit_stat_date_path"),
    )
