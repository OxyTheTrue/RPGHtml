// Sistema de Viewport Responsivo
class ViewportManager {
    constructor() {
        this.container = document.getElementById('viewport-container');
        this.stage = document.getElementById('game-stage');
        this.safeArea = document.getElementById('safe-area');
        this.transitionOverlay = document.getElementById('transition-overlay');
        
        this.aspectRatio = 16/9;
        this.isPortrait = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.handleOrientationChange();
        this.handleResize();
        
        // Simular integração futura
        console.log('🎮 Viewport System initialized');
        console.log('📱 Aspect Ratio:', this.aspectRatio);
        console.log('🔒 Safe Area:', this.getSafeAreaInsets());
    }
    
    setupEventListeners() {
        // Eventos de redimensionamento
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        
        // Prevenir pinch-to-zoom
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    handleResize() {
        this.updateGameStage();
        this.updateSafeArea();
    }
    
    handleOrientationChange() {
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (isPortrait !== this.isPortrait) {
            this.isPortrait = isPortrait;
            this.aspectRatio = isPortrait ? 10/16 : 16/9;
            
            // Atualizar variável CSS
            document.documentElement.style.setProperty('--aspect-ratio-mobile', '10/16');
            document.documentElement.style.setProperty('--aspect-ratio-desktop', '16/9');
            
            console.log('📱 Orientation changed:', isPortrait ? 'portrait' : 'landscape');
            console.log('🎯 New aspect ratio:', this.aspectRatio);
            
            // Simular transição
            this.showTransition();
        }
        
        this.updateGameStage();
    }
    
    updateGameStage() {
        if (!this.stage) return;
        
        const stageWidth = this.stage.offsetWidth;
        const stageHeight = this.stage.offsetHeight;
        
        // Calcular dimensões ideais mantendo aspect-ratio
        let idealWidth, idealHeight;
        
        if (stageWidth / stageHeight > this.aspectRatio) {
            // Stage mais largo que o aspect-ratio
            idealWidth = stageHeight * this.aspectRatio;
            idealHeight = stageHeight;
        } else {
            // Stage mais alto que o aspect-ratio
            idealWidth = stageWidth;
            idealHeight = stageWidth / this.aspectRatio;
        }
        
        // Aplicar dimensões ao conteúdo
        this.stage.style.width = idealWidth + 'px';
        this.stage.style.height = idealHeight + 'px';
        
        console.log('🎮 Stage dimensions:', idealWidth + 'x' + idealHeight);
    }
    
    updateSafeArea() {
        if (!this.safeArea) return;
        
        // Atualizar variáveis CSS com valores atuais
        const safeInsets = this.getSafeAreaInsets();
        
        document.documentElement.style.setProperty('--safe-area-top', safeInsets.top + 'px');
        document.documentElement.style.setProperty('--safe-area-bottom', safeInsets.bottom + 'px');
        document.documentElement.style.setProperty('--safe-area-left', safeInsets.left + 'px');
        document.documentElement.style.setProperty('--safe-area-right', safeInsets.right + 'px');
    }
    
    getSafeAreaInsets() {
        // Obter áreas seguras do sistema (notch, barras de status, etc.)
        const safeArea = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
        
        // iOS Safari com env()
        if (window.CSS && CSS.supports('env', 'safe-area-inset-top')) {
            safeArea.top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0;
            safeArea.bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0;
            safeArea.left = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left')) || 0;
            safeArea.right = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right')) || 0;
        }
        
        // Fallback para outras plataformas
        else {
            // Área segura estimada para mobile
            if (window.innerHeight < window.innerWidth) {
                safeArea.top = 30; // Estimativa para notch/status bar
            }
        }
        
        return safeArea;
    }
    
    showTransition() {
        if (!this.transitionOverlay) return;
        
        this.transitionOverlay.classList.remove('hidden');
        
        // Simular tempo de transição
        setTimeout(() => {
            this.transitionOverlay.classList.add('hidden');
        }, 2000);
    }
    
    // Métodos para integração futura
    getGameDimensions() {
        return {
            width: this.stage ? this.stage.offsetWidth : 0,
            height: this.stage ? this.stage.offsetHeight : 0,
            aspectRatio: this.aspectRatio,
            isPortrait: this.isPortrait
        };
    }
    
    getSafeArea() {
        return this.getSafeAreaInsets();
    }
    
    // Simular integração com sistema de jogo
    integrateGameAPI(gameAPI) {
        console.log('🔌 Game API integration ready');
        
        // Exemplo de como expor métodos
        window.gameViewport = {
            getDimensions: () => this.getGameDimensions(),
            getSafeArea: () => this.getSafeArea(),
            showTransition: () => this.showTransition(),
            onResize: (callback) => {
                window.addEventListener('resize', callback);
                return () => window.removeEventListener('resize', callback);
            }
        };
    }
}

// Inicializar o sistema quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.viewportManager = new ViewportManager();
    
    // Simular eventos de jogo para demonstração
    setTimeout(() => {
        console.log('🎮 Demo: Redimensione a janela ou gire o dispositivo');
        console.log('📱 Safe area automatically calculated');
        console.log('🎯 Aspect ratio maintained: 16:9 (landscape) / 10:16 (portrait)');
    }, 1000);
});

// Prevenir comportamentos indesejados
document.addEventListener('DOMContentLoaded', () => {
    // Prevenir double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd < 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    });
    
    // Prevenir contexto de menu longo
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Prevenir seleção de texto
    document.addEventListener('selectstart', (e) => e.preventDefault());
    document.addEventListener('dragstart', (e) => e.preventDefault());
});
