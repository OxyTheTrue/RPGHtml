/**
 * Scene da Loja
 * Tela secundária para compras
 */

import { BaseScene, UIComponent, GameComponent } from './BaseScene.js';

export class ShopScene extends BaseScene {
    constructor() {
        super('shop');
        this.uiComponent = null;
        this.gameComponent = null;
        this.shopItems = [];
        this.player = null;
    }

    async createElement() {
        super.createElement();
        
        // Estrutura HTML da scene de loja
        this.element.innerHTML = `
            <!-- Header da Loja -->
            <header class="shop-header">
                <div class="shop-title">
                    <i class="fa-solid fa-store"></i>
                    <h2>LOJA MÁGICA</h2>
                </div>
                <button class="action-btn btn-atk" id="back-to-combat">
                    <i class="fa-solid fa-arrow-left"></i> VOLTAR
                </button>
            </header>

            <!-- Conteúdo Principal da Loja -->
            <main class="shop-main">
                <!-- Painel de Informações do Player -->
                <aside class="shop-player-info">
                    <div class="player-stats-compact">
                        <h3 id="shop-player-name">GUERREIRO</h3>
                        <div class="stat-row">
                            <span>NÍVEL:</span>
                            <span id="shop-player-level">1</span>
                        </div>
                        <div class="stat-row">
                            <span>OURO:</span>
                            <span id="shop-player-gold">0</span>
                        </div>
                        <div class="stat-row">
                            <span>MANA:</span>
                            <span id="shop-player-mana">0</span>
                        </div>
                    </div>
                </aside>

                <!-- Área de Itens da Loja -->
                <section class="shop-items-area">
                    <div class="shop-categories">
                        <button class="category-btn active" data-category="all">TODOS</button>
                        <button class="category-btn" data-category="weapons">ARMAS</button>
                        <button class="category-btn" data-category="potions">POÇÕES</button>
                        <button class="category-btn" data-category="armor">ARMADURAS</button>
                    </div>

                    <div class="shop-items-grid" id="shop-items-grid">
                        <!-- Itens serão gerados dinamicamente -->
                    </div>
                </section>
            </main>

            <!-- Painel de Detalhes do Item -->
            <aside class="shop-item-details">
                <div class="item-details-panel">
                    <h3>DETALHES DO ITEM</h3>
                    <div id="item-details-content">
                        <p class="no-item-selected">Selecione um item para ver detalhes</p>
                    </div>
                    <button class="action-btn btn-heal" id="buy-item-btn" disabled>
                        <i class="fa-solid fa-shopping-cart"></i> COMPRAR
                    </button>
                </div>
            </aside>
        `;
    }

    async setupComponents() {
        // Criar componente UI
        this.uiComponent = new ShopUIComponent();
        this.addComponent('ui', this.uiComponent);

        // Criar componente de jogo
        this.gameComponent = new ShopGameComponent();
        this.addComponent('game', this.gameComponent);
    }

    async onEnter(options = {}) {
        await super.onEnter(options);
        
        // Carregar estado do jogador
        if (options.gameState) {
            this.gameState = options.gameState;
            this.player = options.gameState.player;
        }

        // Carregar itens da loja
        await this.loadShopItems();

        // Inicializar UI
        await this.uiComponent.onEnter(options);
        
        // Inicializar lógica da loja
        await this.gameComponent.onEnter(options);

        console.log('🛒 Scene da loja iniciada');
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

        console.log('🚪 Scene da loja finalizada');
    }

    onUpdate() {
        super.onUpdate();
        
        // Atualizar lógica da loja
        this.gameComponent.onUpdate();
        
        // Atualizar UI
        this.uiComponent.onUpdate();
    }

    async loadShopItems() {
        // Itens da loja (poderia virar de API)
        this.shopItems = [
            {
                id: 'potion_hp',
                name: 'Poção HP',
                description: 'Restaura 50 HP instantaneamente',
                price: 50,
                icon: 'fa-flask',
                category: 'potions',
                effect: 'heal',
                value: 50
            },
            {
                id: 'potion_mana',
                name: 'Poção MP',
                description: 'Restaura 30 MP instantaneamente',
                price: 40,
                icon: 'fa-flask-vial',
                category: 'potions',
                effect: 'mana',
                value: 30
            },
            {
                id: 'sword_fire',
                name: 'Espada de Fogo',
                description: 'Arma elemental com dano de fogo',
                price: 200,
                icon: 'fa-fire',
                category: 'weapons',
                effect: 'attack',
                value: 15
            },
            {
                id: 'shield_ice',
                name: 'Escudo de Gelo',
                description: 'Proteção contra ataques físicos',
                price: 150,
                icon: 'fa-shield',
                category: 'armor',
                effect: 'defense',
                value: 10
            }
        ];

        // Atualizar UI com os itens
        if (this.uiComponent) {
            this.uiComponent.updateShopItems(this.shopItems);
        }
    }

    canTransition(targetScene) {
        // Pode voltar para o combate
        return targetScene === 'combat';
    }
}

/**
 * Componente UI da scene de loja
 */
class ShopUIComponent extends UIComponent {
    constructor() {
        super();
        this.elements = {};
        this.selectedItem = null;
        this.currentCategory = 'all';
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
        this.elements = {
            playerName: document.getElementById('shop-player-name'),
            playerLevel: document.getElementById('shop-player-level'),
            playerGold: document.getElementById('shop-player-gold'),
            playerMana: document.getElementById('shop-player-mana'),
            itemsGrid: document.getElementById('shop-items-grid'),
            itemDetails: document.getElementById('item-details-content'),
            buyButton: document.getElementById('buy-item-btn'),
            backButton: document.getElementById('back-to-combat'),
            categoryButtons: document.querySelectorAll('.category-btn')
        };
    }

    setupEventListeners() {
        // Botão voltar
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', this.handleBackClick.bind(this));
        }

        // Botão comprar
        if (this.elements.buyButton) {
            this.elements.buyButton.addEventListener('click', this.handleBuyClick.bind(this));
        }

        // Categorias
        this.elements.categoryButtons.forEach(button => {
            button.addEventListener('click', this.handleCategoryClick.bind(this));
        });
    }

    initializeUI() {
        this.updatePlayerInfo();
        this.renderShopItems();
    }

    updatePlayerInfo() {
        if (!this.scene || !this.scene.gameState) return;
        
        const player = this.scene.gameState.player;
        if (!player) return;

        if (this.elements.playerName) this.elements.playerName.textContent = player.name || 'GUERREIRO';
        if (this.elements.playerLevel) this.elements.playerLevel.textContent = player.lv || 1;
        if (this.elements.playerGold) this.elements.playerGold.textContent = player.gold || 0;
        if (this.elements.playerMana) this.elements.playerMana.textContent = Math.ceil(player.mana || 0);
    }

    updateShopItems(items) {
        this.shopItems = items;
        this.renderShopItems();
    }

    renderShopItems() {
        if (!this.elements.itemsGrid) return;

        const filteredItems = this.currentCategory === 'all' 
            ? this.shopItems 
            : this.shopItems.filter(item => item.category === this.currentCategory);

        this.elements.itemsGrid.innerHTML = filteredItems.map(item => `
            <div class="shop-item-card" data-item-id="${item.id}">
                <div class="item-icon">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>${item.description}</p>
                    <div class="item-price">
                        <i class="fa-solid fa-coins"></i>
                        <span>${item.price}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Adicionar event listeners aos itens
        this.elements.itemsGrid.querySelectorAll('.shop-item-card').forEach(card => {
            card.addEventListener('click', this.handleItemClick.bind(this));
        });
    }

    handleItemClick(event) {
        const card = event.currentTarget;
        const itemId = card.dataset.itemId;
        
        // Remover seleção anterior
        this.elements.itemsGrid.querySelectorAll('.shop-item-card').forEach(c => {
            c.classList.remove('selected');
        });
        
        // Adicionar seleção atual
        card.classList.add('selected');
        
        // Encontrar item
        this.selectedItem = this.shopItems.find(item => item.id === itemId);
        
        // Atualizar detalhes
        this.updateItemDetails();
    }

    handleCategoryClick(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        
        // Atualizar botão ativo
        this.elements.categoryButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Atualizar categoria
        this.currentCategory = category;
        
        // Re-renderizar itens
        this.renderShopItems();
    }

    updateItemDetails() {
        if (!this.elements.itemDetails || !this.selectedItem) return;

        this.elements.itemDetails.innerHTML = `
            <div class="item-detail-header">
                <div class="item-icon-large">
                    <i class="fa-solid ${this.selectedItem.icon}"></i>
                </div>
                <h4>${this.selectedItem.name}</h4>
            </div>
            <div class="item-description">
                <p>${this.selectedItem.description}</p>
            </div>
            <div class="item-stats">
                <div class="stat-item">
                    <span>Efeito:</span>
                    <span>${this.selectedItem.effect}</span>
                </div>
                <div class="stat-item">
                    <span>Valor:</span>
                    <span>+${this.selectedItem.value}</span>
                </div>
                <div class="stat-item price">
                    <span>Preço:</span>
                    <span><i class="fa-solid fa-coins"></i> ${this.selectedItem.price}</span>
                </div>
            </div>
        `;

        // Habilitar/desabilitar botão de compra
        if (this.elements.buyButton) {
            const player = this.scene?.gameState?.player;
            const canAfford = player && player.gold >= this.selectedItem.price;
            this.elements.buyButton.disabled = !canAfford;
        }
    }

    handleBuyClick() {
        if (!this.selectedItem || !this.scene?.gameComponent) return;

        console.log(`🛒 Comprando: ${this.selectedItem.name}`);
        
        // Disparar evento para o game component
        this.scene.gameComponent.handlePurchase(this.selectedItem);
    }

    handleBackClick() {
        console.log('🔙 Voltando para o combate');
        
        // Mudar para scene de combate
        if (window.sceneManager) {
            window.sceneManager.changeScene('combat', {
                gameState: this.scene?.gameState
            });
        }
    }

    onUpdate() {
        this.updatePlayerInfo();
        if (this.selectedItem) {
            this.updateItemDetails();
        }
    }

    async onExit(options = {}) {
        super.onExit(options);
        
        // Limpar seleção
        this.selectedItem = null;
        this.currentCategory = 'all';
    }
}

/**
 * Componente de jogo da scene de loja
 */
class ShopGameComponent extends GameComponent {
    constructor() {
        super();
        this.shopInventory = [];
    }

    async onEnter(options = {}) {
        super.onEnter(options);
        
        // Carregar inventário da loja
        this.loadShopInventory();
        
        console.log('🛒 Componente da loja iniciado');
    }

    loadShopInventory() {
        // Carregar itens disponíveis na loja
        // Isso poderia virar de uma API ou arquivo de configuração
        console.log('📦 Carregando inventário da loja');
    }

    handlePurchase(item) {
        if (!this.gameState || !this.gameState.player) return;

        const player = this.gameState.player;
        
        // Verificar se pode comprar
        if (player.gold < item.price) {
            console.log('❌ Ouro insuficiente');
            return;
        }

        // Realizar compra
        player.gold -= item.price;
        
        // Adicionar item ao inventário do jogador
        if (!player.inventory) {
            player.inventory = [];
        }
        player.inventory.push({
            id: item.id,
            name: item.name,
            ...item
        });

        // Aplicar efeito do item
        this.applyItemEffect(player, item);

        console.log(`✅ Compra realizada: ${item.name}`);
        
        // Atualizar UI
        if (this.scene && this.scene.uiComponent) {
            this.scene.uiComponent.updatePlayerInfo();
        }
    }

    applyItemEffect(player, item) {
        switch (item.effect) {
            case 'heal':
                player.hp = Math.min(player.hp + item.value, player.maxHp);
                break;
            case 'mana':
                player.mana = Math.min(player.mana + item.value, player.maxMana);
                break;
            case 'attack':
                player.attack = (player.attack || 0) + item.value;
                break;
            case 'defense':
                player.defense = (player.defense || 0) + item.value;
                break;
        }
        
        console.log(`💊 Efeito aplicado: ${item.effect} +${item.value}`);
    }

    onUpdate() {
        // Lógica de update da loja aqui
    }

    async onExit(options = {}) {
        super.onExit(options);
        console.log('🚪 Componente da loja finalizado');
    }
}
