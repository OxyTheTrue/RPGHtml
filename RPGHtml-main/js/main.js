/**
 * main.js - Ponto de entrada do RPG (ES6 Modules)
 * Conecta Game, UI, Shop e eventos do DOM.
 */

import { Game } from './Game.js';
import { UI } from './UI.js';
import { initAdminPanel } from './AdminPanel.js';

const ui = new UI();
const game = new Game(ui);
window.__rpgGame = game;

function bindMenuAndSidebar() {
    const startBtn = document.querySelector('[data-action="start-new"]');
    if (startBtn) startBtn.addEventListener('click', () => game.showNewGameNameStep());

    const continueBtn = document.querySelector('[data-action="continue-current"]');
    if (continueBtn) continueBtn.addEventListener('click', () => {
        game.ui.showLoadingScreen();
        setTimeout(() => {
            game.loadGame();
            setTimeout(() => {
                game.ui.hideLoadingScreen();
            }, 500);
        }, 1500);
    });

    const loadBtn = document.querySelector('[data-action="load-manual"]');
    if (loadBtn) loadBtn.addEventListener('click', () => {
        game._menuStep = 'load'; // Definir etapa atual
        ui.showMenuStep('load');
        ui.updateSaveSlots();
    });

    const nameNextBtn = document.querySelector('[data-action="menu-name-next"]');
    if (nameNextBtn) nameNextBtn.addEventListener('click', () => game.menuNameNext());

    const backBtns = document.querySelectorAll('[data-action="menu-back"]');
    backBtns.forEach(b => b.addEventListener('click', () => game.menuBack()));

    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = parseFloat(btn.getAttribute('data-difficulty'), 10);
            if (!isNaN(v)) game.startNewGameWithDifficulty(v);
        });
    });

    document.getElementById('overlay').addEventListener('click', (e) => {
        if (e.target.id === 'overlay') game.closeAllModals();
    });

    const learnBackBtn = document.querySelector('#skill-detail-modal .action-btn.btn-atk');
    if (learnBackBtn) learnBackBtn.addEventListener('click', () => game.closeDetailModal());

    const exitBtn = document.querySelector('[data-action="save-exit"]');
    if (exitBtn) exitBtn.addEventListener('click', () => game.saveAndExit());

    const restartBtn = document.querySelector('[data-action="restart-after-death"]');
    if (restartBtn) restartBtn.addEventListener('click', () => game.restartAfterDeath());

    const exitToMenuBtn = document.querySelector('[data-action="exit-to-menu"]');
    if (exitToMenuBtn) exitToMenuBtn.addEventListener('click', () => game.exitToMenu());

    const closeShopBtn = document.getElementById('close-shop-btn');
    if (closeShopBtn) closeShopBtn.addEventListener('click', () => game.closeAllModals());

    const closeSkillBtn = document.querySelector('#skill-modal .action-btn.btn-def');
    if (closeSkillBtn) closeSkillBtn.addEventListener('click', () => game.closeAllModals());

    document.querySelectorAll('.attr-info').forEach(el => {
        const stat = el.getAttribute('data-stat');
        if (stat) el.addEventListener('click', (e) => ui.showStatValue(stat, game.player, e));
    });

    document.querySelectorAll('.lvl-up-btn').forEach(btn => {
        const stat = btn.getAttribute('data-stat');
        if (stat) btn.addEventListener('click', () => game.spendPoint(stat));
    });

    const openTreeBtn = document.querySelector('[data-action="open-skill-tree"]');
    if (openTreeBtn) openTreeBtn.addEventListener('click', () => game.openSkillTree());

    const goldContainer = document.querySelector('.gold-container');
    if (goldContainer) goldContainer.addEventListener('click', () => game.openShop());

    const shopBtn = document.querySelector('[data-action="open-shop"]');
    if (shopBtn) shopBtn.addEventListener('click', () => game.openShop());

    document.querySelectorAll('.slot').forEach((slot, index) => {
        slot.addEventListener('click', () => game.useItem(index));
    });

    document.querySelectorAll('.shop-item-btn').forEach(btn => {
        const type = btn.getAttribute('data-item-type');
        if (type) btn.addEventListener('click', (e) => game.buyItem(type, e.currentTarget));
    });

    const openSettingsBtn = document.querySelector('[data-action="open-settings"]');
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => game.openSettings());

    const closeSettingsBtn = document.querySelector('[data-action="close-settings"]');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => game.closeAllModals());

    const manualSaveBtn = document.querySelector('[data-action="manual-save"]');
    if (manualSaveBtn) manualSaveBtn.addEventListener('click', () => game.manualSave());

    const muteCheck = document.getElementById('settings-mute');
    if (muteCheck) {
        muteCheck.checked = ui.isMuted();
        muteCheck.addEventListener('change', () => ui.setMuted(muteCheck.checked));
    }

    // Toggle do painel de status
    const toggleStatsBtn = document.getElementById('toggle-stats-btn');
    if (toggleStatsBtn) toggleStatsBtn.addEventListener('click', () => ui.toggleStatsPanel());

    const closeStatsBtn = document.getElementById('close-stats-btn');
    if (closeStatsBtn) closeStatsBtn.addEventListener('click', () => ui.closeStatsPanel());

    // Event listener para continuar após loot
    const continueLootBtn = document.querySelector('[data-action="continue-after-loot"]');
    if (continueLootBtn) {
        continueLootBtn.addEventListener('click', () => {
            game.closeAllModals();
        });
    }
}

function bindActionButtons() {
    const container = document.getElementById('action-buttons');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (!action) return;

        // Ações de NPC
        if (action === 'npc-choice') {
            const npc = e.target.getAttribute('data-npc');
            const tone = e.target.getAttribute('data-tone');
            game.npcChoice(npc, tone);
            return;
        }

        // Ações de save manual
        if (action === 'save-to-slot') {
            const slot = parseInt(e.target.getAttribute('data-slot'));
            game.saveToManualSlot(slot);
            return;
        }

        if (action === 'load-from-slot') {
            const slot = parseInt(e.target.getAttribute('data-slot'));
            game.loadManualSlot(slot);
            return;
        }

        if (action === 'delete-slot') {
            const slot = parseInt(e.target.getAttribute('data-slot'));
            if (confirm('Tem certeza que deseja deletar este save?')) {
                game.deleteManualSlot(slot);
            }
            return;
        }

        // Ações existentes
        switch (action) {
            case 'attack': game.playerAction(); break;
            case 'defend': game.playerDefend(); break;
            case 'heal': game.playerHeal(); break;
            case 'rest': game.playerRest(); break;
            case 'ultimate': game.useUltimate(); break;
            case 'open-shop': game.openShop(); break;
            case 'open-skill-tree': game.openSkillTree(); break;
            case 'use-skill': game.useSkill(e.target.getAttribute('data-skill-index')); break;
            case 'use-item': game.useItem(e.target.getAttribute('data-item-index')); break;
            case 'open-chest': game.openChestChoice(); break;
            case 'close-settings': game.closeSettings(); break;
            case 'manual-save': game.manualSave(); break;
            case 'save-exit': game.saveAndExit(); break;
            case 'close-death': game.exitToMenu(); break;
            case 'close-shop': game.closeShop(); break;
            case 'buy-item': game.buyItem(e.target.getAttribute('data-item-id')); break;
            case 'sell-item': game.sellItem(e.target.getAttribute('data-item-index')); break;
            case 'learn-skill': game.learnSkill(e.target.getAttribute('data-skill-id')); break;
            case 'close-skill': game.closeSkillTree(); break;
            case 'close-skill-detail': game.closeDetailModal(); break;
            case 'continue-after-loot': game.closeAllModals(); break;
            case 'spawn-monster':
                game.spawnMonster();
                break;
            case 'thief-contest':
                game.thiefContest();
                break;
            case 'thief-leave':
                game.thiefLeave();
                break;
            case 'healer-neutral-accept':
                game.healerNeutralAccept();
                break;
            case 'healer-neutral-decline':
                game.healerNeutralDecline();
                break;
            case 'continue-transition':
                game.continueFromTransition();
                break;
        }
    });
}

function bindTransitionButton() {
    const transitionBtn = document.querySelector('[data-action="continue-transition"]');
    if (transitionBtn) {
        transitionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            game.continueFromTransition();
        });
    }
}

function init() {
    ui.showContinueButton(game.hasSave());
    ui.showMenuStep('buttons');
    ui.renderCombatButtons();
    bindMenuAndSidebar();
    bindActionButtons();
    bindTransitionButton(); // Adicionar binding específico para transição
    ui.syncSettingsFromGame(game);
    initAdminPanel(game);
    
    // Garantir que game esteja disponível globalmente
    window.game = game;
    
    // Inicializar slots de save
    ui.updateSaveSlots();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Event listeners para slots de save e botões de save manual
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar listeners para slots de save
    document.querySelectorAll('.save-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            if (e.target.classList.contains('save-slot-delete')) return;
            
            const slotNum = parseInt(slot.getAttribute('data-slot'));
            const manualSaves = JSON.parse(localStorage.getItem('rpg_manual_saves') || '{}');
            const saveData = manualSaves[slotNum];
            
            if (saveData) {
                // Carregar save existente
                game.loadManualSlot(slotNum);
            } else {
                // Salvar no slot vazio
                game.saveToManualSlot(slotNum);
                ui.updateSaveSlots();
            }
        });
    });

    // Adicionar listeners para botões de deletar
    document.querySelectorAll('.save-slot-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slot = parseInt(btn.getAttribute('data-slot'));
            if (confirm('Tem certeza que deseja deletar este save?')) {
                game.deleteManualSlot(slot);
            }
        });
    });

    // Adicionar listeners para botões de save manual nas configurações
    document.querySelectorAll('[data-action="save-to-slot"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slot = parseInt(e.target.getAttribute('data-slot'));
            game.saveToManualSlot(slot);
            ui.updateSaveSlots();
        });
    });
});
