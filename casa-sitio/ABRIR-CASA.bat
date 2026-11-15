@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
 start "" "http://localhost:8080/#lavanderia"
 node servidor.js
) else (
 echo Node.js nao encontrado. Instale Node.js 18+ ou abra via servidor Python.
 pause
)
