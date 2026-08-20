# ============================================================
# 文件功能：ORM 模型包入口
# 说明：统一导入全部模型模块，使所有表注册到 Base.metadata，
#       供 Alembic 自动生成迁移与 create_all 建表使用。
# 导入即注册，无需在调用处逐个 import。
# ============================================================
from app.models.auth import Department, SysPermission, SysRole, SysRolePermission, SysUser
from app.models.business import Appointment, Message, OperationLog, VisitStat
from app.models.content import (
    AboutInfo, AboutTimeline, Banner, CompanyInfo, Job, News, Product,
    ProductCategory, ProductSeries, SystemSettings,
)

# 方便外部 `from app.models import *` 直接拿到全部模型类
__all__ = [
    "Department", "SysUser", "SysRole", "SysPermission", "SysRolePermission",
    "Banner", "ProductCategory", "ProductSeries", "Product", "News", "Job",
    "AboutInfo", "AboutTimeline", "CompanyInfo", "SystemSettings",
    "Appointment", "Message", "OperationLog", "VisitStat",
]
