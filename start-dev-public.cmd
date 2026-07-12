@echo off
cd /d "%~dp0"
echo Starting the external viewer sync server.
echo Keep this window open while using external viewer links.
echo.
npm.cmd run dev:public
pause
