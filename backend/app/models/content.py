# ============================================================
# 文件功能：内容域模型（10 张表）
# 表清单：banner / product_category / product_series / product / news / job /
#         about_info / about_timeline / company_info / system_settings
# 软删规则（§4.0）：内容表（banner/product_category/product_series/product/news/
#         job/about_timeline）含 deleted_at；键值表（about_info/company_info/
#         system_settings）不做软删，停用走 is_activate=0。
# 权威依据：数据库设计文档 V1.2 §4.2。
# ============================================================
from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer,
    JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import ActiveMixin, AuditMixin, Base, SoftDeleteMixin


class Banner(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """轮播图表：软删；删除/停用前需校验剩余启用数 ≥ 1（Dev §6.6）。"""
    __tablename__ = "banner"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str | None] = mapped_column(String(120), comment="标题（选填）")
    image: Mapped[str] = mapped_column(String(255), nullable=False, comment="图片路径")
    link_url: Mapped[str | None] = mapped_column(String(512), comment="跳转链接（站内/外链）")
    start_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="起（NULL 表示长期）")
    end_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="止（超出自动隐藏）")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    __table_args__ = (
        CheckConstraint("end_at IS NULL OR start_at IS NULL OR end_at >= start_at", name="ck_banner_time"),
    )


class ProductCategory(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """产品空间分类表：parent_id 自关联表达可选层级。"""
    __tablename__ = "product_category"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, comment="分类名称（如 客厅）")
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_category.id", ondelete="SET NULL"), comment="上级分类"
    )
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")


class ProductSeries(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """产品系列表。"""
    __tablename__ = "product_series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False, comment="系列名称（如 智能照明）")
    cover_image: Mapped[str | None] = mapped_column(String(255), comment="封面图")
    description: Mapped[str | None] = mapped_column(String(500), comment="描述")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")


class Product(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """产品表：信息+内容一体，spec/images/related_products 为 JSON。"""
    __tablename__ = "product"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_category.id", ondelete="SET NULL"), comment="所属空间分类"
    )
    series_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_series.id", ondelete="SET NULL"), comment="所属系列"
    )
    product_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment="产品编号/产品ID")
    name: Mapped[str] = mapped_column(String(120), nullable=False, comment="产品名称")
    description: Mapped[str | None] = mapped_column(Text, comment="产品描述（富文本）")
    spec: Mapped[dict | None] = mapped_column(JSON, comment="规格参数（JSON 键值）")
    cover_image: Mapped[str | None] = mapped_column(String(255), comment="封面图片 url")
    images: Mapped[list | None] = mapped_column(JSON, comment="其他图片 url 数组")
    pub_status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, comment="发布状态")
    is_top: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="置顶/首页推荐")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="浏览量")
    related_products: Mapped[list | None] = mapped_column(JSON, comment="搭配产品 ID 数组（2-4）")
    price_desc: Mapped[str | None] = mapped_column(String(255), comment="价格说明文本（不存真实价格）")

    __table_args__ = (
        CheckConstraint(
            "pub_status IN ('on_shelf','off_shelf','draft')", name="ck_product_pub_status"
        ),
    )


class News(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """新闻表：category 取值 industry/company；pub_status 发布工作流。"""
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False, comment="industry/company")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="标题")
    cover_image: Mapped[str | None] = mapped_column(String(255), comment="封面图 url")
    images: Mapped[list | None] = mapped_column(JSON, comment="图集（多图 url 数组，第一张为封面）")
    summary: Mapped[str | None] = mapped_column(String(500), comment="摘要")
    content: Mapped[str | None] = mapped_column(Text, comment="正文（富文本）")
    source: Mapped[str | None] = mapped_column(String(200), comment="来源（转载标注）")
    author: Mapped[str | None] = mapped_column(String(50), comment="作者")
    is_top: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="是否置顶")
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="浏览量")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")
    pub_status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, comment="发布状态")
    published_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="发布时间")
    expired_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), comment="截止时间")

    __table_args__ = (
        CheckConstraint("category IN ('industry','company')", name="ck_news_category"),
        CheckConstraint(
            "pub_status IN ('draft','published','offline')", name="ck_news_pub_status"
        ),
    )


class Job(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """招聘岗位表。"""
    __tablename__ = "job"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False, comment="industry/campus")
    title: Mapped[str] = mapped_column(String(120), nullable=False, comment="岗位名称")
    count: Mapped[int | None] = mapped_column(Integer, comment="招聘人数")
    location: Mapped[str | None] = mapped_column(String(120), comment="工作地点")
    salary_desc: Mapped[str | None] = mapped_column(String(255), comment="薪资说明")
    duty: Mapped[str | None] = mapped_column(Text, comment="岗位职责（富文本）")
    requirement: Mapped[str | None] = mapped_column(Text, comment="任职要求（富文本）")
    email: Mapped[str | None] = mapped_column(String(120), comment="投递邮箱")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    __table_args__ = (
        CheckConstraint("category IN ('industry','campus')", name="ck_job_category"),
    )


class AboutInfo(Base, ActiveMixin, AuditMixin):
    """关于子页内容表：键值表，不做软删；content 为 JSON（富文本/结构化）。"""
    __tablename__ = "about_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    page_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="子页键")
    content: Mapped[dict | None] = mapped_column(JSON, comment="富文本/结构化内容")


class AboutTimeline(Base, ActiveMixin, AuditMixin, SoftDeleteMixin):
    """发展历程 / 品牌历程时间轴表。"""
    __tablename__ = "about_timeline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False, comment="history/brand_history")
    year: Mapped[str] = mapped_column(String(20), nullable=False, comment="年份（兼容'2018 至今'）")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="事件标题")
    description: Mapped[str | None] = mapped_column(String(1000), comment="描述")
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    __table_args__ = (
        CheckConstraint("type IN ('history','brand_history')", name="ck_timeline_type"),
    )


class CompanyInfo(Base, ActiveMixin, AuditMixin):
    """联系方式等公共信息表：键值表，不做软删；全站页脚与联系页共用。"""
    __tablename__ = "company_info"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    info_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="键")
    info_value: Mapped[str | None] = mapped_column(Text, comment="值")
    remark: Mapped[str | None] = mapped_column(String(255), comment="备注")


class SystemSettings(Base, ActiveMixin, AuditMixin):
    """网站设置表：键值表，不做软删；承载站名/Logo/备案/版权/轮播间隔/百度地图 AK/地图图片。"""
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    site_name: Mapped[str | None] = mapped_column(String(120), comment="网站名称")
    logo: Mapped[str | None] = mapped_column(String(255), comment="Logo 路径")
    icp: Mapped[str | None] = mapped_column(String(50), comment="ICP 备案号")
    copyright: Mapped[str | None] = mapped_column(String(255), comment="版权文案")
    slider_interval: Mapped[int] = mapped_column(Integer, default=4, nullable=False, comment="轮播间隔（秒）")
    baidu_map_ak: Mapped[str | None] = mapped_column(String(255), comment="百度地图 JS API AK（前台联系页地图）")
    map_image: Mapped[str | None] = mapped_column(String(255), comment="联系页地图图片（点击跳转百度地图）")
