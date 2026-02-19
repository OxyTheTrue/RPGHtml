/**
 * Classes base para criação de Scenes
 * Funciona como GameObjects em engines de jogos
 */

/**
 * Classe base para todas as Scenes
 */
export class BaseScene {
    constructor(name) {
        this.name = name;
        this.element = null;
        this.isActive = false;
        this.components = new Map();
        this.gameState = null;
    }

    /**
     * Inicializa a scene
     * @param {Object} gameState - Estado do jogo
     */
    async init(gameState = null) {
        this.gameState = gameState;
        this.createElement();
        await this.setupComponents();
        console.log(`🎬 Scene "${this.name}" inicializada`);
    }

    /**
     * Cria o elemento HTML da scene
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.className = `scene scene-${this.name}`;
        this.element.id = `scene-${this.name}`;
    }

    /**
     * Configura os componentes da scene
     */
    async setupComponents() {
        // Sobrescrever nas classes filhas
    }

    /**
     * Chamado quando entra na scene
     */
    async onEnter(options = {}) {
        this.isActive = true;
        await this.onComponentsEnter(options);
    }

    /**
     * Chamado quando sai da scene
     */
    async onExit(options = {}) {
        this.isActive = false;
        await this.onComponentsExit(options);
    }

    /**
     * Loop de update (60 FPS)
     */
    onUpdate() {
        if (!this.isActive) return;
        
        this.onComponentsUpdate();
    }

    /**
     * Verifica se pode fazer transição
     */
    canTransition(targetScene) {
        return true;
    }

    /**
     * Adiciona um componente à scene
     */
    addComponent(name, component) {
        this.components.set(name, component);
        component.setScene(this);
    }

    /**
     * Obtém um componente
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Remove um componente
     */
    removeComponent(name) {
        const component = this.components.get(name);
        if (component) {
            component.destroy();
            this.components.delete(name);
        }
    }

    /**
     * Chama onEnter em todos os componentes
     */
    async onComponentsEnter(options) {
        for (const [name, component] of this.components) {
            if (component.onEnter) {
                await component.onEnter(options);
            }
        }
    }

    /**
     * Chama onExit em todos os componentes
     */
    async onComponentsExit(options) {
        for (const [name, component] of this.components) {
            if (component.onExit) {
                await component.onExit(options);
            }
        }
    }

    /**
     * Chama onUpdate em todos os componentes
     */
    onComponentsUpdate() {
        for (const [name, component] of this.components) {
            if (component.onUpdate) {
                component.onUpdate();
            }
        }
    }

    /**
     * Destrói a scene
     */
    destroy() {
        // Destruir todos os componentes
        for (const [name, component] of this.components) {
            component.destroy();
        }
        this.components.clear();

        // Remover elemento
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        console.log(`🗑️ Scene "${this.name}" destruída`);
    }
}

/**
 * Classe base para componentes
 */
export class BaseComponent {
    constructor() {
        this.scene = null;
        this.element = null;
        this.isActive = false;
    }

    /**
     * Define a scene do componente
     */
    setScene(scene) {
        this.scene = scene;
    }

    /**
     * Chamado quando entra na scene
     */
    async onEnter(options = {}) {
        this.isActive = true;
    }

    /**
     * Chamado quando sai da scene
     */
    async onExit(options = {}) {
        this.isActive = false;
    }

    /**
     * Loop de update
     */
    onUpdate() {
        // Sobrescrever nas classes filhas
    }

    /**
     * Destrói o componente
     */
    destroy() {
        // Sobrescrever nas classes filhas
    }
}

/**
 * Classe base para UI Components
 */
export class UIComponent extends BaseComponent {
    constructor() {
        super();
        this.uiElements = new Map();
    }

    /**
     * Obtém um elemento UI
     */
    getElement(id) {
        return this.uiElements.get(id);
    }

    /**
     * Define um elemento UI
     */
    setElement(id, element) {
        this.uiElements.set(id, element);
    }

    /**
     * Atualiza elementos UI
     */
    updateUI(data) {
        // Sobrescrever nas classes filhas
    }
}

/**
 * Classe base para Game Components
 */
export class GameComponent extends BaseComponent {
    constructor() {
        super();
        this.gameState = null;
    }

    /**
     * Define o estado do jogo
     */
    setGameState(gameState) {
        this.gameState = gameState;
    }

    /**
     * Processa lógica do jogo
     */
    process() {
        // Sobrescrever nas classes filhas
    }
}
