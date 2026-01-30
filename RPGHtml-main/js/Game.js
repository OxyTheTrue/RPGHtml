/**
 * Game.js - Motor principal do jogo
 * Controla loop de combate, eventos aleatórios, vitória/derrota e persistência.
 */

import { Player } from './Player.js';
import { createMonster, createMimic, MONSTER_TEMPLATES, SPECIAL_ENEMIES } from './Enemy.js';
import { buyItem as shopBuyItem } from './Shop.js';
import { UI } from './UI.js';

export const SKILL_LIST = [
    { id: 'fogo', name: 'Bola de Fogo', icon: 'fa-fire', mana: 10, color: 'var(--skill-fogo)', desc: 'Lança chamas intensas. Pode causar uma intensa queimadura.' },
    { id: 'agua', name: 'Tempestade', icon: 'fa-cloud-showers-heavy', mana: 6, color: 'var(--skill-agua)', desc: 'Chuva intensa. Chance de dano extra baseado em INT.' },
    { id: 'terra', name: 'Tempestade de Areia', icon: 'fa-mountain', mana: 8, color: 'var(--skill-terra)', desc: 'Pode causar cegueira temporária no alvo.' }
];

const TIPS = [
    'Dica: Vitalidade aumenta sua vida máxima consideravelmente.',
    'Dica: A inteligência faz você recuperar mais mana ao descansar.',
    'Dica: O Golpe Supremo carrega 20% cada vez que você apanha.',
    'Dica: Baús agora exigem uma CHAVE para abrir.',
    'Dica: Monstros podem deixar cair chaves ao serem derrotados!'
];

const SAVE_KEY = 'rpg_save';
const SETTINGS_DIFFICULTY_KEY = 'rpg_difficulty';

/** Balanceamento: XP e gold por vitória (evita progressão excessivamente rápida). */
const XP_BASE = 6;
const XP_PER_LEVEL = 1.1;
const GOLD_MIN = 2;
const GOLD_RAND = 5;
const GOLD_PER_LEVEL = 0.8;

/**
 * Sistema de drops: taxa baixa, raridade por tipo de inimigo.
 * Comum (ratazana, esqueleto...): 5% chave, 6% poção.
 * Elite (vampiro, urso): 8% chave, 8% poção.
 * Boss (demônio, dragão): 12% chave, 10% poção.
 * Valores de item (heal/mana) escalam com nível do jogador.
 */
function getDropChance(enemyName) {
    const boss = ['Demônio', 'Dragão'];
    const elite = ['Vampiro', 'Urso', 'Cavaleiro'];
    if (boss.includes(enemyName)) return { key: 0.12, potion: 0.10 };
    if (elite.includes(enemyName)) return { key: 0.08, potion: 0.08 };
    return { key: 0.05, potion: 0.06 };
}

function createDropItem(type, playerLv) {
    if (type === 'key') return { name: 'Chave Misteriosa', icon: 'fa-key', type: 'key' };
    const heal = Math.max(8, 10 + Math.floor(playerLv * 1.5));
    const manaGain = Math.max(10, 12 + Math.floor(playerLv * 1.2));
    if (type === 'potion_hp') return { name: 'Poção Vida', heal, icon: 'fa-flask' };
    if (type === 'potion_mp') return { name: 'Poção Mana', manaGain, icon: 'fa-flask-vial' };
    return null;
}

export class Game {
    constructor(ui) {
        this.ui = ui;
        this.player = null;
        this.enemy = null;
        this.isTyping = false;
        this.isDefending = false;
        this.merchantDiscount = 1;
        /** Multiplicador de dificuldade (persistido). */
        this.difficultyMult = parseFloat(localStorage.getItem(SETTINGS_DIFFICULTY_KEY) || '1', 10) || 1;
    }

    getDifficultyMult() {
        return Math.max(0.5, Math.min(2, this.difficultyMult));
    }

    setDifficultyMult(val) {
        this.difficultyMult = val;
        localStorage.setItem(SETTINGS_DIFFICULTY_KEY, String(val));
    }

    /** Salva jogador, inimigo e dificuldade no localStorage. */
    autoSave() {
        if (this.player && this.player.hp > 0) {
            const payload = {
                p: this.player.toJSON ? this.player.toJSON() : this.player,
                e: this.enemy,
                difficulty: this.difficultyMult
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        }
    }

    /** Mostra etapa do nome (ao clicar em Novo Jogo). */
    showNewGameNameStep() {
        this.ui.playSound('heal');
        this._menuStep = 'name';
        this.ui.showMenuStep('name');
        const input = document.getElementById('player-name-input');
        if (input) { input.value = ''; input.placeholder = 'Digite seu nome...'; input.focus(); }
    }

    /** Nome preenchido → mostra etapa da dificuldade. */
    menuNameNext() {
        const input = document.getElementById('player-name-input');
        const name = input ? input.value.trim() : '';
        if (!name) {
            if (input) input.placeholder = 'Digite um nome para continuar...';
            return;
        }
        this._pendingName = name || 'GUERREIRO';
        this._menuStep = 'difficulty';
        this.ui.playSound('heal');
        this.ui.showMenuStep('difficulty');
    }

    /** Voltar uma etapa no fluxo Novo Jogo (dificuldade→nome→botões). */
    menuBack() {
        this.ui.playSound('heal');
        const cur = this._menuStep || 'buttons';
        if (cur === 'difficulty') {
            this._menuStep = 'name';
            this.ui.showMenuStep('name');
        } else if (cur === 'name') {
            this._menuStep = 'buttons';
            this.ui.showMenuStep('buttons');
        }
    }

    /** Inicia o jogo com nome e dificuldade já escolhidos. */
    startNewGameWithDifficulty(difficultyMult) {
        this.setDifficultyMult(difficultyMult);
        this.player = Player.createNew(this._pendingName || 'GUERREIRO');
        this._pendingName = null;
        this.ui.setPlayerName(this.player.name);
        this.ui.showGame();
        this.ui.showMenuStep('buttons');
        this.spawnMonster();
    }

    loadGame() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw);
            this.player = Player.fromSave(saved.p);
            this.enemy = saved.e || null;
            if (typeof saved.difficulty === 'number') this.setDifficultyMult(saved.difficulty);
            this.ui.playSound('heal');
            this.ui.setPlayerName(this.player.name);
            this.ui.showGame();
            if (this.enemy && this.enemy.img) this.ui.setEnemyImage(this.enemy.img);
            this.ui.renderCombatButtons(SKILL_LIST);
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            this.ui.updateSkillSlots(this.player, SKILL_LIST);
            this.ui.syncSettingsFromGame(this);
            this.ui.typeLog('Progresso carregado!', 'heal');
        } catch (_) {
            // ignore invalid save
        }
    }

    spawnMonster() {
        this.merchantDiscount = 1;
        this.ui.renderCombatButtons(SKILL_LIST);
        const mult = this.getDifficultyMult();
        this.enemy = createMonster(this.player.lv, mult);
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.updateSkillSlots(this.player, SKILL_LIST);
        this.ui.typeLog(`${this.enemy.name} está na sua frente!`, 'spawn').then(() => this.ui.toggleButtons(false));
    }

    /** Eventos aleatórios: dificuldade altera chances (fácil = mais curandeira/mercador/baú, difícil = mais combate/ladrão). */
    triggerRandomEvent() {
        const mult = this.getDifficultyMult();
        const roll = Math.random();
        let chestChance = 0.30;
        let healerChance = 0.15;
        let merchantChance = 0.10;
        let thiefChance = 0.10;
        let archerChance = 0.10;
        if (mult < 1) {
            chestChance = 0.35;
            healerChance = 0.20;
            merchantChance = 0.15;
            thiefChance = 0.05;
            archerChance = 0.10;
        } else if (mult > 1) {
            chestChance = 0.22;
            healerChance = 0.08;
            merchantChance = 0.05;
            thiefChance = 0.20;
            archerChance = 0.08;
        }
        if (roll < chestChance) {
            this.encounterChest();
            return;
        }
        const eventRoll = Math.random();
        const base = 0;
        if (eventRoll < base + healerChance) this.encounterHealer();
        else if (eventRoll < base + healerChance + merchantChance) this.encounterMerchant();
        else if (eventRoll < base + healerChance + merchantChance + thiefChance) this.encounterThief();
        else if (eventRoll < base + healerChance + merchantChance + thiefChance + archerChance) this.encounterArcher();
        else this.spawnMonster();
    }

    async encounterChest() {
        this.enemy = SPECIAL_ENEMIES.chest();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog('Você encontrou um baú trancado!', 'loot');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `
            <button class="action-btn btn-heal" data-action="open-chest" style="grid-column: span 2">USAR CHAVE</button>
            <button class="action-btn btn-atk" data-action="ignore-chest" style="grid-column: span 2">IGNORAR</button>
        `;
    }

    async openChestChoice() {
        const keyIndex = this.player.inventory.findIndex(i => i.type === 'key');
        if (keyIndex === -1) {
            await this.ui.typeLog('Você não tem uma CHAVE no inventário!', 'damage');
            return;
        }
        this.player.removeItem(keyIndex);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });

        const mimicRoll = Math.random();
        if (mimicRoll < 0.40) {
            await this.ui.typeLog('AO ABRIR, O BAÚ SE TRANSFORMOU EM UM MÍMICO!', 'damage');
            this.spawnMimic();
        } else {
            this.ui.playSound('gold');
            const lootGold = 30 + (this.player.lv * 10);
            this.player.addGold(lootGold);
            await this.ui.typeLog(`A chave serviu! O baú continha ${lootGold} moedas!`, 'loot');
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            setTimeout(() => this.spawnMonster(), 1500);
        }
    }

    spawnMimic() {
        this.enemy = createMimic(this.player.lv, this.getDifficultyMult());
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.renderCombatButtons(SKILL_LIST);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.toggleButtons(false);
    }

    async encounterHealer() {
        this.enemy = SPECIAL_ENEMIES.healer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog("Curandeira: 'Por 5 gold, posso curar você.'", 'heal');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `
            <button class="action-btn btn-heal" data-action="healer-accept">ACEITAR (5G)</button>
            <button class="action-btn btn-atk" data-action="healer-deny">NEGAR</button>
        `;
    }

    async healerChoice(accept) {
        if (accept && this.player.gold >= 5) {
            this.player.gold -= 5;
            this.player.hp = this.player.maxHp;
            this.ui.playSound('heal');
            await this.ui.typeLog('Curado!', 'heal');
        } else {
            await this.ui.typeLog('Você segue adiante.', 'default');
        }
        this.spawnMonster();
    }

    async encounterMerchant() {
        this.merchantDiscount = 0.5;
        this.enemy = SPECIAL_ENEMIES.merchant();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog("Mercador: 'Tudo pela metade do preço enquanto eu estiver aqui!'", 'loot');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `
            <button class="action-btn btn-heal" data-action="open-shop">ABRIR LOJA</button>
            <button class="action-btn btn-atk" data-action="continue-travel">CONTINUAR VIAGEM</button>
        `;
    }

    async encounterThief() {
        const lossPercent = Math.random() * 0.3 + 0.2;
        const loss = Math.floor(this.player.gold * lossPercent);
        this.player.gold -= loss;
        this.enemy = SPECIAL_ENEMIES.thief();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.playSound('dmg');
        await this.ui.typeLog(`Um ladrão te emboscou e roubou ${loss} moedas de ouro!`, 'damage');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `<button class="action-btn btn-atk" data-action="spawn-monster" style="grid-column: span 2">PERSEGUIR PERIGOS</button>`;
    }

    async encounterArcher() {
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        this.enemy = SPECIAL_ENEMIES.archer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(`Arqueira: '${tip}'`, 'info');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `<button class="action-btn btn-atk" data-action="spawn-monster" style="grid-column: span 2">AGRADECER E IR</button>`;
    }

    async playerAction(type) {
        if (this.isTyping || this.player.hp <= 0 || typeof this.enemy.hp !== 'number') return;
        this.ui.playSound('atk');
        this.ui.toggleButtons(true);
        this.isDefending = false;
        const dmg = Math.ceil(this.player.str * (0.75 + Math.random() * 0.4));
        this.enemy.hp -= dmg;
        this.ui.applyDamageEffect();
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.isTyping = true;
        await this.ui.typeLog(`Você causou ${dmg} de dano!`, 'default');
        this.isTyping = false;
        if (this.enemy.hp <= 0) await this.win();
        else await this.enemyTurn();
    }

    async enemyTurn() {
        const dmg = Math.ceil(this.enemy.str * (0.8 + Math.random() * 0.4));
        const actual = this.player.takeDamage(dmg, this.isDefending);
        this.ui.playSound('dmg');
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.isTyping = true;
        await this.ui.typeLog(`${this.enemy.name} atacou: -${actual} HP`, 'damage');
        this.isTyping = false;
        if (this.player.hp <= 0) {
            this.ui.openDeathModal();
        } else {
            this.ui.toggleButtons(false);
        }
    }

    playerHeal() {
        if (this.player.mana < 5) return;
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        this.player.spendMana(5);
        const cura = Math.floor(this.player.int * 1.7);
        this.player.heal(cura);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog(`Curou: +${cura} HP`, 'heal').then(() => this.enemyTurn());
    }

    playerDefend() {
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        this.isDefending = true;
        this.ui.typeLog('Defendendo...', 'default').then(() => this.enemyTurn());
    }

    playerRest() {
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        const ganho = Math.floor(this.player.int * 1.0);
        this.player.restoreMana(ganho);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog(`Descansou: +${ganho} Mana`, 'heal').then(() => this.enemyTurn());
    }

    useUltimate() {
        if (this.player.furia < 100) return;
        this.ui.playSound('magic');
        this.ui.toggleButtons(true);
        const dmg = Math.ceil(this.player.str * 2.2);
        this.enemy.hp -= dmg;
        this.player.furia = 0;
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog('GOLPE SUPREMO!', 'loot').then(() => {
            if (this.enemy.hp <= 0) this.win();
            else this.enemyTurn();
        });
    }

    async useSkill(index) {
        if (this.isTyping || !this.player.skills[index] || this.player.hp <= 0 || typeof this.enemy.hp !== 'number') return;
        const pSkill = this.player.skills[index];
        const sData = SKILL_LIST.find(s => s.id === pSkill.id);
        const manaCost = sData.mana + (pSkill.level - 1) * 5;
        if (!this.player.spendMana(manaCost)) {
            this.ui.playSound('dmg');
            return;
        }
        this.ui.playSound('magic');
        this.ui.toggleButtons(true);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });

        let dmg = 0;
        if (pSkill.id === 'fogo') dmg = Math.ceil(this.player.int * (1.2 + (pSkill.level * 0.4)));
        else if (pSkill.id === 'agua') dmg = Math.ceil(this.player.int * (1.0 + (pSkill.level * 0.2)));
        else if (pSkill.id === 'terra') dmg = 5 + (pSkill.level * 2);

        this.enemy.hp -= dmg;
        this.ui.applyDamageEffect();
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.isTyping = true;
        await this.ui.typeLog(`${sData.name.toUpperCase()}: ${dmg} de dano!`, sData.color);
        this.isTyping = false;
        if (this.enemy.hp <= 0) await this.win();
        else await this.enemyTurn();
    }

    async useItem(index) {
        if (this.isTyping || !this.player.inventory[index] || this.player.hp <= 0) return;
        const item = this.player.inventory[index];
        this.ui.playSound('heal');

        if (item.type === 'key') {
            await this.ui.typeLog('Isso é uma chave. Procure algo para abrir!', 'loot');
            return;
        }

        if (item.heal) this.player.heal(item.heal);
        else if (item.manaGain) this.player.mana = Math.min(this.player.maxMana, this.player.mana + item.manaGain);
        else if (item.type) this.player.buffs[item.type] = item.dur;

        this.player.removeItem(index);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(`Usou ${item.name}!`, 'info');
    }

    spendPoint(stat) {
        if (!this.player || this.player.pendingPoints <= 0) return;
        const result = this.player.spendPoint(stat);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        if (result === 'level_up') {
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            this.triggerRandomEvent();
        }
        this.autoSave();
    }

    async win() {
        this.ui.playSound('gold');
        const mult = this.getDifficultyMult();
        const xpBase = Math.floor(XP_BASE + this.player.lv * XP_PER_LEVEL);
        const xpGanha = Math.max(1, Math.floor(xpBase * mult));
        const goldGanho = GOLD_MIN + Math.floor(Math.random() * GOLD_RAND) + Math.floor(this.player.lv * GOLD_PER_LEVEL);
        this.player.addGold(goldGanho);
        const leveledUp = this.player.addXp(xpGanha);
        await this.ui.typeLog(`Venceu! +${xpGanha} XP | +${goldGanho} Gold`, 'win');

        const drop = getDropChance(this.enemy.name || '');
        const dropMult = mult < 1 ? 1.35 : mult > 1 ? 0.7 : 1;
        const keyChance = Math.min(0.99, drop.key * dropMult);
        const potionChance = Math.min(0.99, drop.potion * dropMult);
        const roll = Math.random();
        if (this.player.inventory.length < 5) {
            if (roll < keyChance) {
                this.player.addItem(createDropItem('key'));
                await this.ui.typeLog('O inimigo derrubou uma CHAVE!', 'loot');
            } else if (roll < keyChance + potionChance) {
                const potType = Math.random() < 0.5 ? 'potion_hp' : 'potion_mp';
                const item = createDropItem(potType, this.player.lv);
                if (item && this.player.addItem(item)) {
                    await this.ui.typeLog(`Drop: ${item.name}!`, 'loot');
                }
            }
        } else if (roll < keyChance + potionChance) {
            await this.ui.typeLog('O monstro tinha um item, mas sua bolsa está cheia!', 'damage');
        }

        if (leveledUp) {
            await this.ui.typeLog('LEVEL UP! Melhore seus atributos.', 'loot');
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        } else {
            this.triggerRandomEvent();
        }
        this.autoSave();
    }

    buyItem(type, btnElement) {
        const result = shopBuyItem(type, this.player, this.merchantDiscount);
        if (result.success) {
            this.ui.playSound('gold');
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        } else if (btnElement) {
            this.ui.blinkButtonError(btnElement);
        }
    }

    openShop() {
        if (!this.player || this.player.hp <= 0) return;
        this.ui.openShopModal();
    }

    openSkillTree() {
        if (!this.player || this.player.hp <= 0) return;
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.openOverlay();
        this.ui.openSkillModal();
        this.ui.renderSkillTree(SKILL_LIST, this.player, (skill) => this.openSkillDetail(skill));
    }

    /** Abre detalhe da skill. Bloqueia APRENDER se requisitos não atendidos (lv ou pontos). */
    openSkillDetail(skill) {
        const playerSkill = this.player.skills.find(ps => ps.id === skill.id);
        const currentLv = playerSkill ? playerSkill.level : 0;
        const nextLv = currentLv + 1;
        const reqLv = nextLv === 1 ? 5 : 5 * nextLv;
        const contentHtml = this.ui.getSkillDetailContent(skill, this.player, reqLv);
        const learnDisabled = this.player.skillPoints <= 0 || this.player.lv < reqLv;
        const onLearn = () => this.learnSkill(skill, reqLv);
        this.ui.openSkillDetailModal(contentHtml, learnDisabled, onLearn);
    }

    learnSkill(skillData, reqLv) {
        if (this.player.skillPoints <= 0 || this.player.lv < reqLv) return;
        if (this.player.learnSkill(skillData.id, reqLv)) {
            this.ui.playSound('gold');
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            this.ui.closeSkillDetailModal();
            this.ui.renderSkillTree(SKILL_LIST, this.player, (skill) => this.openSkillDetail(skill));
        }
    }

    closeDetailModal() {
        this.ui.closeSkillDetailModal();
    }

    openSettings() {
        this.ui.openSettingsModal(this);
    }

    /** Salva manualmente no localStorage e exibe feedback (só se houver progresso). */
    manualSave() {
        if (this.player && this.player.hp > 0) {
            this.autoSave();
            this.ui.showSaveFeedback();
        }
    }

    closeAllModals() {
        this.ui.closeAllModals();
    }

    restartAfterDeath() {
        this.player.resetAfterDeath();
        this.closeAllModals();
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.spawnMonster();
    }

    exitToMenu() {
        location.reload();
    }

    saveAndExit() {
        this.autoSave();
        location.reload();
    }

    /** Retorna se há save para continuar. */
    hasSave() {
        return !!localStorage.getItem(SAVE_KEY);
    }
}
