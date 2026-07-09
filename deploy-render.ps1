$deployHookUrl = $env:RENDER_DEPLOY_HOOK_URL

if (-not $deployHookUrl) {
  Write-Error "Set RENDER_DEPLOY_HOOK_URL before running this script."
  exit 1
}

Invoke-WebRequest -Uri $deployHookUrl
Write-Host ""
Write-Host "Deploy request sent to Render."
