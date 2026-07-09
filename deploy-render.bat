@echo off
if "%RENDER_DEPLOY_HOOK_URL%"=="" (
  echo Set RENDER_DEPLOY_HOOK_URL before running this script.
  exit /b 1
)

curl "%RENDER_DEPLOY_HOOK_URL%"
echo.
echo Deploy request sent to Render.
