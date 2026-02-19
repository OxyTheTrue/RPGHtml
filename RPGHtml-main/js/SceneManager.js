/**
 * Sistema de Gerenciamento de Telas/Scenes
 * Funciona como engines de jogos (Unity, Godot, etc.)
 * Cada tela funciona de forma independente
 */

export class SceneManager {
    constructor() {
        this.currentScene = null;
        this.scenes = new Map();
        this.sceneContainer = null;
        this.isTransitioning = false;
        
        this.init();
    }

    /**
     * Inicializa o sistema de scenes
     */
    init() {
        // Criar container principal para as scenes
        this.sceneContainer = document.createElement('div');
        this.sceneContainer.id = 'scene-container';
        this.sceneContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            overflow: hidden;
        `;
        
        // Adicionar ao body
        document.body.appendChild(this.sceneContainer);
        
        // Esconder elementos antigos que não estão em scenes
        this.hideLegacyElements();
        
        console.log('🎮 SceneManager inicializado');
    }

    /**
     * Registra uma nova scene
     * @param {string} name - Nome da scene
     * @param {Object} sceneConfig - Configuração da scene
     */
    registerScene(name, sceneConfig) {
        const scene = {
            name: name,
            element: sceneConfig.element || null,
            onEnter: sceneConfig.onEnter || (() => {}),
            onExit: sceneConfig.onExit || (() => {}),
            onUpdate: sceneConfig.onUpdate || (() => {}),
            canTransition: sceneConfig.canTransition || (() => true),
            ...sceneConfig
        };

        this.scenes.set(name, scene);
        
        // Se a scene tem um elemento, preparar para o sistema
        if (scene.element) {
            scene.element.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                visibility: hidden;
                transform: translateX(100%);
                transition: all 0.3s ease;
                z-index: 10;
            `;
            
            // Adicionar ao container se ainda não estiver
            if (!scene.element.parentNode) {
                this.sceneContainer.appendChild(scene.element);
            }
        }

        console.log(`📋 Scene "${name}" registrada`);
    }

    /**
     * Muda para uma scene específica
     * @param {string} sceneName - Nome da scene para mudar
     * @param {Object} options - Opções de transição
     */
    async changeScene(sceneName, options = {}) {
        if (this.isTransitioning) {
            console.warn('⚠️ Transição já em andamento');
            return false;
        }

        const newScene = this.scenes.get(sceneName);
        if (!newScene) {
            console.error(`❌ Scene "${sceneName}" não encontrada`);
            return false;
        }

        const currentScene = this.currentScene;
        
        // Verificar se pode fazer transição
        if (currentScene && !currentScene.canTransition(sceneName)) {
            console.warn(`⚠️ Transição de "${currentScene.name}" para "${sceneName}" não permitida`);
            return false;
        }

        this.isTransitioning = true;

        try {
            // Sair da scene atual
            if (currentScene) {
                await this.exitScene(currentScene, options);
            }

            // Entrar na nova scene
            await this.enterScene(newScene, options);

            this.currentScene = newScene;
            console.log(`🎬 Scene alterada para: ${sceneName}`);

        } catch (error) {
            console.error('❌ Erro na transição de scene:', error);
        } finally {
            this.isTransitioning = false;
        }

        return true;
    }

    /**
     * Entra em uma scene
     * @param {Object} scene - Configuração da scene
     * @param {Object} options - Opções de entrada
     */
    async enterScene(scene, options = {}) {
        if (scene.element) {
            // Mostrar elemento da scene
            scene.element.style.opacity = '1';
            scene.element.style.visibility = 'visible';
            scene.element.style.transform = 'translateX(0)';
        }

        // Chamar callback de entrada
        await scene.onEnter(options);
        
        // Iniciar loop de update se existir
        if (scene.onUpdate) {
            this.startUpdateLoop(scene);
        }
    }

    /**
     * Sai de uma scene
     * @param {Object} scene - Configuração da scene
     * @param {Object} options - Opções de saída
     */
    async exitScene(scene, options = {}) {
        // Parar loop de update
        this.stopUpdateLoop(scene);

        // Chamar callback de saída
        await scene.onExit(options);

        if (scene.element) {
            // Esconder elemento da scene
            scene.element.style.opacity = '0';
            scene.element.style.visibility = 'hidden';
            scene.element.style.transform = 'translateX(-100%)';
        }
    }

    /**
     * Inicia loop de update para uma scene
     * @param {Object} scene - Scene para atualizar
     */
    startUpdateLoop(scene) {
        if (scene.updateInterval) {
            clearInterval(scene.updateInterval);
        }

        scene.updateInterval = setInterval(() => {
            if (this.currentScene === scene) {
                scene.onUpdate();
            }
        }, 1000 / 60); // 60 FPS
    }

    /**
     * Para loop de update de uma scene
     * @param {Object} scene - Scene para parar
     */
    stopUpdateLoop(scene) {
        if (scene.updateInterval) {
            clearInterval(scene.updateInterval);
            scene.updateInterval = null;
        }
    }

    /**
     * Obtém a scene atual
     * @returns {Object|null} Scene atual
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * Verifica se uma scene existe
     * @param {string} sceneName - Nome da scene
     * @returns {boolean} Se a scene existe
     */
    hasScene(sceneName) {
        return this.scenes.has(sceneName);
    }

    /**
     * Remove uma scene
     * @param {string} sceneName - Nome da scene para remover
     */
    removeScene(sceneName) {
        const scene = this.scenes.get(sceneName);
        if (!scene) return false;

        // Se for a scene atual, sair primeiro
        if (this.currentScene === scene) {
            this.exitScene(scene);
        }

        // Parar update loop
        this.stopUpdateLoop(scene);

        // Remover elemento do DOM
        if (scene.element && scene.element.parentNode) {
            scene.element.parentNode.removeChild(scene.element);
        }

        // Remover do registro
        this.scenes.delete(sceneName);
        
        console.log(`🗑️ Scene "${sceneName}" removida`);
        return true;
    }

    /**
     * Esconde elementos legados que não estão no sistema de scenes
     */
    hideLegacyElements() {
        const legacyElements = [
            '.main-wrapper',
            '.game-ui',
            '.combat-arena',
            '.action-frame',
            '.header-master-panel'
        ];

        legacyElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Mostra elementos legados (para debug)
     */
    showLegacyElements() {
        const legacyElements = document.querySelectorAll('.main-wrapper, .game-ui, .combat-arena, .action-frame, .header-master-panel');
        legacyElements.forEach(element => {
            element.style.display = '';
        });
    }

    /**
     * Destrói o SceneManager
     */
    destroy() {
        // Sair da scene atual
        if (this.currentScene) {
            this.exitScene(this.currentScene);
        }

        // Limpar todas as scenes
        this.scenes.forEach((scene, name) => {
            this.removeScene(name);
        });

        // Remover container
        if (this.sceneContainer && this.sceneContainer.parentNode) {
            this.sceneContainer.parentNode.removeChild(this.sceneContainer);
        }

        console.log('🗑️ SceneManager destruído');
    }
}

// Instância global do SceneManager
window.sceneManager = new SceneManager();
