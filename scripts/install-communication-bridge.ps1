$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$secretPath = Join-Path $projectDir "data\communication-bridge-secrets.ps1"
if (-not (Test-Path -LiteralPath $secretPath)) { throw "请先创建本机桥接密钥文件" }
. $secretPath
$required = @(
  "MAIL_ANNE_SKINCAREPKG_PASSWORD",
  "MAIL_CHRISTINA_SKINCAREPKG_PASSWORD",
  "MAIL_CHRISTINA_BEAUTYTOOLS_PASSWORD",
  "MAIL_CHRISTINA_ACFOLDINGBOX_PASSWORD",
  "MAIL_ANNE_OCEANPACKAGINGS_PASSWORD",
  "MAIL_ANGELA_SKINCAREFORM_PASSWORD"
)
$configured = $required | Where-Object { [Environment]::GetEnvironmentVariable($_, "Process") }
if (-not $configured.Count) { throw "至少需要填写一个邮箱的应用专用密码" }
$starter = Join-Path $projectDir "scripts\start-communication-bridge.ps1"
$runCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starter`""
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name "AnneCRMCommunicationBridge" -Value $runCommand -Type String
Write-Output "已安装 Anne CRM 本机通信桥接，将在当前用户登录 Windows 后自动运行。"
