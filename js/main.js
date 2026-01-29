/**
 * main.js - Ponto de entrada do RPG (ES6 Modules)
 * Conecta Game, UI, Shop e eventos do DOM.
 */

import { Game } from './Game.js';
import { UI } from './UI.js';

const ui = new UI();
const game = new Game(ui);

function bindMenuAndSidebar() {
    const startBtn = document.querySelector('[data-action="start-new"]');
    if (startBtn) startBtn.addEventListener('click', () => game.startNewGame());

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) continueBtn.addEventListener('click', () => game.loadGame());

    document.getElementById('overlay').addEventListener('click', () => game.closeAllModals());

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
}

function bindActionButtons() {
    const container = document.getElementById('action-buttons');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !game.player || game.player.hp <= 0) return;

        const action = btn.getAttribute('data-action');
        if (!action) return;

        switch (action) {
            case 'attack':
                game.playerAction('fisico');
                break;
            case 'heal':
                game.playerHeal();
                break;
            case 'defend':
                game.playerDefend();
                break;
            case 'rest':
                game.playerRest();
                break;
            case 'ultimate':
                game.useUltimate();
                break;
            case 'skill': {
                const index = parseInt(btn.getAttribute('data-skill-index'), 10);
                if (!isNaN(index)) game.useSkill(index);
                break;
            }
            case 'open-chest':
                game.openChestChoice();
                break;
            case 'ignore-chest':
                game.spawnMonster();
                break;
            case 'healer-accept':
                game.healerChoice(true);
                break;
            case 'healer-deny':
                game.healerChoice(false);
                break;
            case 'open-shop':
                game.openShop();
                break;
            case 'continue-travel':
            case 'spawn-monster':
                game.spawnMonster();
                break;
        }
    });
}

function init() {
    ui.showContinueButton(game.hasSave());
    ui.renderCombatButtons();
    bindMenuAndSidebar();
    bindActionButtons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
