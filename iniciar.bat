@echo off
title mhcuidar - Plantoes
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias (so na primeira vez)...
  call npm install
)
if not exist .env (
  echo Criando .env a partir do exemplo...
  copy .env.example .env
)
echo.
echo  mhcuidar - Plantoes: http://localhost:3003
echo  Feche esta janela para parar.
echo.
call npm start
pause
