# ============================================================
# 文件功能：权限 / 系统域模型（5 张表）
# 表清单：department / sys_user / sys_role / sys_permission / sys_role_permission
# 公共字段：全部继承 ActiveMixin + AuditMixin（本域表不做软删，停用走 is_activate=0）。
# 权威依据：数据库设计文档 V1.2 §4.1。
# ============================================================
from sqlalchemy import CheckConstraint, ForeignKey, Integer, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ActiveMixin, AuditMixin, Base


class Department(Base, ActiveMixin, AuditMixin):
    """部门表：parent_id 自关联表达上级部门（顶级为 NULL）。"""
    __tablename__ = "department"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dept_name: Mapped[str] = mapped_column(String(128), nullable=False, comment="部门名称")
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("department.id", ondelete="SET NULL"), comment="上级部门（自关联）"
    )


class SysUser(Base, ActiveMixin, AuditMixin):
    """管理员账号表：持有单一角色（role_id）+ 部门（dept_id），不做软删。"""
    __tablename__ = "sys_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="登录名（唯一）")
    password_hash: Mapped[str] = mapped_column(String(100), nullable=False, comment="bcrypt 密文")
    cn_name: Mapped[str | None] = mapped_column(String(64), comment="中文名")
    en_name: Mapped[str | None] = mapped_column(String(64), comment="英文名")
    dept_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("department.id", ondelete="SET NULL"), comment="部门编号"
    )
    gender: Mapped[str | None] = mapped_column(String(8), comment="性别：男/女/保密")
    phone: Mapped[str | None] = mapped_column(String(20), comment="手机号")
    email: Mapped[str | None] = mapped_column(String(120), comment="邮箱")
    position: Mapped[str | None] = mapped_column(String(64), comment="岗位")
    role_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sys_role.id", ondelete="SET NULL"), comment="角色编号（单一角色）"
    )
    # 强制改密标记：1=下次登录必须改密（L-04）。方案 Phase B 要求，DB 文档未列，按方案基线增补。
    force_pwd: Mapped[int] = mapped_column(
        SmallInteger, default=0, nullable=False, comment="是否强制改密（1需改/0否）"
    )

    # 性别枚举约束（双库均支持 CHECK）
    __table_args__ = (
        CheckConstraint("gender IS NULL OR gender IN ('男','女','保密')", name="ck_sys_user_gender"),
    )


class SysRole(Base, ActiveMixin, AuditMixin):
    """角色表：code 为机器键（RBAC 映射用），name 为展示名。"""
    __tablename__ = "sys_role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="角色编码（机器键）")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="角色名称")
    description: Mapped[str | None] = mapped_column(String(255), comment="描述")


class SysPermission(Base, ActiveMixin, AuditMixin):
    """权限表：权限树（parent_id 自关联），type 区分菜单/动作。"""
    __tablename__ = "sys_permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="权限码")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="权限名称")
    type: Mapped[str] = mapped_column(String(20), default="action", nullable=False, comment="menu/action")
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sys_permission.id", ondelete="CASCADE"), comment="父权限（权限树）"
    )
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    __table_args__ = (
        CheckConstraint("type IN ('menu','action')", name="ck_sys_permission_type"),
    )


class SysRolePermission(Base, ActiveMixin, AuditMixin):
    """角色-权限关联表：多对多桥接，同角色同权限唯一。"""
    __tablename__ = "sys_role_permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sys_role.id", ondelete="CASCADE"), nullable=False, comment="角色ID"
    )
    permission_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sys_permission.id", ondelete="CASCADE"), nullable=False, comment="权限ID"
    )

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )
