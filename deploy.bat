@echo off
chcp 65001 >nul
title GUKJUNG Deploy

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        GUKJUNG Schedule Deploy       ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo  [1/4] Kiem tra thay doi...
git status --short
echo.

set /p MSG="  Nhap mo ta thay doi (Enter de bo qua): "
if "%MSG%"=="" set MSG=Update

echo.
echo  [2/4] Staging files...
git add .

echo  [3/4] Commit: %MSG%
git commit -m "%MSG%"

echo  [4/4] Push len GitHub → Vercel tu deploy...
git push

echo.
if %ERRORLEVEL%==0 (
    echo  ✓ THANH CONG! Vercel dang build ~1-2 phut.
    echo  ✓ Web: https://gukjung.vercel.app
) else (
    echo  ✗ Loi! Kiem tra ket noi internet hoac git config.
)

echo.
pause
