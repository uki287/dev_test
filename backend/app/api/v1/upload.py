# ============================================================
# 文件功能：文件上传接口 POST /admin/upload
# 说明：
#   - 需登录；白名单 jpg/png/webp/gif；单文件 ≤ MAX_UPLOAD_MB；
#   - UUID 重命名落 UPLOAD_DIR（Nginx 不执行由部署阶段落实，方案 D-03）；
#   - 防穿越：仅取扩展名，不使用原始文件名。
# 权威依据：实施方案 Phase B §5（上传）。
# ============================================================
import os
import uuid

from fastapi import APIRouter, Depends, UploadFile

from app.core.config import settings
from app.core.deps import get_current_user
from app.schemas.response import ApiResp

router = APIRouter(prefix="/admin", tags=["上传"])

_ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


@router.post("/upload", response_model=ApiResp)
async def admin_upload(
    file: UploadFile,
    _: object = Depends(get_current_user),
):
    """后台文件上传：校验类型与大小，UUID 重命名保存，返回可访问 URL。"""
    # 1) 扩展名白名单
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED:
        return ApiResp.fail(code=40001, message="不支持的文件类型，仅允许 jpg/png/webp/gif")
    # 2) 大小限制
    data = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        return ApiResp.fail(code=40001, message=f"文件超过 {settings.MAX_UPLOAD_MB}MB 上限")
    # 3) 落盘（UUID 重命名，防穿越）
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    new_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, new_name)
    with open(save_path, "wb") as f:
        f.write(data)
    url = f"/uploads/{new_name}"
    return ApiResp.ok(data={"url": url, "filename": new_name}, message="上传成功")
