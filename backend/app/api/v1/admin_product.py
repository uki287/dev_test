# ============================================================
# 文件功能：产品管理接口（信息+内容一体，JSON 结构化字段）
# 接口（需 product:* 权限）：
#   GET    /admin/products                分页列表（可选 series_id / pub_status / keyword 过滤）
#   POST   /admin/products                新增
#   PUT    /admin/products/{id}           编辑（部分更新）
#   DELETE /admin/products/{id}           软删
#   POST   /admin/products/batch-status   批量上下架
#   POST   /admin/products/{id}/duplicate 复制（生成副本）
# 业务规则：
#   - spec 为结构化键值 JSON（支持自定义扩展项）；
#   - images 为多图 url 数组（顺序即展示顺序，前端拖拽排序后整体提交）；
#   - related_products 搭配产品 ID 数组：非空时校验 2-4 个（方案 Phase C）；
#   - product_code 唯一（复制时自动追加后缀）。
# 权威依据：实施方案 Phase C §5（产品管理）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.content import Product
from app.schemas.content import (
    ProductBatchStatus, ProductCreate, ProductOut, ProductUpdate,
)
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/products", tags=["后台-产品"])

_PAGE_SIZE_MAX = 50


def _validate_related(related: list[int] | None) -> str | None:
    """
    搭配产品校验：非空时数量须在 2-4 之间（方案 Phase C）。
    返回错误提示；None 表示通过。
    """
    if related and not (2 <= len(related) <= 4):
        return "搭配产品数量须为 2-4 个"
    return None


@router.get("", response_model=ApiResp)
def list_products(
    page: int = 1,
    page_size: int = 20,
    series_id: int | None = None,
    pub_status: str | None = None,
    keyword: str | None = None,
    _: CurrentUser = Depends(require_perm("product:list")),
    db: Session = Depends(get_db),
):
    """产品分页列表：支持系列 / 状态 / 关键字（名称或编号模糊）筛选。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(Product).filter(Product.deleted_at.is_(None))
    if series_id:
        q = q.filter(Product.series_id == series_id)
    if pub_status:
        q = q.filter(Product.pub_status == pub_status)
    if keyword:
        kw = f"%{keyword}%"
        q = q.filter(or_(Product.name.like(kw), Product.product_code.like(kw)))
    total = q.count()
    items = (
        q.order_by(Product.sort.asc(), Product.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # 统一分页结构；ORM → Out 序列化
    return ApiResp.page(
        [ProductOut.model_validate(i) for i in items], total, page, page_size
    )


@router.post("", response_model=ApiResp)
def create_product(
    body: ProductCreate,
    cur: CurrentUser = Depends(require_perm("product:create")),
    db: Session = Depends(get_db),
):
    """新增产品：先做搭配数量校验与编号唯一校验。"""
    # 1) 搭配产品数量校验
    err = _validate_related(body.related_products)
    if err:
        return ApiResp.fail(code=40001, message=err)
    # 2) 产品编号唯一
    if db.query(Product).filter(Product.product_code == body.product_code).first():
        return ApiResp.fail(code=40001, message="产品编号已存在")
    p = Product(**body.model_dump(), created_at=cur.user.username,
                update_at=cur.user.username)
    db.add(p)
    db.commit()
    db.refresh(p)
    return ApiResp.ok(data=ProductOut.model_validate(p), message="新增成功")


@router.put("/{product_id}", response_model=ApiResp)
def update_product(
    product_id: int,
    body: ProductUpdate,
    cur: CurrentUser = Depends(require_perm("product:update")),
    db: Session = Depends(get_db),
):
    """编辑产品：部分更新；编号唯一与搭配数量校验。"""
    p = db.get(Product, product_id)
    if not p or p.deleted_at is not None:
        return ApiResp.fail(code=40001, message="产品不存在")
    # 编号唯一（排除自身）
    new_code = body.product_code
    if new_code is not None and new_code != p.product_code:
        if db.query(Product).filter(
            Product.product_code == new_code, Product.id != product_id
        ).first():
            return ApiResp.fail(code=40001, message="产品编号已存在")
    # 搭配数量校验
    related = body.related_products
    if related is not None:
        err = _validate_related(related)
        if err:
            return ApiResp.fail(code=40001, message=err)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.update_at = cur.user.username
    db.commit()
    db.refresh(p)
    return ApiResp.ok(data=ProductOut.model_validate(p), message="更新成功")


@router.delete("/{product_id}", response_model=ApiResp)
def delete_product(
    product_id: int,
    cur: CurrentUser = Depends(require_perm("product:delete")),
    db: Session = Depends(get_db),
):
    """软删产品。"""
    p = db.get(Product, product_id)
    if not p or p.deleted_at is not None:
        return ApiResp.fail(code=40001, message="产品不存在")
    p.deleted_at = datetime.now(timezone.utc)
    p.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")


@router.post("/batch-status", response_model=ApiResp)
def batch_status(
    body: ProductBatchStatus,
    cur: CurrentUser = Depends(require_perm("product:update")),
    db: Session = Depends(get_db),
):
    """批量上下架：一次性更新多个产品的发布状态。"""
    rows = (
        db.query(Product)
        .filter(Product.id.in_(body.ids), Product.deleted_at.is_(None))
        .all()
    )
    for p in rows:
        p.pub_status = body.pub_status
        p.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message=f"已更新 {len(rows)} 个产品状态")


@router.post("/{product_id}/duplicate", response_model=ApiResp)
def duplicate_product(
    product_id: int,
    cur: CurrentUser = Depends(require_perm("product:create")),
    db: Session = Depends(get_db),
):
    """复制产品：生成独立副本（编号追加 -copy，名称追加「（副本）」）。"""
    src = db.get(Product, product_id)
    if not src or src.deleted_at is not None:
        return ApiResp.fail(code=40001, message="产品不存在")
    new_code = f"{src.product_code}-copy"
    # 编号冲突时追加序号，保证唯一
    n = 1
    while db.query(Product).filter(Product.product_code == new_code).first():
        n += 1
        new_code = f"{src.product_code}-copy{n}"
    copy = Product(
        category_id=src.category_id, series_id=src.series_id,
        product_code=new_code, name=f"{src.name}（副本）",
        description=src.description, spec=src.spec, cover_image=src.cover_image,
        images=src.images, pub_status="draft", is_top=False, sort=src.sort + 1,
        views=0, related_products=src.related_products, price_desc=src.price_desc,
        created_at=cur.user.username, update_at=cur.user.username,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return ApiResp.ok(data=ProductOut.model_validate(copy), message="复制成功")
