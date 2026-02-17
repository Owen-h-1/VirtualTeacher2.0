@echo off
chcp 65001 >nul
echo ========================================
echo VirtualWife 前端开发环境启动脚本
echo ========================================
echo.

cd /d "%~dp0..\..\domain-chatvrm"

echo [1/3] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Node.js，请先安装 Node.js 16+
    pause
    exit /b 1
)

echo [2/3] 安装依赖...
if not exist "node_modules" (
    echo 首次运行，安装依赖...
    npm install
) else (
    echo 依赖已安装，检查更新...
    npm install --prefer-offline --no-audit
)

echo [3/3] 启动前端开发服务器...
echo.
echo 前端服务启动中... (端口: 3000)
echo 请确保后端服务已在端口 8000 运行
echo.
npm run dev

pause
