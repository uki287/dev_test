# ============================================================
# 文件功能：内容域管理接口的请求/响应 Schema（Pydantic v2）
# 覆盖资源：banner / product_series / product / news / job /
#           about_info / about_timeline / company_info / system_settings
# 说明：
#   - 字段名严格对齐数据库模型与原型 STORE（方案 §7，零漂移）；
#   - Out 模型开启 from_attributes=True，可直接从 ORM 对象序列化；
#   - 时间字段允许 None（起止时间/发布时间/截止时间，NULL 表示不限制）。
# 权威依据：数据库设计文档 §4.2 + 实施方案 Phase C（后台内容管理）。
# ============================================================
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.security import clean_html


# ---------- 轮播图 Banner ----------
class BannerBase(BaseModel):
    """轮播图公共字段（新增/编辑共用）。"""
    title: Optional[str] = Field(None, max_length=120, description="标题（选填）")
    image: str = Field(..., description="图片路径")
    link_url: Optional[str] = Field(None, max_length=512, description="跳转链接（主题联动）")
    start_at: Optional[datetime] = Field(None, description="开始时间（NULL=长期）")
    end_at: Optional[datetime] = Field(None, description="结束时间（超出自动隐藏）")
    sort: int = Field(0, description="排序，小值在前")
    is_activate: int = Field(1, description="1启用/0停用")

    @field_validator("start_at", "end_at", mode="before")
    @classmethod
    def _empty_str_to_none(cls, v):
        """防御性：空字符串/纯空白视为 None（前端 DatePicker 清空边界）。"""
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v


class BannerCreate(BannerBase):
    """新增轮播图：图片必填。"""
    pass


class BannerUpdate(BannerBase):
    """编辑轮播图：全字段可选（部分更新）；start_at/end_at/sort 继承自 BannerBase 含空串兼容。"""
    title: Optional[str] = Field(None, max_length=120)
    image: Optional[str] = Field(None)
    link_url: Optional[str] = Field(None, max_length=512)
    is_activate: Optional[int] = Field(None, description="1启用/0停用（停用前校验启用数）")


class BannerOut(BannerBase):
    """轮播图输出：含主键与审计时间。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_date: Optional[datetime] = None
    update_date: Optional[datetime] = None


# ---------- 产品系列 ProductSeries ----------
class SeriesBase(BaseModel):
    """产品系列公共字段。"""
    name: str = Field(..., max_length=80, description="系列名称")
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    sort: int = Field(0, description="排序")
    is_activate: int = Field(1, description="1启用/0停用")


class SeriesCreate(SeriesBase):
    pass


class SeriesUpdate(BaseModel):
    """编辑产品系列：全字段可选。"""
    name: Optional[str] = Field(None, max_length=80)
    cover_image: Optional[str] = None
    description: Optional[str] = None
    sort: Optional[int] = None
    is_activate: Optional[int] = None


class SeriesOut(SeriesBase):
    """产品系列输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 产品 Product ----------
class ProductBase(BaseModel):
    """产品公共字段：spec/images/related_products 为 JSON 结构化数据。"""
    category_id: Optional[int] = Field(None, description="空间分类ID")
    series_id: Optional[int] = Field(None, description="系列ID")
    product_code: str = Field(..., max_length=64, description="产品编号（唯一）")
    name: str = Field(..., max_length=120, description="产品名称")
    description: Optional[str] = Field(None, description="产品描述（富文本）")
    spec: Optional[Dict[str, Any]] = Field(None, description="规格参数（结构化键值）")

    @field_validator("description")
    @classmethod
    def _clean_description(cls, v):
        return clean_html(v)
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图")
    images: Optional[List[str]] = Field(None, description="其他图片 url 数组")
    pub_status: str = Field("draft", description="on_shelf/off_shelf/draft")
    is_top: bool = Field(False, description="首页推荐/置顶")
    sort: int = Field(0, description="排序")
    related_products: Optional[List[int]] = Field(None, description="搭配产品 ID 数组（2-4）")
    price_desc: Optional[str] = Field(None, max_length=255, description="价格说明（不存真实价格）")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """编辑产品：全字段可选。"""
    category_id: Optional[int] = None
    series_id: Optional[int] = None
    product_code: Optional[str] = Field(None, max_length=64)
    name: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = None
    spec: Optional[Dict[str, Any]] = None
    cover_image: Optional[str] = None
    images: Optional[List[str]] = None
    pub_status: Optional[str] = None
    is_top: Optional[bool] = None
    sort: Optional[int] = None
    related_products: Optional[List[int]] = None
    price_desc: Optional[str] = None

    @field_validator("description")
    @classmethod
    def _clean_description(cls, v):
        return clean_html(v)


class ProductOut(ProductBase):
    """产品输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    views: int = 0
    created_date: Optional[datetime] = None
    update_date: Optional[datetime] = None


class ProductBatchStatus(BaseModel):
    """批量上下架请求：ids + 目标状态。"""
    ids: List[int] = Field(..., min_length=1, description="产品 ID 列表")
    pub_status: str = Field(..., pattern="^(on_shelf|off_shelf)$", description="目标状态")


# ---------- 新闻 News ----------
class NewsBase(BaseModel):
    """新闻公共字段。"""
    category: str = Field(..., pattern="^(industry|company)$", description="industry/company")
    title: str = Field(..., max_length=200, description="标题")
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图")
    images: Optional[List[str]] = Field(None, description="图集（多图 url 数组，第一张为封面）")
    summary: Optional[str] = Field(None, max_length=500, description="摘要")
    content: Optional[str] = Field(None, description="正文（富文本）")
    source: Optional[str] = Field(None, max_length=200, description="来源")
    author: Optional[str] = Field(None, max_length=50, description="作者")
    is_top: bool = Field(False, description="是否置顶")
    sort: int = Field(0, description="排序")
    pub_status: str = Field("draft", description="draft/published/offline")
    published_at: Optional[datetime] = Field(None, description="发布时间")
    expired_at: Optional[datetime] = Field(None, description="截止时间")

    @field_validator("content")
    @classmethod
    def _clean_content(cls, v):
        return clean_html(v)


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    """编辑新闻：全字段可选。"""
    category: Optional[str] = None
    title: Optional[str] = Field(None, max_length=200)
    cover_image: Optional[str] = None
    images: Optional[List[str]] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    author: Optional[str] = None
    is_top: Optional[bool] = None
    sort: Optional[int] = None
    pub_status: Optional[str] = None
    published_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None

    @field_validator("content")
    @classmethod
    def _clean_content(cls, v):
        return clean_html(v)


class NewsOut(NewsBase):
    """新闻输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    views: int = 0
    created_date: Optional[datetime] = None
    update_date: Optional[datetime] = None


# ---------- 招聘 Job ----------
class JobBase(BaseModel):
    """招聘岗位公共字段。"""
    category: str = Field(..., pattern="^(industry|campus)$", description="industry/campus")
    title: str = Field(..., max_length=120, description="岗位名称")
    count: Optional[int] = Field(None, description="招聘人数")
    location: Optional[str] = Field(None, max_length=120, description="工作地点")
    salary_desc: Optional[str] = Field(None, max_length=255, description="薪资说明")
    duty: Optional[str] = Field(None, description="岗位职责（富文本）")
    requirement: Optional[str] = Field(None, description="任职要求（富文本）")

    @field_validator("duty", "requirement")
    @classmethod
    def _clean_job_rich(cls, v):
        return clean_html(v)
    email: Optional[str] = Field(None, max_length=120, description="投递邮箱")
    sort: int = Field(0, description="排序")
    is_activate: int = Field(1, description="1启用/0停用")


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    """编辑招聘岗位：全字段可选。"""
    category: Optional[str] = None
    title: Optional[str] = Field(None, max_length=120)
    count: Optional[int] = None
    location: Optional[str] = None
    salary_desc: Optional[str] = None
    duty: Optional[str] = None
    requirement: Optional[str] = None
    email: Optional[str] = None
    sort: Optional[int] = None
    is_activate: Optional[int] = None

    @field_validator("duty", "requirement")
    @classmethod
    def _clean_job_rich(cls, v):
        return clean_html(v)


class JobOut(JobBase):
    """招聘岗位输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- 关于管理（about_info / about_timeline / company_info） ----------
class AboutInfoUpdate(BaseModel):
    """关于子页内容更新：page_key 单页键值，content 为结构化 JSON。"""
    content: Dict[str, Any] = Field(..., description="子页结构化内容（含 title/blocks）")


class AboutInfoOut(BaseModel):
    """关于子页输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    page_key: str
    content: Optional[Dict[str, Any]] = None


class TimelineBase(BaseModel):
    """时间轴条目公共字段。"""
    type: str = Field(..., pattern="^(history|brand_history)$", description="发展历程/品牌历程")
    year: str = Field(..., max_length=20, description="年份（兼容'2018 至今'）")
    title: str = Field(..., max_length=200, description="事件标题")
    description: Optional[str] = Field(None, max_length=1000, description="描述")
    sort: int = Field(0, description="排序")


class TimelineCreate(TimelineBase):
    pass


class TimelineUpdate(BaseModel):
    """编辑时间轴条目：全字段可选。"""
    type: Optional[str] = None
    year: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    sort: Optional[int] = None


class TimelineOut(TimelineBase):
    """时间轴条目输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int


class CompanyInfoCreate(BaseModel):
    """联系方式/公共信息新增。"""
    info_key: str = Field(..., max_length=50, description="键（唯一）")
    info_value: Optional[str] = Field(None, description="值")
    remark: Optional[str] = Field(None, max_length=255, description="备注")


class CompanyInfoUpdate(BaseModel):
    """编辑公共信息：键不可改，仅值/备注可改。"""
    info_value: Optional[str] = None
    remark: Optional[str] = Field(None, max_length=255)


class CompanyInfoOut(BaseModel):
    """公共信息输出。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    info_key: str
    info_value: Optional[str] = None
    remark: Optional[str] = None


# ---------- 系统设置 system_settings ----------
class SettingsOut(BaseModel):
    """系统设置输出（单行配置）。"""
    model_config = ConfigDict(from_attributes=True)
    site_name: Optional[str] = None
    logo: Optional[str] = None
    icp: Optional[str] = None
    copyright: Optional[str] = None
    slider_interval: int = Field(4, description="轮播间隔（秒），最小 3")
    baidu_map_ak: Optional[str] = Field(None, max_length=255, description="百度地图 JS API AK（前台联系页地图）")
    map_image: Optional[str] = Field(None, max_length=255, description="联系页地图图片（点击跳转百度地图）")


class SettingsUpdate(BaseModel):
    """系统设置更新：全字段可选。"""
    site_name: Optional[str] = Field(None, max_length=120)
    logo: Optional[str] = Field(None, max_length=255)
    icp: Optional[str] = Field(None, max_length=50)
    copyright: Optional[str] = Field(None, max_length=255)
    slider_interval: Optional[int] = Field(None, ge=3, le=60, description="轮播间隔（秒），3-60")
    baidu_map_ak: Optional[str] = Field(None, max_length=255, description="百度地图 JS API AK（前台联系页地图）")
    map_image: Optional[str] = Field(None, max_length=255, description="联系页地图图片（点击跳转百度地图）")
