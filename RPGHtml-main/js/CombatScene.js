/**
 * Scene de Combate
 * Tela principal do jogo RPG
 */

import { BaseScene, UIComponent, GameComponent } from './BaseScene.js';

export class CombatScene extends BaseScene {
    constructor() {
        super('combat');
        this.uiComponent = null;
        this.gameComponent = null;
        this.player = null;
        this.enemy = null;
    }

    async createElement() {
        super.createElement();
        
        // Estrutura HTML da scene de combate
        this.element.innerHTML = `
            <!-- Header Superior -->
            <header class="game-header">
                <!-- Painel Mestre do Header -->
                <div class="header-master-panel">
                    <!-- Cantos decorativos -->
                    <div class="corner-tl"></div>
                    <div class="corner-tr"></div>
                    <div class="corner-bl"></div>
                    <div class="corner-br"></div>
                    
                    <!-- Conteúdo do painel mestre -->
                    <div class="header-master-content">
                        <!-- Seção esquerda: Habilidades Ativas -->
                        <div class="header-left-section">
                            <div class="active-skills-panel">
                                <div class="skills-slots" id="active-skills-slots">
                                    <div class="skill-slot"></div>
                                    <div class="skill-slot"></div>
                                    <div class="skill-slot"></div>
                                    <div class="skill-slot"></div>
                                    <div class="skill-slot"></div>
                                    <div class="skill-slot"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Seção central: Botões de Ação -->
                        <div class="header-center-section">
                            <div class="header-actions">
                                <button class="action-btn btn-open-tree hidden-button" data-action="open-skill-tree">
                                    <i class="fa-solid fa-diagram-project"></i> SKILLS
                                </button>
                                
                                <button class="action-btn btn-heal btn-shop hidden-button" data-action="open-shop">
                                    <i class="fa-solid fa-store"></i> LOJA
                                </button>
                            </div>
                        </div>
                        
                        <!-- Seção direita: Inventário -->
                        <div class="header-right-section">
                            <!-- Inventory Panel -->
                            <div class="inventory-panel">
                                <!-- Cantos decorativos -->
                                <div class="corner-tl"></div>
                                <div class="corner-tr"></div>
                                <div class="corner-bl"></div>
                                <div class="corner-br"></div>
                                
                                <!-- Conteúdo do inventário -->
                                <div class="inventory-content">
                                    <!-- Active Items Inventory -->
                                    <div class="inventory-section">
                                        <h4 style="color: var(--accent); margin-bottom: 10px;">ITENS ATIVOS</h4>
                                        <div class="inventory-slots" id="active-slots">
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Passive Items Inventory -->
                                    <div class="inventory-section">
                                        <h4 style="color: var(--xp); margin-bottom: 10px;">ITENS PASSIVOS</h4>
                                        <div class="inventory-slots" id="passive-slots">
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                            <div class="slot"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="action-btn btn-atk btn-exit" data-action="save-exit">
                    <i class="fa-solid fa-door-open"></i> SAIR
                </button>
            </header>

            <!-- Área de Combate Principal -->
            <main class="combat-arena">
                <!-- Seção do Inimigo (acima e à direita) -->
                <section class="enemy-section">
                    <div class="enemy-visual">
                        <!-- Informações do inimigo acima -->
                        <div class="enemy-info">
                            <div class="enemy-name-level">
                                <h3 id="enemy-name">BUSCANDO...</h3>
                                <span id="enemy-level" class="enemy-level">Lv.1</span>
                            </div>
                            <div id="enemy-badges" class="enemy-badges"></div>
                        </div>
                        
                        <!-- Barra de vida acima -->
                        <div class="enemy-health-bar">
                            <div class="health-bar-container enemy-bar-container">
                                <div id="enemy-bar-bg" class="enemy-bar-bg"></div>
                                <div id="enemy-bar" class="enemy-bar"></div>
                            </div>
                            <div class="health-text">
                                <span id="enemy-hp">0</span> / <span id="enemy-max-hp">0</span>
                            </div>
                        </div>
                        
                        <!-- Sprite do inimigo abaixo -->
                        <div class="enemy-sprite-container">
                            <img id="enemy-img" src="" alt="" class="enemy-sprite">
                            <div class="damage-indicators" id="enemy-damage-indicators"></div>
                        </div>
                    </div>
                </section>

                <!-- Seção do Player (abaixo e à esquerda) -->
                <section class="player-section">
                    <div class="player-visual">
                        <div class="player-avatar">
                            <img id="player-img" src="" alt="Player" class="player-sprite">
                            <div class="damage-indicators" id="player-damage-indicators"></div>
                        </div>
                        
                        <!-- Barra de HP movida para cá -->
                        <div class="player-level-progress">
                            <div class="xp-bar-container hp-bar-container">
                                <div id="p-hp-bar-bg" class="hp-bar-bg"></div>
                                <div id="p-hp-bar" class="hp-bar"></div>
                            </div>
                            <div class="xp-text">
                                <small>HP: <span id="p-hp">0</span>/<span id="p-max-hp">0</span></small>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            
            <!-- Moldura RPG para Ações e Status -->
            <div class="action-frame">
                <!-- Cantos decorativos -->
                <div class="corner-tl"></div>
                <div class="corner-tr"></div>
                <div class="corner-bl"></div>
                <div class="corner-br"></div>
                
                <!-- Conteúdo da moldura -->
                <div class="action-frame-content">
                    <!-- Painel de Status do Player (canto esquerdo) -->
                    <div class="player-status-panel">
                        <div class="player-info-compact">
                            <h3 id="p-display-name">GUERREIRO</h3>
                            <span class="level-badge-compact">NÍVEL <span id="p-lv">1</span></span>
                        </div>
                        <div class="gold-display-compact">
                            <i class="fa-solid fa-coins"></i>
                            <span id="p-gold">0</span>
                        </div>
                        
                        <!-- Botão Status -->
                        <button class="action-btn btn-def" id="toggle-stats-btn">
                            <i class="fa-solid fa-chart-line"></i> STATUS
                        </button>
                    </div>
                    
                    <!-- Barras de Status -->
                    <div class="status-bars-frame">
                        <div class="status-item mana">
                            <div class="status-icon"><i class="fa-solid fa-wand-sparkles"></i></div>
                            <div class="bar-container mana-bar-container">
                                <div id="p-mana-bar-bg" class="mana-bar-bg"></div>
                                <div id="p-mana-bar" class="mana-bar"></div>
                            </div>
                            <span class="status-text"><span id="p-mana">0</span></span>
                        </div>
                        
                        <div class="status-item fury">
                            <div class="status-icon"><i class="fa-solid fa-fire-glow"></i></div>
                            <div class="bar-container fury-bar-container">
                                <div id="p-furia-bar-bg" class="fury-bar-bg"></div>
                                <div id="p-furia-bar" class="fury-bar"></div>
                            </div>
                            <span class="status-text">FÚRIA</span>
                        </div>
                    </div>

                    <!-- Área de Ações de Combate -->
                    <div class="combat-actions" id="action-buttons">
                        <!-- Botões serão gerados dinamicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    async setupComponents() {
        // Criar componente UI
        this.uiComponent = new CombatUIComponent();
        this.addComponent('ui', this.uiComponent);

        // Criar componente de jogo
        this.gameComponent = new CombatGameComponent();
        this.addComponent('game', this.gameComponent);
    }

    async onEnter(options = {}) {
        await super.onEnter(options);
        
        // Carregar estado do jogo se fornecido
        if (options.gameState) {
            this.gameState = options.gameState;
            this.player = options.gameState.player;
            this.enemy = options.gameState.enemy;
        }

        // Inicializar UI
        await this.uiComponent.onEnter(options);
        
        // Inicializar lógica do jogo
        await this.gameComponent.onEnter(options);

        console.log('⚔️ Scene de combate iniciada');
    }

    async onExit(options = {}) {
        await super.onExit(options);
        
        // Salvar estado antes de sair
        if (this.gameState) {
            // Lógica de salvamento aqui
        }

        // Limpar componentes
        await this.uiComponent.onExit(options);
        await this.gameComponent.onExit(options);

        console.log('🚪 Scene de combate finalizada');
    }

    onUpdate() {
        super.onUpdate();
        
        // Atualizar lógica do jogo
        this.gameComponent.onUpdate();
        
        // Atualizar UI
        this.uiComponent.onUpdate();
    }

    canTransition(targetScene) {
        // Pode transicionar para qualquer scene
        return true;
    }
}

/**
 * Componente UI da scene de combate
 */
class CombatUIComponent extends UIComponent {
    constructor() {
        super();
        this.elements = {};
    }

    async onEnter(options = {}) {
        super.onEnter(options);
        
        // Obter referências dos elementos
        this.cacheElements();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Inicializar UI
        this.initializeUI();
    }

    cacheElements() {
        // Cache dos elementos mais usados
        this.elements = {
            playerName: document.getElementById('p-display-name'),
            playerLevel: document.getElementById('p-lv'),
            playerGold: document.getElementById('p-gold'),
            playerHp: document.getElementById('p-hp'),
            playerMaxHp: document.getElementById('p-max-hp'),
            playerMana: document.getElementById('p-mana'),
            playerFuria: document.getElementById('p-furia-bar'),
            enemyName: document.getElementById('enemy-name'),
            enemyLevel: document.getElementById('enemy-level'),
            enemyHp: document.getElementById('enemy-hp'),
            enemyMaxHp: document.getElementById('enemy-max-hp'),
            actionButtons: document.getElementById('action-buttons'),
            activeSkills: document.getElementById('active-skills-slots'),
            activeSlots: document.getElementById('active-slots'),
            passiveSlots: document.getElementById('passive-slots')
        };
    }

    setupEventListeners() {
        // Configurar listeners dos botões
        if (this.elements.actionButtons) {
            this.elements.actionButtons.addEventListener('click', this.handleActionClick.bind(this));
        }
    }

    initializeUI() {
        // Inicializar estado inicial da UI
        this.updatePlayerInfo();
        this.updateEnemyInfo();
        this.generateActionButtons();
    }

    updatePlayerInfo() {
        if (!this.scene || !this.scene.gameState) return;
        
        const player = this.scene.gameState.player;
        if (!player) return;

        if (this.elements.playerName) this.elements.playerName.textContent = player.name || 'GUERREIRO';
        if (this.elements.playerLevel) this.elements.playerLevel.textContent = player.lv || 1;
        if (this.elements.playerGold) this.elements.playerGold.textContent = player.gold || 0;
        if (this.elements.playerHp) this.elements.playerHp.textContent = Math.ceil(player.hp || 0);
        if (this.elements.playerMaxHp) this.elements.playerMaxHp.textContent = player.maxHp || 0;
        if (this.elements.playerMana) this.elements.playerMana.textContent = Math.ceil(player.mana || 0);
    }

    updateEnemyInfo() {
        if (!this.scene || !this.scene.gameState) return;
        
        const enemy = this.scene.gameState.enemy;
        if (!enemy) return;

        if (this.elements.enemyName) this.elements.enemyName.textContent = enemy.name || 'BUSCANDO...';
        if (this.elements.enemyLevel) this.elements.enemyLevel.textContent = `Lv.${enemy.lv || 1}`;
        if (this.elements.enemyHp) this.elements.enemyHp.textContent = Math.ceil(enemy.hp || 0);
        if (this.elements.enemyMaxHp) this.elements.enemyMaxHp.textContent = enemy.maxHp || 0;
    }

    generateActionButtons() {
        if (!this.elements.actionButtons) return;

        const actions = [
            { id: 'attack', label: 'ATACAR', class: 'btn-atk', icon: 'fa-sword' },
            { id: 'defend', label: 'DEFENDER', class: 'btn-def', icon: 'fa-shield' },
            { id: 'heal', label: 'CURAR', class: 'btn-heal', icon: 'fa-heart' },
            { id: 'skill', label: 'HABILIDADE', class: 'btn-skill', icon: 'fa-magic' }
        ];

        this.elements.actionButtons.innerHTML = actions.map(action => `
            <button class="action-btn ${action.class}" data-action="${action.id}">
                <i class="fa-solid ${action.icon}"></i> ${action.label}
            </button>
        `).join('');
    }

    handleActionClick(event) {
        const button = event.target.closest('.action-btn');
        if (!button) return;

        const action = button.dataset.action;
        console.log(`🎮 Ação: ${action}`);

        // Disparar evento para o game component
        if (this.scene && this.scene.gameComponent) {
            this.scene.gameComponent.handleAction(action);
        }
    }

    onUpdate() {
        this.updatePlayerInfo();
        this.updateEnemyInfo();
    }

    async onExit(options = {}) {
        super.onExit(options);
        // Limpar event listeners
        if (this.elements.actionButtons) {
            this.elements.actionButtons.removeEventListener('click', this.handleActionClick);
        }
    }
}

/**
 * Componente de jogo da scene de combate
 */
class CombatGameComponent extends GameComponent {
    constructor() {
        super();
        this.isPlayerTurn = true;
        this.combatState = 'waiting';
    }

    async onEnter(options = {}) {
        super.onEnter(options);
        
        // Inicializar estado de combate
        this.isPlayerTurn = true;
        this.combatState = 'active';
        
        console.log('⚔️ Componente de combate iniciado');
    }

    handleAction(action) {
        if (!this.isPlayerTurn || this.combatState !== 'active') return;

        console.log(`🎮 Processando ação: ${action}`);
        
        switch (action) {
            case 'attack':
                this.playerAttack();
                break;
            case 'defend':
                this.playerDefend();
                break;
            case 'heal':
                this.playerHeal();
                break;
            case 'skill':
                this.playerSkill();
                break;
        }
    }

    playerAttack() {
        console.log('⚔️ Jogador ataca');
        // Lógica de ataque aqui
        this.endPlayerTurn();
    }

    playerDefend() {
        console.log('🛡️ Jogador defende');
        // Lógica de defesa aqui
        this.endPlayerTurn();
    }

    playerHeal() {
        console.log('💊 Jogador cura');
        // Lógica de cura aqui
        this.endPlayerTurn();
    }

    playerSkill() {
        console.log('✨ Jogador usa habilidade');
        // Lógica de habilidade aqui
        this.endPlayerTurn();
    }

    endPlayerTurn() {
        this.isPlayerTurn = false;
        this.combatState = 'enemy-turn';
        
        // Simular turno do inimigo
        setTimeout(() => {
            this.enemyTurn();
        }, 1000);
    }

    enemyTurn() {
        console.log('👹 Turno do inimigo');
        // Lógica do inimigo aqui
        
        setTimeout(() => {
            this.startPlayerTurn();
        }, 1000);
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.combatState = 'active';
        console.log('🎮 Turno do jogador');
    }

    onUpdate() {
        // Lógica de update do jogo aqui
    }

    async onExit(options = {}) {
        super.onExit(options);
        console.log('🚪 Componente de combate finalizado');
    }
}
