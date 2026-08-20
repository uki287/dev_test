@echo off
rem ============================================================
rem 企业家居官网 - 一键启动脚本（开发环境）
rem 依次启动三个服务（各自独立窗口）：
rem   backend  :8000  FastAPI 后端（uvicorn --reload）
rem   frontend :5173  前台官网（Vite dev）
rem   admin    :5174  后台管理（Vite dev）
rem 用法：双击本文件即可；停止 = 关闭对应窗口。
rem ============================================================
cd /d "%~dp0"

echo [1/3] 启动后端 API  (http://localhost:8000) ...
start "backend-8000" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo [2/3] 启动前台官网  (http://localhost:5173) ...
start "frontend-5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] 启动后台管理  (http://localhost:5174) ...
start "admin-5174" cmd /k "cd /d %~dp0admin && npm run dev"

echo.
echo 全部启动完成！浏览器访问：
echo   前台官网: http://localhost:5173
echo   后台管理: http://localhost:5174   (账号 admin / admin123)
echo.
pause
