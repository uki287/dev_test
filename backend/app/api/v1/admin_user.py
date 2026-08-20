# ============================================================
# 文件功能：管理员账号管理接口（Phase D）
# 接口（需 user:* 权限）：
#   GET    /admin/users                      分页列表（含角色名）
#   POST   /admin/users                      新增（用户名唯一 + 初始密码 + 角色）
#   PUT    /admin/users/{id}                 编辑（基本信息 / 角色 / 启停）
#   POST   /admin/users/{id}/reset-password  重置密码（管理员代设）
#   DELETE /admin/users/{id}                 软删（保护规则见下）
# 保护规则（PRD §6.7.1）：
#   - 不可删除 / 停用自己（避免锁死）；
#   - 不可删除 / 停用最后一个超级管理员（超管数量为 1 时拦截）。
# 权威依据：实施方案 Phase D（管理员管理）+ PRD §6.7.1。
# ============================================================
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.core.security import hash_password
from app.models.auth import SysRole, SysUser
from app.schemas.response import ApiResp
from pydantic import BaseModel, Field

router = APIRouter(prefix="/admin/users", tags=["后台-管理员"])

_PAGE_SIZE_MAX = 50


# ---------- 出入参（内联定义，避免 schema 文件膨胀） ----------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="登录名（唯一）")
    password: str = Field(..., min_length=6, max_length=64, description="初始密码（≥6 位）")
    cn_name: str | None = Field(None, max_length=64)
    role_id: int | None = Field(None, description="角色ID")
    is_activate: int = Field(1, description="1启用/0停用")


class UserUpdate(BaseModel):
    cn_name: str | None = Field(None, max_length=64)
    role_id: int | None = None
    is_activate: int | None = Field(None, description="1启用/0停用")


class UserResetPwd(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=64, description="新密码（≥6 位）")


def _last_super_admin(db: Session, exclude_id: int | None = None) -> bool:
    """是否只剩 1 个启用中的超管（用于删除/停用保护）。"""
    super_role_ids = [r.id for r in db.query(SysRole).filter(SysRole.code == "super_admin").all()]
    if not super_role_ids:
        return False
    q = db.query(SysUser).filter(
        SysUser.role_id.in_(super_role_ids),
        SysUser.is_activate == 1,
    )
    if exclude_id:
        q = q.filter(SysUser.id != exclude_id)
    return q.count() == 0


@router.get("", response_model=ApiResp)
def list_users(
    page: int = 1,
    page_size: int = 20,
    keyword: str | None = None,
    _: CurrentUser = Depends(require_perm("user:list")),
    db: Session = Depends(get_db),
):
    """管理员分页列表：含角色名。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(SysUser)
    if keyword:
        kw = f"%{keyword}%"
        q = q.filter(or_(SysUser.username.like(kw), SysUser.cn_name.like(kw)))
    total = q.count()
    items = q.order_by(SysUser.id.asc()).offset((page - 1) * page_size).limit(page_size).all()
    role_map = {r.id: r for r in db.query(SysRole).all()}
    out = []
    for u in items:
        role = role_map.get(u.role_id)
        out.append({
            "id": u.id, "username": u.username, "cn_name": u.cn_name,
            "role_id": u.role_id, "role_code": role.code if role else None,
            "role_name": role.name if role else None,
            "is_activate": u.is_activate, "force_pwd": u.force_pwd,
        })
    return ApiResp.page(out, total, page, page_size)


@router.post("", response_model=ApiResp)
def create_user(
    body: UserCreate,
    cur: CurrentUser = Depends(require_perm("user:create")),
    db: Session = Depends(get_db),
):
    """新增管理员：用户名唯一，初始密码 bcrypt 哈希。"""
    if db.query(SysUser).filter(SysUser.username == body.username).first():
        return ApiResp.fail(code=40001, message="用户名已存在")
    u = SysUser(
        username=body.username, password_hash=hash_password(body.password),
        cn_name=body.cn_name, role_id=body.role_id, is_activate=body.is_activate,
        force_pwd=1, created_at=cur.user.username, update_at=cur.user.username,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return ApiResp.ok(data={"id": u.id, "username": u.username}, message="新增成功")


@router.put("/{user_id}", response_model=ApiResp)
def update_user(
    user_id: int,
    body: UserUpdate,
    cur: CurrentUser = Depends(require_perm("user:update")),
    db: Session = Depends(get_db),
):
    """编辑管理员：角色 / 中文名 / 启停（含保护校验）。"""
    u = db.get(SysUser, user_id)
    if not u:
        return ApiResp.fail(code=40001, message="管理员不存在")
    # 保护：停用自己 → 拒绝
    if body.is_activate == 0 and u.id == cur.user.id:
        return ApiResp.fail(code=40001, message="不能停用当前登录账号")
    # 保护：停用最后一个超管 → 拒绝
    if body.is_activate == 0:
        role = db.get(SysRole, u.role_id) if u.role_id else None
        if role and role.code == "super_admin" and _last_super_admin(db, exclude_id=u.id):
            return ApiResp.fail(code=40001, message="至少保留一个启用的超级管理员")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(u, field, value)
    u.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="更新成功")


@router.post("/{user_id}/reset-password", response_model=ApiResp)
def reset_password(
    user_id: int,
    body: UserResetPwd,
    cur: CurrentUser = Depends(require_perm("user:update")),
    db: Session = Depends(get_db),
):
    """管理员代设密码：重置后该用户下次登录强制改密（force_pwd=1）。"""
    u = db.get(SysUser, user_id)
    if not u:
        return ApiResp.fail(code=40001, message="管理员不存在")
    u.password_hash = hash_password(body.new_password)
    u.force_pwd = 1
    u.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="密码已重置，用户下次登录需修改密码")


@router.delete("/{user_id}", response_model=ApiResp)
def delete_user(
    user_id: int,
    cur: CurrentUser = Depends(require_perm("user:delete")),
    db: Session = Depends(get_db),
):
    """删除管理员（保护：不可删自己 / 最后一个超管）。"""
    u = db.get(SysUser, user_id)
    if not u:
        return ApiResp.fail(code=40001, message="管理员不存在")
    if u.id == cur.user.id:
        return ApiResp.fail(code=40001, message="不能删除当前登录账号")
    role = db.get(SysRole, u.role_id) if u.role_id else None
    if role and role.code == "super_admin" and _last_super_admin(db, exclude_id=u.id):
        return ApiResp.fail(code=40001, message="至少保留一个启用的超级管理员")
    # 权限域表无软删：物理删除（关联日志外键 SET NULL 已由 DB 处理）
    u.update_at = cur.user.username
    db.delete(u)
    db.commit()
    return ApiResp.ok(message="删除成功")
