@echo off
chcp 65001 >nul
echo ========================================
echo VirtualWife 本地开发环境启动脚本
echo ========================================
echo.

cd /d "%~dp0..\..\domain-chatbot"

if not exist "tmp" (
    mkdir tmp
    echo 创建 tmp 目录
)

echo [1/4] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Python，请先安装 Python 3.9+
    pause
    exit /b 1
)

echo [2/4] 检查虚拟环境...
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

echo [3/4] 激活虚拟环境并安装依赖...
call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo [4/4] 启动后端服务...
echo.
echo 后端服务启动中... (端口: 8000)
echo 请在新终端窗口启动前端服务
echo.
python manage.py runserver 0.0.0.0:8000

pause
