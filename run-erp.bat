@echo off
title RangDhara ERP - Production Server
color 0A

echo ==========================================
echo        RangDhara ERP - Starting
echo ==========================================
echo.

cd /d D:\React\Rangdhara\Finaldemo\.next\standalone

if not exist "server.js" (
    echo ERROR: server.js not found!
    echo.
    echo Expected:
    echo D:\React\Rangdhara\Finaldemo\.next\standalone\server.js
    echo.
    pause
    exit /b 1
)

set NODE_ENV=production
set PORT=3000

echo Starting ERP server...
echo.
echo URL: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo ==========================================
echo.

node server.js

echo.
echo ==========================================
echo ERP server stopped.
echo ==========================================
pause