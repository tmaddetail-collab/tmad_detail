@echo off
title Detail App - Servicos Locais
echo ==========================================
echo   Detail App - Iniciando servicos
echo ==========================================
echo.

start "DetailApp - Backend (8007)" /D "C:\Users\tadeu\OneDrive\Documentos\tmad_detail\backend" "C:\Users\tadeu\AppData\Local\Microsoft\WindowsApps\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8007

start "DetailApp - Frontend (3000)" /D "C:\Users\tadeu\OneDrive\Documentos\tmad_detail\frontend" "C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js --port 3000 --host

echo.
echo Servicos iniciados!
echo Frontend: http://127.0.0.1:3000
echo Backend:  http://127.0.0.1:8007
echo.
echo Para desligar: feche as duas janelas que abriram.
echo.
pause