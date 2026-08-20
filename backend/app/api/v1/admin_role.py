# ============================================================
# 文件功能：角色管理接口（RBAC 树，Phase D）
# 接口（需 role:* 权限）：
#   GET    /admin/roles                角色列表（含权限码数组）
#   GET    /admin/roles/perm-tree      权限树（全部 SysPermission，层级结构）
#   POST   /admin/roles                新增角色（权限码勾选）
#   PUT    /admin/roles/{id}           编辑（含权限映射整体替换 + 启停）
#   DELETE /admin/roles/{id}           删除（被用户引用时拒绝）
# 权威依据：实施方案 Phase D（角色管理 RBAC 树）+ 数据库设计 §4.1。
# ============================================================
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.auth import SysPermission, SysRole, SysRolePermission, SysUser
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin/roles", tags=["后台-角色"])


class RoleCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="角色编码（机器键）")
    name: str = Field(..., min_length=1, max_length=50, description="角色名称")
    description: str | None = Field(None, max_length=255)
    perms: list[str] = Field(default_factory=list, description="权限码数组")
    is_activate: int = Field(1, description="1启用/0停用")


class RoleUpdate(BaseModel):
    name: str | None = Field(None, max_length=50)
    description: str | None = Field(None, max_length=255)
    perms: list[str] | None = Field(None, description="权限码数组（整体替换）")
    is_activate: int | None = Field(None, description="1启用/0停用")


def _role_perms(db: Session, role_id: int) -> list[str]:
    """按角色返回权限码数组（关联查询）。"""
    rows = (
        db.query(SysPermission.code)
        .join(SysRolePermission, SysRolePermission.permission_id == SysPermission.id)
        .filter(SysRolePermission.role_id == role_id)
        .all()
    )
    return [r[0] for r in rows]


def _replace_role_perms(db: Session, role_id: int, codes: list[str], cur: CurrentUser) -> None:
    """整体替换角色-权限映射：删旧 + 按码插入新映射。"""
    db.query(SysRolePermission).filter(SysRolePermission.role_id == role_id).delete()
    if codes:
        perm_ids = [p.id for p in db.query(SysPermission).filter(SysPermission.code.in_(codes)).all()]
        for pid in perm_ids:
            db.add(SysRolePermission(role_id=role_id, permission_id=pid,
                                     created_at=cur.user.username, update_at=cur.user.username))


@router.get("/perm-tree", response_model=ApiResp)
def perm_tree(
    _: CurrentUser = Depends(require_perm("role:list")),
    db: Session = Depends(get_db),
):
    """权限树：返回全部 SysPermission（前端 Tree 组件勾选）。"""
    perms = db.query(SysPermission).order_by(SysPermission.sort.asc(), SysPermission.id.asc()).all()
    # 构建 id -> node，再按 parent_id 挂载子节点
    node_map = {}
    for p in perms:
        node_map[p.id] = {"id": p.id, "code": p.code, "name": p.name, "type": p.type, "children": []}
    roots = []
    for p in perms:
        node = node_map[p.id]
        if p.parent_id and p.parent_id in node_map:
            node_map[p.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return ApiResp.ok(data={"tree": roots, "all": [node_map[p.id] for p in perms]})


@router.get("", response_model=ApiResp)
def list_roles(
    _: CurrentUser = Depends(require_perm("role:list")),
    db: Session = Depends(get_db),
):
    """角色列表：含权限码数组与启用状态。"""
    roles = db.query(SysRole).order_by(SysRole.id.asc()).all()
    out = [{
        "id": r.id, "code": r.code, "name": r.name, "description": r.description,
        "is_activate": r.is_activate, "perms": _role_perms(db, r.id),
    } for r in roles]
    return ApiResp.ok(data=out)


@router.post("", response_model=ApiResp)
def create_role(
    body: RoleCreate,
    cur: CurrentUser = Depends(require_perm("role:create")),
    db: Session = Depends(get_db),
):
    """新增角色：编码唯一；权限映射整体写入。"""
    if db.query(SysRole).filter(SysRole.code == body.code).first():
        return ApiResp.fail(code=40001, message="角色编码已存在")
    role = SysRole(code=body.code, name=body.name, description=body.description,
                   is_activate=body.is_activate,
                   created_at=cur.user.username, update_at=cur.user.username)
    db.add(role)
    db.flush()
    _replace_role_perms(db, role.id, body.perms, cur)
    db.commit()
    return ApiResp.ok(data={"id": role.id, "code": role.code}, message="新增成功")


@router.put("/{role_id}", response_model=ApiResp)
def update_role(
    role_id: int,
    body: RoleUpdate,
    cur: CurrentUser = Depends(require_perm("role:update")),
    db: Session = Depends(get_db),
):
    """编辑角色：名称/描述/启停；perms 传入时整体替换权限映射。"""
    role = db.get(SysRole, role_id)
    if not role:
        return ApiResp.fail(code=40001, message="角色不存在")
    # 内置角色保护：禁止停用最后一个启用超管角色
    if body.is_activate == 0 and role.code == "super_admin":
        active_super = (
            db.query(SysUser)
            .filter(SysUser.role_id == role.id, SysUser.is_activate == 1,
                )
            .count()
        )
        if active_super > 0:
            return ApiResp.fail(code=40001, message="存在启用中的超管用户，不能停用该角色")
    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.is_activate is not None:
        role.is_activate = body.is_activate
    if body.perms is not None:
        _replace_role_perms(db, role.id, body.perms, cur)
    role.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="更新成功")


@router.delete("/{role_id}", response_model=ApiResp)
def delete_role(
    role_id: int,
    cur: CurrentUser = Depends(require_perm("role:delete")),
    db: Session = Depends(get_db),
):
    """删除角色：存在用户引用时拒绝（防误删导致账号失去角色）。"""
    role = db.get(SysRole, role_id)
    if not role:
        return ApiResp.fail(code=40001, message="角色不存在")
    if db.query(SysUser).filter(SysUser.role_id == role_id).first():
        return ApiResp.fail(code=40001, message="该角色仍被管理员使用，不能删除")
    # 权限映射级联删除
    db.query(SysRolePermission).filter(SysRolePermission.role_id == role_id).delete()
    db.delete(role)
    db.commit()
    return ApiResp.ok(message="删除成功")
