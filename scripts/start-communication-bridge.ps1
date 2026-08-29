$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$configPath = Join-Path $projectDir "data\communication-bridge.json"
$secretPath = Join-Path $projectDir "data\communication-bridge-secrets.ps1"
if (-not (Test-Path -LiteralPath $configPath)) { throw "缺少 $configPath，请先复制示例配置" }
if (-not (Test-Path -LiteralPath $secretPath)) { throw "缺少 $secretPath，请填写应用专用密码" }
. $secretPath
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "C:\Users\info\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" }
Set-Location -LiteralPath $projectDir
& $node "scripts\communication-bridge.mjs" --watch
