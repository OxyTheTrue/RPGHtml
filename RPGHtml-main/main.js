const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Desabilitar segurança para desenvolvimento (remover em produção)
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

class MasteryRPG {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.env.NODE_ENV === 'development';
        
        this.init();
    }
    
    init() {
        // Quando o Electron estiver pronto
        app.whenReady().then(() => {
            this.createMainWindow();
            this.setupMenu();
            this.setupEventHandlers();
        });
        
        // Eventos da aplicação
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
        
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });
        
        // Prevenir múltiplas instâncias
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            app.quit();
        } else {
            app.on('second-instance', () => {
                // Focar na janela principal se já existir
                if (this.mainWindow) {
                    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                    this.mainWindow.focus();
                }
            });
        }
    }
    
    createMainWindow() {
        // Criar janela principal
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, 'icon.png'),
            show: false,
            titleBarStyle: 'default'
        });
        
        // Carregar o jogo
        this.mainWindow.loadFile('index.html');
        
        // Mostrar janela quando carregada
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            this.mainWindow.center();
            
            // Abrir DevTools em desenvolvimento
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });
        
        // Eventos da janela
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
        
        // Prevenir navegação externa
        this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            if (parsedUrl.origin !== 'file://') {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            }
        });
        
        // Prevenir abrir novos links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }
    
    setupMenu() {
        // Menu personalizado
        const template = [
            {
                label: 'Jogo',
                submenu: [
                    {
                        label: 'Novo Jogo',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.mainWindow.webContents.send('game-new-game');
                        }
                    },
                    {
                        label: 'Continuar',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => {
                            this.mainWindow.webContents.send('game-continue');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Sair',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Opções',
                submenu: [
                    {
                        label: 'Tela Cheia',
                        accelerator: 'F11',
                        click: () => {
                            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                        }
                    },
                    {
                        label: 'Zoom In',
                        accelerator: 'CmdOrCtrl+Plus',
                        click: () => {
                            this.mainWindow.webContents.setZoomLevel(this.mainWindow.webContents.getZoomLevel() + 0.5);
                        }
                    },
                    {
                        label: 'Zoom Out',
                        accelerator: 'CmdOrCtrl+-',
                        click: () => {
                            this.mainWindow.webContents.setZoomLevel(this.mainWindow.webContents.getZoomLevel() - 0.5);
                        }
                    },
                    {
                        label: 'Reset Zoom',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => {
                            this.mainWindow.webContents.setZoomLevel(0);
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Ferramentas de Desenvolvedor',
                        accelerator: 'F12',
                        click: () => {
                            this.mainWindow.webContents.toggleDevTools();
                        }
                    }
                ]
            },
            {
                label: 'Ajuda',
                submenu: [
                    {
                        label: 'Sobre',
                        click: () => {
                            this.showAboutDialog();
                        }
                    },
                    {
                        label: 'Abrir Pasta do Jogo',
                        click: () => {
                            shell.showItemInFolder(__dirname);
                        }
                    }
                ]
            }
        ];
        
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
    
    setupEventHandlers() {
        // IPC handlers para comunicação com o renderer
        ipcMain.handle('game-get-version', () => {
            return app.getVersion();
        });
        
        ipcMain.handle('game-get-platform', () => {
            return process.platform;
        });
        
        ipcMain.handle('game-restart', () => {
            app.relaunch();
            app.exit();
        });
        
        // Salvar automaticamente antes de fechar
        this.mainWindow.on('close', (event) => {
            // Enviar evento para o jogo salvar
            this.mainWindow.webContents.send('game-before-close');
            
            // Dar tempo para salvar
            setTimeout(() => {
                this.mainWindow.destroy();
            }, 1000);
            
            event.preventDefault();
        });
    }
    
    showAboutDialog() {
        const { dialog } = require('electron');
        
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Sobre Mastery RPG',
            message: 'Mastery RPG',
            detail: `Versão: ${app.getVersion()}\n\nUm RPG de turn-based com sistema de progressão e combate estratégico.\n\nDesenvolvido com Electron, HTML5, CSS3 e JavaScript.`,
            buttons: ['OK'],
            defaultId: 0
        });
    }
}

// Iniciar o jogo
new MasteryRPG();
