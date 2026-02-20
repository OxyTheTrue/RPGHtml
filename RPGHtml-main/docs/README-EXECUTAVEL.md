# 🎮 Mastery RPG - Executável Standalone

## 📋 Requisitos

### Obrigatórios
- **Node.js** (versão 16 ou superior) - [Download aqui](https://nodejs.org/)
- **NPM** (geralmente instalado com Node.js)

### Opcionais
- **Git** (para clonar o repositório)

## 🚀 Instalação Rápida

### Windows
1. **Extraia o jogo** em uma pasta de sua escolha
2. **Execute** `start.bat` (duplo clique)
3. **Aguarde** a instalação automática das dependências
4. **Jogue!** 🎲

### macOS/Linux
1. **Extraia o jogo** em uma pasta de sua escolha
2. **Abra o terminal** na pasta do jogo
3. **Execute** `chmod +x start.sh` (dar permissão)
4. **Execute** `./start.sh`
5. **Aguarde** a instalação automática
6. **Jogue!** ⚔️

## 📦 Instalação Manual (se os scripts falharem)

### 1. Instalar Node.js
```bash
# Windows: Baixe e instale em https://nodejs.org/
# macOS: brew install node
# Linux: sudo apt install nodejs npm
```

### 2. Instalar Dependências
```bash
# Na pasta do jogo
npm install
```

### 3. Iniciar o Jogo
```bash
npm start
```

## 🎯 Funcionalidades do Executável

### ✅ Recursos Principais
- **Janela dedicada** - Sem necessidade de navegador
- **Menu personalizado** - Atalhos e opções do jogo
- **Tela cheia** - F11 para modo imersivo
- **Zoom** - Ctrl+/-/0 para ajustar visual
- **Auto-salvamento** - Salva automaticamente antes de fechar
- **Instância única** - Evita múltiplas janelas

### ⌨️ Atalhos
- **Ctrl+N** - Novo Jogo
- **Ctrl+O** - Continuar
- **F11** - Tela Cheia
- **Ctrl+Plus** - Zoom In
- **Ctrl+Minus** - Zoom Out
- **Ctrl+0** - Reset Zoom
- **F12** - Ferramentas de Desenvolvedor

### 📱 Compatibilidade
- **Windows 10/11** - Testado e funcional
- **macOS 10.14+** - Compatível com notches
- **Linux (Ubuntu/Debian)** - Distribuições modernas

## 🔧 Desenvolvimento

### Modo Desenvolvedor
```bash
# Habilitar modo dev
set NODE_ENV=development
npm start
```

### Build para Distribuição
```bash
# Instalar dependências de build
npm install -g electron-builder

# Gerar executável
npm run build

# Executáveis ficam na pasta /dist
```

## 📁 Estrutura de Arquivos

```
RPGHtml-main/
├── index.html          # Página principal do jogo
├── main.js            # Processo principal do Electron
├── preload.js         # Script de segurança
├── package.json       # Configuração do projeto
├── start.bat          # Launcher Windows
├── start.sh           # Launcher macOS/Linux
├── js/               # Scripts do jogo
├── css/              # Estilos do jogo
├── assets/            # Imagens e sons
└── node_modules/      # Dependências (gerado)
```

## 🐛 Solução de Problemas

### Problemas Comuns

**"Node.js não encontrado"**
- Baixe e instale o Node.js em https://nodejs.org/
- Reinicie o computador após instalação

**"Falha ao instalar dependências"**
- Verifique conexão com internet
- Execute como administrador (Windows)
- Limpe cache: `npm cache clean --force`

**"Jogo não abre"**
- Verifique se antivírus está bloqueando
- Execute como administrador
- Desabilite software de segurança temporariamente

**"Tela preta"**
- Aguarde carregamento inicial
- Verifique console de erros (F12)
- Reinstale dependências

### Logs e Debug
- **Windows**: Logs em `%APPDATA%/mastery-rpg/logs/`
- **macOS**: Logs em `~/Library/Logs/mastery-rpg/`
- **Linux**: Logs em `~/.local/share/mastery-rpg/logs/`

## 📄 Licença

MIT License - Software livre para modificação e distribuição

## 🤝 Contribuição

1. Fork do projeto
2. Branch para sua feature
3. Pull Request
4. Agradecemos sua contribuição! 🎉

---

**Divirta-se jogando Mastery RPG!** 🎲⚔️✨
