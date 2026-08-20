# ============================================================
# 文件功能：业务域管理接口 Schema（预约 / 留言）
# 说明：
#   - 列表输出手机号**脱敏**（138****1234），详情输出明文（S-07 隐私最小化）；
#   - 状态流转请求复用 StatusUpdate（status + handle_remark）。
# 权威依据：实施方案 Phase D（预约/留言管理）+ 数据库设计 §4.3。
# ============================================================
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def mask_phone(phone: str | None) -> str | None:
    """手机号脱敏：138****1234；非 11 位时保守处理（仅保留首尾各 1 位）。"""
    if not phone:
        return None
    if len(phone) == 11:
        return f"{phone[:3]}****{phone[-4:]}"
    if len(phone) >= 8:
        return f"{phone[0]}****{phone[-1]}"
    return "****"


# ---------- 预约 Appointment ----------
class AppointmentStatusUpdate(BaseModel):
    """预约状态流转 + 处理备注。"""
    status: str = Field(..., pattern="^(pending|confirmed|completed|cancelled)$", description="目标状态")
    handle_remark: Optional[str] = Field(None, max_length=500, description="处理备注")


class AppointmentBatchUpdate(BaseModel):
    """批量标记：目标状态 + 备注（应用到多个预约）。"""
    ids: list[int] = Field(..., min_length=1)
    status: str = Field(..., pattern="^(pending|confirmed|completed|cancelled)$")


class AppointmentOut(BaseModel):
    """预约列表输出（手机号脱敏）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: Optional[str] = None            # 脱敏
    appt_type: str
    appt_date: Optional[date] = None
    appt_slot: Optional[str] = None
    remark: Optional[str] = None
    status: str
    source_page: Optional[str] = None
    created_date: Optional[datetime] = None


class AppointmentDetailOut(BaseModel):
    """预约详情输出（手机号明文，需 appointment:handle 权限查看）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    appt_type: str
    appt_date: Optional[date] = None
    appt_slot: Optional[str] = None
    remark: Optional[str] = None
    source_page: Optional[str] = None
    status: str
    handle_remark: Optional[str] = None
    handler_id: Optional[int] = None
    handled_at: Optional[datetime] = None
    created_date: Optional[datetime] = None


# ---------- 留言 Message ----------
class MessageStatusUpdate(BaseModel):
    """留言状态流转 + 处理备注。"""
    status: str = Field(..., pattern="^(pending|processed|closed)$", description="目标状态")
    handle_remark: Optional[str] = Field(None, max_length=500, description="处理备注")


class MessageBatchUpdate(BaseModel):
    """批量标记。"""
    ids: list[int] = Field(..., min_length=1)
    status: str = Field(..., pattern="^(pending|processed|closed)$")


class MessageOut(BaseModel):
    """留言列表输出（手机号脱敏）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: Optional[str] = None            # 脱敏
    type: str
    content: str
    product_id: Optional[int] = None
    status: str
    source_page: Optional[str] = None
    created_date: Optional[datetime] = None


class MessageDetailOut(BaseModel):
    """留言详情输出（明文 + 来源产品名）。"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    type: str
    content: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None     # 来源产品名（弱关联）
    source_page: Optional[str] = None
    status: str
    handle_remark: Optional[str] = None
    handler_id: Optional[int] = None
    handled_at: Optional[datetime] = None
    created_date: Optional[datetime] = None
