# ============================================================
# 文件功能：统一响应体 ApiResp
# 说明：
#   - 所有接口统一返回 {code, message, data}；
#   - code = 0 表示成功，非 0 为业务/错误码（方案 §6 错误码约定）；
#   - 使用泛型 T 约束 data 类型，便于类型检查与前端推导。
# 这是前后端数据契约的基础结构（方案 §6 接口约定）。
# ============================================================
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

# 泛型变量：data 字段的具体类型由调用方指定
T = TypeVar("T")


class ApiResp(BaseModel, Generic[T]):
    """统一 API 响应结构（所有接口的出参外壳）。"""

    code: int = 0                  # 0=成功；非0=错误码
    message: str = "success"       # 提示信息
    data: T | None = None          # 业务数据，可为任意结构（含分页包装）

    @classmethod
    def ok(cls, data: Any = None, message: str = "success") -> "ApiResp":
        """构造成功响应。"""
        return cls(code=0, message=message, data=data)

    @classmethod
    def fail(cls, code: int = 50000, message: str = "error", data: Any = None) -> "ApiResp":
        """构造失败响应。"""
        return cls(code=code, message=message, data=data)

    @classmethod
    def page(cls, items: Any, total: int, page: int, page_size: int) -> "ApiResp":
        """
        构造分页响应：把列表与分页元信息包装进 data。
        （方案 §6：分页 ?page&page_size，上限 50）
        """
        return cls(
            code=0,
            data={"items": items, "total": total, "page": page, "page_size": page_size},
        )
