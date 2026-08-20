# ============================================================
# 文件功能：预约 / 留言管理接口（线索闭环，Phase D）
# 预约（appointment:view / handle / export）：
#   GET    /admin/appointments           分页列表（手机号脱敏）
#   GET    /admin/appointments/export    导出 xlsx（openpyxl，脱敏字段）
#   GET    /admin/appointments/{id}      详情（明文，需 handle 权限）
#   PUT    /admin/appointments/{id}/status   状态流转 + 处理备注
#   POST   /admin/appointments/batch-status  批量标记
#   DELETE /admin/appointments/{id}      软删
# 留言（message:view / handle / export）：接口同构，详情含来源产品名。
# 隐私：列表一律脱敏 138****1234，明文仅详情（S-07）；操作日志不存明文手机。
# 权威依据：实施方案 Phase D + 数据库设计 §4.3。
# ============================================================
from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_db, require_perm
from app.models.business import Appointment, Message
from app.models.content import Product
from app.schemas.business import (
    AppointmentBatchUpdate, AppointmentDetailOut, AppointmentOut,
    AppointmentStatusUpdate, MessageBatchUpdate, MessageDetailOut, MessageOut,
    MessageStatusUpdate, mask_phone,
)
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin", tags=["后台-业务"])

_PAGE_SIZE_MAX = 50


def _to_xlsx(headers: list[str], rows: list[list]) -> StreamingResponse:
    """openpyxl 生成 xlsx 并返回流式响应（带 UTF-8 文件名）。"""
    wb = Workbook()
    ws = wb.active
    ws.title = "导出数据"
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename*=UTF-8''export.xlsx"},
    )


# ==================== 预约 Appointment ====================
@router.get("/appointments", response_model=ApiResp)
def list_appointments(
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    appt_type: str | None = None,
    _: CurrentUser = Depends(require_perm("appointment:view")),
    db: Session = Depends(get_db),
):
    """预约分页列表：手机号脱敏（隐私最小化 S-07）。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(Appointment).filter(Appointment.deleted_at.is_(None))
    if status:
        q = q.filter(Appointment.status == status)
    if appt_type:
        q = q.filter(Appointment.appt_type == appt_type)
    total = q.count()
    items = q.order_by(Appointment.created_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    # 列表输出：phone 字段脱敏
    out = []
    for it in items:
        o = AppointmentOut.model_validate(it)
        o.phone = mask_phone(it.phone)
        out.append(o)
    return ApiResp.page(out, total, page, page_size)


@router.get("/appointments/export", response_model=None)
def export_appointments(
    _: CurrentUser = Depends(require_perm("appointment:export")),
    db: Session = Depends(get_db),
):
    """导出预约 xlsx：仅含脱敏手机号（列表口径，S-07）。"""
    items = db.query(Appointment).filter(Appointment.deleted_at.is_(None)).order_by(Appointment.created_date.desc()).all()
    headers = ["ID", "姓名", "手机号", "预约类型", "期望日期", "时段", "状态", "来源页", "提交时间"]
    rows = [[
        it.id, it.name, mask_phone(it.phone) or "",
        it.appt_type, str(it.appt_date or ""), it.appt_slot or "",
        it.status, it.source_page or "",
        it.created_date.strftime("%Y-%m-%d %H:%M") if it.created_date else "",
    ] for it in items]
    return _to_xlsx(headers, rows)


@router.get("/appointments/{appt_id}", response_model=ApiResp)
def appointment_detail(
    appt_id: int,
    _: CurrentUser = Depends(require_perm("appointment:handle")),
    db: Session = Depends(get_db),
):
    """预约详情：手机号明文（仅 handle 权限可见）。"""
    a = db.get(Appointment, appt_id)
    if not a or a.deleted_at is not None:
        return ApiResp.fail(code=40001, message="预约不存在")
    return ApiResp.ok(data=AppointmentDetailOut.model_validate(a))


@router.put("/appointments/{appt_id}/status", response_model=ApiResp)
def update_appointment_status(
    appt_id: int,
    body: AppointmentStatusUpdate,
    cur: CurrentUser = Depends(require_perm("appointment:handle")),
    db: Session = Depends(get_db),
):
    """状态流转 + 处理备注（pending→confirmed→completed/cancelled，支持管理侧回退）。"""
    a = db.get(Appointment, appt_id)
    if not a or a.deleted_at is not None:
        return ApiResp.fail(code=40001, message="预约不存在")
    a.status = body.status
    if body.handle_remark is not None:
        a.handle_remark = body.handle_remark
    a.handler_id = cur.user.id
    a.handled_at = datetime.now(timezone.utc)
    a.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="状态已更新")


@router.post("/appointments/batch-status", response_model=ApiResp)
def batch_appointment_status(
    body: AppointmentBatchUpdate,
    cur: CurrentUser = Depends(require_perm("appointment:handle")),
    db: Session = Depends(get_db),
):
    """批量标记：对多个预约应用目标状态。"""
    rows = db.query(Appointment).filter(Appointment.id.in_(body.ids), Appointment.deleted_at.is_(None)).all()
    for a in rows:
        a.status = body.status
        a.handler_id = cur.user.id
        a.handled_at = datetime.now(timezone.utc)
        a.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message=f"已更新 {len(rows)} 条预约")


@router.delete("/appointments/{appt_id}", response_model=ApiResp)
def delete_appointment(
    appt_id: int,
    cur: CurrentUser = Depends(require_perm("appointment:handle")),
    db: Session = Depends(get_db),
):
    """软删预约。"""
    a = db.get(Appointment, appt_id)
    if not a or a.deleted_at is not None:
        return ApiResp.fail(code=40001, message="预约不存在")
    a.deleted_at = datetime.now(timezone.utc)
    a.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")


# ==================== 留言 Message ====================
@router.get("/messages", response_model=ApiResp)
def list_messages(
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    _: CurrentUser = Depends(require_perm("message:view")),
    db: Session = Depends(get_db),
):
    """留言分页列表：手机号脱敏。"""
    page = max(1, page)
    page_size = min(_PAGE_SIZE_MAX, max(1, page_size))
    q = db.query(Message).filter(Message.deleted_at.is_(None))
    if status:
        q = q.filter(Message.status == status)
    total = q.count()
    items = q.order_by(Message.created_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    out = []
    for it in items:
        o = MessageOut.model_validate(it)
        o.phone = mask_phone(it.phone)
        out.append(o)
    return ApiResp.page(out, total, page, page_size)


@router.get("/messages/export", response_model=None)
def export_messages(
    _: CurrentUser = Depends(require_perm("message:export")),
    db: Session = Depends(get_db),
):
    """导出留言 xlsx：仅含脱敏手机号。"""
    items = db.query(Message).filter(Message.deleted_at.is_(None)).order_by(Message.created_date.desc()).all()
    headers = ["ID", "姓名", "手机号", "类型", "内容", "状态", "来源页", "提交时间"]
    rows = [[
        it.id, it.name, mask_phone(it.phone) or "", it.type, it.content,
        it.status, it.source_page or "",
        it.created_date.strftime("%Y-%m-%d %H:%M") if it.created_date else "",
    ] for it in items]
    return _to_xlsx(headers, rows)


@router.get("/messages/{msg_id}", response_model=ApiResp)
def message_detail(
    msg_id: int,
    _: CurrentUser = Depends(require_perm("message:handle")),
    db: Session = Depends(get_db),
):
    """留言详情：手机号明文 + 来源产品名（弱关联 product）。"""
    m = db.get(Message, msg_id)
    if not m or m.deleted_at is not None:
        return ApiResp.fail(code=40001, message="留言不存在")
    out = MessageDetailOut.model_validate(m)
    if m.product_id:
        p = db.get(Product, m.product_id)
        out.product_name = p.name if p else None
    return ApiResp.ok(data=out)


@router.put("/messages/{msg_id}/status", response_model=ApiResp)
def update_message_status(
    msg_id: int,
    body: MessageStatusUpdate,
    cur: CurrentUser = Depends(require_perm("message:handle")),
    db: Session = Depends(get_db),
):
    """留言状态流转 + 处理备注。"""
    m = db.get(Message, msg_id)
    if not m or m.deleted_at is not None:
        return ApiResp.fail(code=40001, message="留言不存在")
    m.status = body.status
    if body.handle_remark is not None:
        m.handle_remark = body.handle_remark
    m.handler_id = cur.user.id
    m.handled_at = datetime.now(timezone.utc)
    m.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="状态已更新")


@router.post("/messages/batch-status", response_model=ApiResp)
def batch_message_status(
    body: MessageBatchUpdate,
    cur: CurrentUser = Depends(require_perm("message:handle")),
    db: Session = Depends(get_db),
):
    """批量标记留言。"""
    rows = db.query(Message).filter(Message.id.in_(body.ids), Message.deleted_at.is_(None)).all()
    for m in rows:
        m.status = body.status
        m.handler_id = cur.user.id
        m.handled_at = datetime.now(timezone.utc)
        m.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message=f"已更新 {len(rows)} 条留言")


@router.delete("/messages/{msg_id}", response_model=ApiResp)
def delete_message(
    msg_id: int,
    cur: CurrentUser = Depends(require_perm("message:handle")),
    db: Session = Depends(get_db),
):
    """软删留言。"""
    m = db.get(Message, msg_id)
    if not m or m.deleted_at is not None:
        return ApiResp.fail(code=40001, message="留言不存在")
    m.deleted_at = datetime.now(timezone.utc)
    m.update_at = cur.user.username
    db.commit()
    return ApiResp.ok(message="删除成功")
