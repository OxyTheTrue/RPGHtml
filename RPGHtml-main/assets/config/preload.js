const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Informações da aplicação
    getVersion: () => ipcRenderer.invoke('game-get-version'),
    getPlatform: () => ipcRenderer.invoke('game-get-platform'),
    
    // Controles do jogo
    newGame: () => ipcRenderer.send('game-new-game'),
    continue: () => ipcRenderer.send('game-continue'),
    restart: () => ipcRenderer.invoke('game-restart'),
    
    // Eventos do sistema
    onBeforeClose: (callback) => {
        ipcRenderer.on('game-before-close', callback);
    },
    
    // Utilidades
    openExternal: (url) => {
        const { shell } = require('electron');
        shell.openExternal(url);
    },
    
    // Salvar/Carregar (para implementação futura)
    saveGame: (data) => {
        const fs = require('fs');
        const path = require('path');
        const savePath = path.join(__dirname, 'save.json');
        
        try {
            fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    loadGame: () => {
        const fs = require('fs');
        const path = require('path');
        const savePath = path.join(__dirname, 'save.json');
        
        try {
            if (fs.existsSync(savePath)) {
                const data = fs.readFileSync(savePath, 'utf8');
                return { success: true, data: JSON.parse(data) };
            }
            return { success: false, error: 'Save file not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
});

// Expor variáveis globais para o jogo
window.isElectron = true;
window.platform = process.platform;
