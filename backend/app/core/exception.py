# ============================================================
# 文件功能：统一异常处理
# 说明：
#   - 将所有异常转换为统一响应体 {code, message, data=null}；
#   - 不向客户端泄露堆栈细节（安全合规：方案 §6 统一异常不泄露）；
#   - 错误码对齐方案 §6 约定（40100 / 40300 / 40001 / 50000 等）。
# ============================================================
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.response import ApiResp


def register_exception_handlers(app: FastAPI) -> None:
    """向 FastAPI 应用注册全局异常处理器（在 main.py 中调用）。"""

    # 1) 业务主动抛出的 HTTPException（如 401 / 403 / 404）
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # code 用 HTTP 状态码 * 100 映射为业务码（仅作占位约定）
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResp.fail(code=exc.status_code * 100, message=str(exc.detail)).model_dump(),
        )

    # 2) 请求参数校验失败（FastAPI 自动校验，状态码 422）
    #    暴露字段路径与原因，便于前端定位（Dev Spec §6 不泄露堆栈，但允许字段名）
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        first = errors[0] if errors else {}
        # 字段路径：过滤 body / query 等外壳，只保留业务字段路径
        loc = ".".join(str(x) for x in first.get("loc", []) if x not in ("body", "query", "path", "header"))
        msg = first.get("msg", "请求参数校验失败")
        # 类型不匹配场景附 expected/actual 提示
        ctx = first.get("ctx") or {}
        ctx_hint = ""
        if "expected" in ctx:
            ctx_hint = f"（期望 {ctx['expected']}）"
        elif "given" in ctx:
            ctx_hint = f"（实际 {ctx['given']}）"
        detail = f"字段 {loc}: {msg}{ctx_hint}" if loc else f"{msg}{ctx_hint}"
        return JSONResponse(
            status_code=422,
            content=ApiResp.fail(code=40001, message=detail, data={"errors": errors}).model_dump(),
        )

    # 3) 兜底：未捕获异常（500）——统一返回，不暴露内部错误
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=ApiResp.fail(code=50000, message="服务器内部错误").model_dump(),
        )
