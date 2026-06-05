# ============================================================
#  灵山胜境 AI数字人 VRM模型 安装脚本
# ============================================================
#  使用方法：在 PowerShell 中运行此脚本
#  需要有网络连接，能访问 GitHub
# ============================================================

$ErrorActionPreference = "Continue"
$modelDir = "E:\LingShan\lingling\installer\vrm-models"
$modelName = "灵山导游.vrm"
$modelPath = Join-Path $modelDir $modelName

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  灵山胜境 AI 数字人 · VRM模型下载工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 创建目录
if (-not (Test-Path $modelDir)) {
    New-Item -ItemType Directory -Path $modelDir -Force | Out-Null
}

# 已存在就跳过
if ((Test-Path $modelPath) -and (Get-Item $modelPath).Length -gt 10000) {
    $size = [math]::Round((Get-Item $modelPath).Length / 1MB, 2)
    Write-Host "[OK] 模型已存在 ($size MB)，跳过下载" -ForegroundColor Green
    Write-Host "     路径: $modelPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "如果 Docker 已启动，重启容器使其生效：" -ForegroundColor Yellow
    Write-Host "  docker-compose restart chatvrm" -ForegroundColor White
    pause
    exit 0
}

Write-Host "正在尝试从以下源下载模型..." -ForegroundColor Yellow
Write-Host ""

$downloaded = $false

# === 下载源列表 ===
$sources = @(
    @{
        Url = "https://github.com/vrm-c/vrm-specification/raw/refs/heads/master/samples/VRM1_Constellation.vrm"
        Label = "VRM官方示例（兜底方案）"
    },
    @{
        Url = "https://raw.githubusercontent.com/vrm-c/vrm-specification/master/samples/VRM1_Constellation.vrm"
        Label = "VRM官方示例-master"
    }
)

foreach ($src in $sources) {
    if ($downloaded) { break }
    Write-Host "  [$($src.Label)]" -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $src.Url -OutFile $modelPath -TimeoutSec 60 -UseBasicParsing
        if ((Test-Path $modelPath) -and (Get-Item $modelPath).Length -gt 10000) {
            Write-Host "  [OK] 下载成功！" -ForegroundColor Green
            $downloaded = $true
        }
    } catch {
        Write-Host "  [X] 失败" -ForegroundColor DarkGray
    }
}

if (-not $downloaded) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  自动下载失败（网络问题或资源不可用）" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按以下步骤手动获取模型：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  >>> 推荐方案: 从 VRoid Hub 获取国风模型 <<<" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. 浏览器打开 https://hub.vroid.com/" -ForegroundColor White
    Write-Host "  2. 搜索 'hanfu' 或 'chinese dress' 或 '国风'" -ForegroundColor White
    Write-Host "  3. 筛选 'Free' 免费模型" -ForegroundColor White
    Write-Host "  4. 下载 .vrm 格式文件" -ForegroundColor White
    Write-Host "  5. 重命名为 '灵山导游.vrm'" -ForegroundColor White
    Write-Host "  6. 放到: $modelDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  >>> 备选: 使用 Booth 平台 <<<" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. 浏览器打开 https://booth.pm/zh-cn" -ForegroundColor White
    Write-Host "  2. 搜索 'VRM 無料' 或 'VRM free'" -ForegroundColor White
    Write-Host "  3. 找风格合适的免费模型下载" -ForegroundColor White
    Write-Host ""
    Write-Host "放置完成后重新运行此脚本即可。" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 0
}

# 验证
$fileSize = [math]::Round((Get-Item $modelPath).Length / 1MB, 2)
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  模型安装完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  文件: $modelPath" -ForegroundColor Cyan
Write-Host "  大小: $fileSize MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  重要提示" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  当前下载的是 VRM 官方通用示例模型。" -ForegroundColor White
Write-Host "  建议替换为国风/汉服风格的模型以匹配灵山主题。" -ForegroundColor White
Write-Host "  优质免费国风VRM模型获取渠道：" -ForegroundColor White
Write-Host "  - VRoid Hub: https://hub.vroid.com/ (搜索 'chinese'/'hanfu')" -ForegroundColor Cyan
Write-Host "  - Booth: https://booth.pm/ (搜索 'vrm free')" -ForegroundColor Cyan
Write-Host ""
Write-Host "  后续步骤：" -ForegroundColor Yellow
Write-Host "  1. 确保 Docker 已启动" -ForegroundColor White
Write-Host "  2. 访问 http://localhost:3000" -ForegroundColor White
Write-Host "  3. 进入设置 -> 角色模型 -> 上传模型" -ForegroundColor White
Write-Host "  4. 选择 '灵山导游.vrm'" -ForegroundColor White
Write-Host ""
pause
