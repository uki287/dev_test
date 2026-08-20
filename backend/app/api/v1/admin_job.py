# ============================================================
# 文件功能：招聘管理接口
# 接口（需 job:* 权限）：
#   GET    /admin/jobs        分页列表（可选 category 过滤）
#   POST   /admin/jobs        新增
#   PUT    /admin/jobs/{id}   编辑（含启用停用）
#   DELETE /admin/jobs/{id}   软删
#   POST   /admin/jobs/{id}/duplicate  复制（生成副本）
# 权威依据：实施方案 Phase C §5（招聘管理）+ 数据库设计 §4.2。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.content import Job
from app.schemas.content import JobCreate, JobOut, JobUpdate
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/jobs", tags=["后台-招聘"])

_PAGE_SIZE_MAX = 50


@router.get("", response_model=ApiResp)
def list_jobs(
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    _: CurrentUser = Depends(require_perm("job:list")),
    db: Session = Depends(get_db),
):
    """招聘岗位分页列表：支持行业/校园筛选。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(Job).filter(Job.deleted_at.is_(None))
    if category:
        q = q.filter(Job.category == category)
    total = q.count()
    items = (
        q.order_by(Job.sort.asc(), Job.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # 统一分页结构；ORM → Out 序列化
    return ApiResp.page(
        [JobOut.model_validate(i) for i in items], total, page, page_size
    )


@router.post("", response_model=ApiResp)
def create_job(
    body: JobCreate,
    cur: CurrentUser = Depends(require_perm("job:create")),
    db: Session = Depends(get_db),
):
    """新增招聘岗位。"""
    j = Job(**body.model_dump(), created_at=cur.user.username,
            update_at=cur.user.username)
    db.add(j)
    db.commit()
    db.refresh(j)
    return ApiResp.ok(data=JobOut.model_validate(j), message="新增成功")


@router.put("/{job_id}", response_model=ApiResp)
def update_job(
    job_id: int,
    body: JobUpdate,
    cur: CurrentUser = Depends(require_perm("job:update")),
    db: Session = Depends(get_db),
):
    """编辑招聘岗位：部分更新。"""
    j = db.get(Job, job_id)
    if not j or j.deleted_at is not None:
        return ApiResp.fail(code=40001, message="招聘岗位不存在")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(j, field, value)
    j.update_at = cur.user.username
    db.commit()
    db.refresh(j)
    return ApiResp.ok(data=JobOut.model_validate(j), message="更新成功")


@router.delete("/{job_id}", response_model=ApiResp)
def delete_job(
    job_id: int,
    cur: CurrentUser = Depends(require_perm("job:delete")),
    db: Session = Depends(get_db),
):
    """软删招聘岗位。"""
    j = db.get(Job, job_id)
    if not j or j.deleted_at is not None:
        return ApiResp.fail(code=40001, message="招聘岗位不存在")
    j.deleted_at = datetime.now(timezone.utc)
    j.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")


@router.post("/{job_id}/duplicate", response_model=ApiResp)
def duplicate_job(
    job_id: int,
    cur: CurrentUser = Depends(require_perm("job:create")),
    db: Session = Depends(get_db),
):
    """复制招聘岗位：生成独立副本（标题追加「（副本）」）。"""
    src = db.get(Job, job_id)
    if not src or src.deleted_at is not None:
        return ApiResp.fail(code=40001, message="招聘岗位不存在")
    copy = Job(
        category=src.category, title=f"{src.title}（副本）", count=src.count,
        location=src.location, salary_desc=src.salary_desc, duty=src.duty,
        requirement=src.requirement, email=src.email, sort=src.sort + 1,
        is_activate=src.is_activate,
        created_at=cur.user.username, update_at=cur.user.username,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return ApiResp.ok(data=JobOut.model_validate(copy), message="复制成功")
