@echo off
title Mastery RPG Launcher
echo.
echo  ========================================
echo           MASTERY RPG
echo  ========================================
echo.
echo  Iniciando o jogo...
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado!
    echo  Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verificar se package.json existe
if not exist "package.json" (
    echo  [ERRO] package.json nao encontrado!
    echo  Certifique-se de estar na pasta correta do jogo.
    echo.
    pause
    exit /b 1
)

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo  Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo  [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo  Dependencias instaladas com sucesso!
    echo.
)

REM Iniciar o jogo
echo  Iniciando Mastery RPG...
echo.
npm start

if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Falha ao iniciar o jogo!
    pause
    exit /b 1
)

echo.
echo  Jogo encerrado.
pause
