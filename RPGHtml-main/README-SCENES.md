# 🎮 Sistema de Scenes - RPG Game

## 📋 Visão Geral

Sistema completo de gerenciamento de telas/scenes inspirado em engines de jogos como Unity e Godot. Cada tela funciona de forma independente com suas próprias regras e componentes.

## 🏗️ Arquitetura

```
📁 Estrutura de Arquivos
├── index-scene.html          # HTML principal com sistema de scenes
├── scenes.css               # CSS específico para cada scene
├── js/
│   ├── SceneManager.js     # Gerenciador principal de scenes
│   ├── BaseScene.js         # Classes base para scenes e componentes
│   ├── CombatScene.js       # Scene de combate (tela principal)
│   └── ShopScene.js         # Scene da loja (tela secundária)
└── game-scene.html          # Arquivo de inicialização do jogo
```

## 🎬 Como Funciona

### 1. **SceneManager**
- Controla qual scene está ativa
- Gerencia transições entre scenes
- Suporta callbacks de entrada/saída
- Loop de update automático (60 FPS)

### 2. **BaseScene**
- Classe base para todas as scenes
- Sistema de componentes (UI, Game, etc.)
- Ciclo de vida: `init()` → `onEnter()` → `onUpdate()` → `onExit()`

### 3. **Components**
- **UIComponent**: Elementos de interface
- **GameComponent**: Lógica do jogo
- Reutilizáveis entre diferentes scenes

## 🎮 Scenes Disponíveis

### **CombatScene** (`combat`)
- **Função**: Tela principal do jogo
- **Conteúdo**: Arena de combate, HUD, inventário
- **Componentes**:
  - `CombatUIComponent`: Interface de combate
  - `CombatGameComponent`: Lógica de batalha

### **ShopScene** (`shop`)
- **Função**: Tela de compras
- **Conteúdo**: Catálogo de itens, detalhes, compra
- **Componentes**:
  - `ShopUIComponent`: Interface da loja
  - `ShopGameComponent**: Lógica de compras

## 🚀 Como Usar

### **Iniciar o Jogo**
```html
<!-- Usar o arquivo com sistema de scenes -->
<script type="module" src="index-scene.html"></script>
```

### **Mudar de Scene**
```javascript
// Para ir para a loja
await window.sceneManager.changeScene('shop', {
    gameState: meuGameState
});

// Para voltar ao combate
await window.sceneManager.changeScene('combat', {
    gameState: meuGameState
});
```

### **Criar Nova Scene**
```javascript
import { BaseScene } from './BaseScene.js';

class MinhaScene extends BaseScene {
    constructor() {
        super('minha-scene');
    }

    async setupComponents() {
        // Adicionar componentes
        this.addComponent('ui', new MeuUIComponent());
        this.addComponent('game', new MeuGameComponent());
    }

    canTransition(targetScene) {
        // Regras de transição
        return targetScene === 'combat';
    }
}

// Registrar
window.sceneManager.registerScene('minha-scene', {
    element: meuElemento,
    onEnter: (options) => console.log('Entrou'),
    onExit: (options) => console.log('Saiu'),
    onUpdate: () => console.log('Update')
});
```

## 🎯 Características

### ✅ **Independência**
- Cada scene tem seu próprio HTML/CSS
- Componentes isolados
- Estado próprio da scene

### ✅ **Transições Suaves**
- Animações CSS automáticas
- Callbacks de entrada/saída
- Prevenção de múltiplas transições

### ✅ **Ciclo de Vida**
```javascript
// 1. Registro
sceneManager.registerScene('nome', config);

// 2. Entrada
await sceneManager.changeScene('nome');
// → onEnter() é chamado

// 3. Loop (60 FPS)
// → onUpdate() é chamado continuamente

// 4. Saída
await sceneManager.changeScene('outra');
// → onExit() é chamado
```

### ✅ **Component System**
- Reutilização de código
- Separação de responsabilidades
- Fácil manutenção

### ✅ **Estado Global**
- GameState compartilhado entre scenes
- Salvamento automático
- Persistência em localStorage

## 🛠️ Comandos de Debug

Abra o console e use:

```javascript
// Ver scenes disponíveis
gameDebug.showScenes();

// Abrir loja
gameDebug.openShop();

// Voltar ao combate
gameDebug.returnToCombat();

// Salvar jogo
gameDebug.saveGame();

// Carregar jogo
gameDebug.loadGame();

// Alternar elementos legados
gameDebug.toggleLegacy();
```

## 🎨 Estilização

### **CSS Structure**
```css
/* Container principal */
#scene-container { /* Container de todas as scenes */ }

/* Base das scenes */
.scene { /* Todas as scenes */ }
.scene.active { /* Scene ativa */ }

/* Scene específica */
.scene-combat { /* Apenas combat */ }
.scene-shop { /* Apenas shop */ }
```

### **Transições**
- Slide da direita para entrar
- Slide para esquerda para sair
- 0.4s de duração
- Cubic-bezier easing

## 📱 Responsividade

- Breakpoints para mobile/tablet
- Layout adaptativo
- Touch-friendly interactions
- Viewport units modernos

## 🔧 Extensão

### **Adicionar Nova Scene**
1. Criar classe herdando `BaseScene`
2. Implementar métodos obrigatórios
3. Registrar no SceneManager
4. Adicionar CSS específico

### **Criar Componente**
1. Herdar de `UIComponent` ou `GameComponent`
2. Implementar callbacks
3. Adicionar à scene com `addComponent()`

## 🎮 Exemplo Prático

```javascript
// Scene personalizada
class MenuScene extends BaseScene {
    constructor() {
        super('menu');
    }

    async createElement() {
        super.createElement();
        this.element.innerHTML = `
            <div class="menu-container">
                <h1>Menu Principal</h1>
                <button id="start-btn">Iniciar Jogo</button>
                <button id="options-btn">Opções</button>
            </div>
        `;
    }

    async setupComponents() {
        this.addComponent('ui', new MenuUIComponent());
    }

    async onEnter(options) {
        super.onEnter(options);
        console.log('Menu iniciado');
    }
}

// Registrar e usar
window.sceneManager.registerScene('menu', {
    element: document.querySelector('.menu-container'),
    onEnter: () => console.log('Menu aberto'),
    onExit: () => console.log('Menu fechado')
});
```

## 🚀 Benefícios

- ✅ **Organização**: Código separado por responsabilidade
- ✅ **Manutenibilidade**: Fácil de modificar e estender
- ✅ **Performance**: Apenas scene ativa é renderizada
- ✅ **Escalabilidade**: Simples adicionar novas telas
- ✅ **Profissional**: Padrão usado em engines reais

## 📝️ Notas

- O sistema é modular e extensível
- Cada scene funciona como uma aplicação independente
- Componentes podem ser reutilizados entre scenes
- Estado global é compartilhado quando necessário
- Suporte a TypeScript (facilmente convertível)

---

**🎮 Pronto para usar! Abra `index-scene.html` no navegador.**
