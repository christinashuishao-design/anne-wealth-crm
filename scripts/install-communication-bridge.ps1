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
$missing = $required | Where-Object { -not [Environment]::GetEnvironmentVariable($_, "Process") }
if ($missing.Count) { throw "以下邮箱尚未填写应用专用密码：$($missing -join ', ')" }
$starter = Join-Path $projectDir "scripts\start-communication-bridge.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starter`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 30)
Register-ScheduledTask -TaskName "Anne CRM Communication Bridge" -Action $action -Trigger $trigger -Settings $settings -Description "只读同步企业邮箱到 Anne CRM" -Force | Out-Null
Write-Output "已安装 Anne CRM 本机通信桥接，将在登录 Windows 后自动运行。"
