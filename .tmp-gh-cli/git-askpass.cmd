@echo off
echo %1 | findstr /I Username >nul
if %errorlevel%==0 (
  echo x-access-token
) else (
  echo %GITHUB_DEVICE_TOKEN%
)
