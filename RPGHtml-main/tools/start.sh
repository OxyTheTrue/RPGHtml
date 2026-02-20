#!/bin/bash

# Mastery RPG Launcher
echo "========================================"
echo "         MASTERY RPG"
echo "========================================"
echo
echo "Iniciando o jogo..."
echo

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Por favor, instale o Node.js em: https://nodejs.org/"
    echo
    read -p "Pressione Enter para sair..."
    exit 1
fi

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo "[ERRO] package.json não encontrado!"
    echo "Certifique-se de estar na pasta correta do jogo."
    echo
    read -p "Pressione Enter para sair..."
    exit 1
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências!"
        read -p "Pressione Enter para sair..."
        exit 1
    fi
    echo "Dependências instaladas com sucesso!"
    echo
fi

# Iniciar o jogo
echo "Iniciando Mastery RPG..."
echo
npm start

if [ $? -ne 0 ]; then
    echo
    echo "[ERRO] Falha ao iniciar o jogo!"
    read -p "Pressione Enter para sair..."
    exit 1
fi

echo
echo "Jogo encerrado."
read -p "Pressione Enter para sair..."
