/**
 * Game.js - Motor principal. Usa GameConfig e DialogueData (Admin).
 */

import { Player } from './Player.js';
import { createMonster, createMimic, createThief, SPECIAL_ENEMIES } from './Enemy.js';
import { buyItem as shopBuyItem } from './Shop.js';
import { UI } from './UI.js';
import { getConfig } from './GameConfig.js';
import { get as getD, apply as applyD } from './DialogueData.js';

export const SKILL_LIST = [
    { id: 'fogo', name: 'Bola de Fogo', icon: 'fa-fire', mana: 10, color: 'var(--skill-fogo)', desc: 'Lança chamas intensas. Pode causar uma intensa queimadura.' },
    { id: 'agua', name: 'Tempestade', icon: 'fa-cloud-showers-heavy', mana: 6, color: 'var(--skill-agua)', desc: 'Chuva intensa. Chance de dano extra baseado em INT.' },
    { id: 'terra', name: 'Tempestade de Areia', icon: 'fa-mountain', mana: 8, color: 'var(--skill-terra)', desc: 'Pode causar cegueira temporária no alvo.' }
];

const SAVE_KEY = 'rpg_save';
const SETTINGS_DIFFICULTY_KEY = 'rpg_difficulty';

function getDropChance(enemyName) {
    const d = getConfig().drops;
    const boss = ['Demônio', 'Dragão'];
    const elite = ['Vampiro', 'Urso', 'Cavaleiro'];
    if (boss.includes(enemyName)) return { key: d.bossKey, potion: d.bossPotion };
    if (elite.includes(enemyName)) return { key: d.eliteKey, potion: d.elitePotion };
    return { key: d.commonKey, potion: d.commonPotion };
}

function createDropItem(type, playerLv) {
    const pot = getConfig().potion;
    if (type === 'key') return { name: 'Chave Misteriosa', icon: 'fa-key', type: 'key' };
    const heal = Math.max(8, pot.hpBase + Math.floor(playerLv * pot.hpPerLv));
    const manaGain = Math.max(10, pot.manaBase + Math.floor(playerLv * pot.manaPerLv));
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

    /** Eventos aleatórios. Chances vêm de GameConfig (events.normal/easy/hard). */
    triggerRandomEvent(forceType = null) {
        if (forceType) {
            if (forceType === 'chest') return this.encounterChest();
            if (forceType === 'healer') return this.encounterHealer();
            if (forceType === 'merchant') return this.encounterMerchant();
            if (forceType === 'thief') return this.encounterThief();
            if (forceType === 'archer') return this.encounterArcher();
            if (forceType === 'monster') return this.spawnMonster();
            return;
        }
        const mult = this.getDifficultyMult();
        const ev = mult < 1 ? getConfig().events.easy : mult > 1 ? getConfig().events.hard : getConfig().events.normal;
        const roll = Math.random();
        if (roll < ev.chest) { this.encounterChest(); return; }
        const r2 = Math.random();
        const t = ev.chest;
        if (r2 < t + ev.healer) this.encounterHealer();
        else if (r2 < t + ev.healer + ev.merchant) this.encounterMerchant();
        else if (r2 < t + ev.healer + ev.merchant + ev.thief) this.encounterThief();
        else if (r2 < t + ev.healer + ev.merchant + ev.thief + ev.archer) this.encounterArcher();
        else this.spawnMonster();
    }

    async encounterChest() {
        this.enemy = SPECIAL_ENEMIES.chest();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(getD('chest.intro'), 'loot');
        const container = document.getElementById('action-buttons');
        container.innerHTML = `
            <button class="action-btn btn-heal" data-action="open-chest" style="grid-column: span 2">USAR CHAVE</button>
            <button class="action-btn btn-atk" data-action="ignore-chest" style="grid-column: span 2">IGNORAR</button>
        `;
    }

    async openChestChoice() {
        const keyIndex = this.player.inventory.findIndex(i => i.type === 'key');
        if (keyIndex === -1) {
            await this.ui.typeLog(getD('chest.noKey'), 'damage');
            return;
        }
        this.player.removeItem(keyIndex);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        const c = getConfig().chest;
        const mimicRoll = Math.random();
        if (mimicRoll < c.mimicChance) {
            await this.ui.typeLog(getD('chest.mimic'), 'damage');
            this.spawnMimic();
        } else {
            this.ui.playSound('gold');
            const lootGold = c.goldBase + this.player.lv * c.goldPerLv;
            this.player.addGold(lootGold);
            await this.ui.typeLog(applyD(getD('chest.success'), { gold: lootGold }), 'loot');
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

    async npcChoice(npc, tone) {
        if (npc === 'healer') return this.npcChoiceHealer(tone);
        if (npc === 'merchant') return this.npcChoiceMerchant(tone);
        if (npc === 'thief') return this.npcChoiceThief(tone);
        if (npc === 'archer') return this.npcChoiceArcher(tone);
    }

    _renderNpcChoices(npc) {
        const c = document.getElementById('action-buttons');
        c.innerHTML = `
            <button class="action-btn btn-heal" data-action="npc-choice" data-npc="${npc}" data-tone="amigavel">
                <i class="fa-solid fa-face-smile"></i> SER AMIGÁVEL
            </button>
            <button class="action-btn btn-atk" data-action="npc-choice" data-npc="${npc}" data-tone="rude">
                <i class="fa-solid fa-face-angry"></i> SER RUDE
            </button>
            <button class="action-btn btn-def" data-action="npc-choice" data-npc="${npc}" data-tone="neutro">
                <i class="fa-solid fa-face-meh"></i> SER NEUTRO
            </button>
            <button class="action-btn btn-def" data-action="npc-choice" data-npc="${npc}" data-tone="ignorar" style="grid-column: span 2">
                <i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i> IGNORAR
            </button>
        `;
    }

    /** Curandeira: diálogos em DialogueData. */
    async encounterHealer() {
        this.enemy = SPECIAL_ENEMIES.healer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        const fullHp = this.player.hp >= this.player.maxHp;
        await this.ui.typeLog(fullHp ? getD('healer.introFullHp') : getD('healer.introInjured'), 'heal');
        this._npc = 'healer';
        this._healerFullHp = fullHp;
        this._renderNpcChoices('healer');
    }

    async npcChoiceHealer(tone) {
        const fullHp = this._healerFullHp;
        const cost = getConfig().healer.cost;
        if (tone === 'amigavel') {
            await this.ui.typeLog(getD('healer.amigavel.player'), 'info');
            if (fullHp) {
                await this.ui.typeLog(getD('healer.amigavel.npcFullHp'), 'heal');
            } else {
                this.player.hp = this.player.maxHp;
                this.ui.playSound('heal');
                await this.ui.typeLog(getD('healer.amigavel.npcInjured'), 'heal');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            }
            this.spawnMonster();
            return;
        }
        if (tone === 'rude') {
            await this.ui.typeLog(getD('healer.rude.player'), 'damage');
            await this.ui.typeLog(getD('healer.rude.npc'), 'damage');
            this.spawnMonster();
            return;
        }
        if (tone === 'neutro') {
            await this.ui.typeLog(getD('healer.neutro.player'), 'default');
            if (fullHp) {
                await this.ui.typeLog(getD('healer.neutro.npcFullHp'), 'heal');
                this.spawnMonster();
                return;
            }
            await this.ui.typeLog(getD('healer.neutro.npcOffer'), 'heal');
            this._npcPhase = 1;
            const canPay = this.player.gold >= cost;
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="healer-neutral-accept" ${!canPay ? 'disabled' : ''}>ACEITAR (${cost}G)</button>
                <button class="action-btn btn-def" data-action="healer-neutral-decline">RECUSAR</button>
            `;
            return;
        }
        if (tone === 'ignorar') {
            await this.ui.typeLog(getD('healer.ignorar.player'), 'default');
            await this.ui.typeLog(getD('healer.ignorar.npc'), 'heal');
            this.spawnMonster();
        }
    }

    async healerNeutralAccept() {
        const cost = getConfig().healer.cost;
        if (this.player.gold < cost) return;
        this.player.gold -= cost;
        this.player.hp = this.player.maxHp;
        this.ui.playSound('heal');
        await this.ui.typeLog(getD('healer.neutro.npcAccept'), 'heal');
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.spawnMonster();
    }

    async healerNeutralDecline() {
        await this.ui.typeLog(getD('healer.neutro.npcDecline'), 'heal');
        this.spawnMonster();
    }

    /** Mercador: estrada, bandidos. Amigável → loja 50% + poção grátis. Rude → não abre. Neutro → loja 50%. Ignorar → segue. */
    async encounterMerchant() {
        this.merchantDiscount = getConfig().merchant.discount;
        this.enemy = SPECIAL_ENEMIES.merchant();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(getD('merchant.intro'), 'loot');
        this._npc = 'merchant';
        this._renderNpcChoices('merchant');
    }

    async npcChoiceMerchant(tone) {
        if (tone === 'amigavel') {
            await this.ui.typeLog(getD('merchant.amigavel.player'), 'info');
            await this.ui.typeLog(getD('merchant.amigavel.npc'), 'loot');
            const pot = createDropItem('potion_hp', this.player.lv);
            if (pot && this.player.inventory.length < 5) this.player.addItem(pot);
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="open-shop"><i class="fa-solid fa-store"></i> ABRIR LOJA</button>
                <button class="action-btn btn-def" data-action="continue-travel"><i class="fa-solid fa-road"></i> CONTINUAR</button>
            `;
            return;
        }
        if (tone === 'rude') {
            await this.ui.typeLog(getD('merchant.rude.player'), 'damage');
            await this.ui.typeLog(getD('merchant.rude.npc'), 'damage');
            this.spawnMonster();
            return;
        }
        if (tone === 'neutro') {
            await this.ui.typeLog(getD('merchant.neutro.player'), 'default');
            await this.ui.typeLog(getD('merchant.neutro.npc'), 'loot');
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="open-shop"><i class="fa-solid fa-store"></i> ABRIR LOJA</button>
                <button class="action-btn btn-def" data-action="continue-travel"><i class="fa-solid fa-road"></i> CONTINUAR</button>
            `;
            return;
        }
        if (tone === 'ignorar') {
            await this.ui.typeLog(getD('merchant.ignorar.player'), 'default');
            await this.ui.typeLog(getD('merchant.ignorar.npc'), 'heal');
            this.spawnMonster();
        }
    }

    /** Ladrão: diálogos em DialogueData; thief config em GameConfig. */
    async encounterThief() {
        this.enemy = SPECIAL_ENEMIES.thief();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(getD('thief.intro'), 'damage');
        this._npc = 'thief';
        this._renderNpcChoices('thief');
    }

    async npcChoiceThief(tone) {
        const tc = getConfig().thief;
        if (tone === 'amigavel') {
            await this.ui.typeLog(getD('thief.amigavel.player'), 'info');
            const offer = Math.min(tc.friendlyOfferCap, Math.max(1, Math.floor(this.player.gold * tc.friendlyOfferPct)));
            if (this.player.gold >= 1) {
                this.player.gold -= offer;
                await this.ui.typeLog(applyD(getD('thief.amigavel.npcGold'), { offer }), 'heal');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            } else {
                await this.ui.typeLog(getD('thief.amigavel.npcNoGold'), 'default');
            }
            this.spawnMonster();
            return;
        }
        if (tone === 'rude') {
            await this.ui.typeLog(getD('thief.rude.player'), 'damage');
            await this.ui.typeLog(getD('thief.rude.npc'), 'damage');
            this._thiefStolen = { gold: 0, item: null };
            this.thiefContest();
            return;
        }
        this._doThiefRobbery(tone);
    }

    async _doThiefRobbery(tone) {
        if (tone === 'neutro') {
            await this.ui.typeLog(getD('thief.neutro.player'), 'default');
        } else {
            await this.ui.typeLog(getD('thief.ignorar.player'), 'default');
            await this.ui.typeLog(getD('thief.ignorar.npc'), 'damage');
        }
        this.ui.playSound('dmg');
        const tc = getConfig().thief;
        const hasGold = this.player.gold > 0;
        const hasItems = this.player.inventory.length > 0;
        this._thiefStolen = { gold: 0, item: null };
        if (hasGold && (!hasItems || Math.random() < 0.5)) {
            const pct = tc.goldPctMin + Math.random() * (tc.goldPctMax - tc.goldPctMin);
            const loss = Math.max(1, Math.floor(this.player.gold * pct));
            this.player.gold -= loss;
            this._thiefStolen.gold = loss;
            await this.ui.typeLog(applyD(getD('thief.robberyGold'), { loss }), 'damage');
        } else if (hasItems) {
            const idx = Math.floor(Math.random() * this.player.inventory.length);
            const item = this.player.removeItem(idx);
            this._thiefStolen.item = item;
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            await this.ui.typeLog(applyD(getD('thief.robberyItem'), { itemName: item.name }), 'damage');
        } else {
            await this.ui.typeLog(getD('thief.robberyNone'), 'default');
            this.spawnMonster();
            return;
        }
        const c = document.getElementById('action-buttons');
        c.innerHTML = `
            <button class="action-btn btn-atk" data-action="thief-contest"><i class="fa-solid fa-sword"></i> CONTESTAR (LUTAR)</button>
            <button class="action-btn btn-def" data-action="thief-leave"><i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i> DEIXAR IR</button>
        `;
    }

    async thiefLeave() {
        await this.ui.typeLog(getD('thief.leave'), 'default');
        this._thiefStolen = null;
        this.spawnMonster();
    }

    thiefContest() {
        this._thiefContestMode = true;
        this.enemy = createThief(this.player.lv, this.getDifficultyMult());
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.renderCombatButtons(SKILL_LIST);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.updateSkillSlots(this.player, SKILL_LIST);
        this.ui.typeLog(getD('thief.contest'), 'spawn').then(() => this.ui.toggleButtons(false));
    }

    /** Arqueira: diálogos e dicas em DialogueData. */
    async encounterArcher() {
        this.enemy = SPECIAL_ENEMIES.archer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog(getD('archer.intro'), 'info');
        this._npc = 'archer';
        const tips = getD('archer.tips');
        this._archerTip = Array.isArray(tips) && tips.length ? tips[Math.floor(Math.random() * tips.length)] : '';
        this._renderNpcChoices('archer');
    }

    async npcChoiceArcher(tone) {
        const tip = this._archerTip || '';
        if (tone === 'amigavel') {
            await this.ui.typeLog(getD('archer.amigavel.player'), 'info');
            await this.ui.typeLog(`Arqueira: "${tip}" ${getD('archer.amigavel.npcSuffix')}`, 'heal');
        } else if (tone === 'neutro') {
            await this.ui.typeLog(getD('archer.neutro.player'), 'default');
            await this.ui.typeLog(`Arqueira: "${tip}"`, 'info');
        } else if (tone === 'rude') {
            await this.ui.typeLog(getD('archer.rude.player'), 'damage');
            await this.ui.typeLog(getD('archer.rude.npc'), 'damage');
        } else {
            await this.ui.typeLog(getD('archer.ignorar.player'), 'default');
            await this.ui.typeLog(getD('archer.ignorar.npc'), 'heal');
        }
        this.spawnMonster();
    }

    async playerAction(type) {
        if (this.isTyping || this.player.hp <= 0 || typeof this.enemy.hp !== 'number') return;
        const co = getConfig().combat;
        this.ui.playSound('atk');
        this.ui.toggleButtons(true);
        this.isDefending = false;
        const dmg = Math.ceil(this.player.str * (co.atkMin + Math.random() * (co.atkMax - co.atkMin)));
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
        const co = getConfig().combat;
        const dmg = Math.ceil(this.enemy.str * (co.enemyAtkMin + Math.random() * (co.enemyAtkMax - co.enemyAtkMin)));
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
        const sk = getConfig().skills;
        if (this.player.mana < sk.healMana) return;
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        this.player.spendMana(sk.healMana);
        const cura = Math.floor(this.player.int * sk.healMult);
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
        const ganho = Math.floor(this.player.int * getConfig().skills.restMult);
        this.player.restoreMana(ganho);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog(`Descansou: +${ganho} Mana`, 'heal').then(() => this.enemyTurn());
    }

    useUltimate() {
        if (this.player.furia < 100) return;
        this.ui.playSound('magic');
        this.ui.toggleButtons(true);
        const dmg = Math.ceil(this.player.str * getConfig().skills.ultMult);
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
            await this.ui.typeLog(getD('chest.keyUse'), 'loot');
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
        if (this._thiefContestMode && this._thiefStolen) {
            this.ui.playSound('gold');
            const s = this._thiefStolen;
            if (s.gold) {
                this.player.addGold(s.gold);
                await this.ui.typeLog(`Você derrotou o ladrão e recuperou ${s.gold} moedas!`, 'win');
            }
            if (s.item) {
                this.player.addItem(s.item);
                await this.ui.typeLog(`Você recuperou sua ${s.item.name}!`, 'loot');
            }
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            const xpCfg = getConfig().xp;
            const xpBase = Math.floor(xpCfg.base + this.player.lv * xpCfg.perLevel);
            const xpGanha = Math.max(1, Math.floor(xpBase * this.getDifficultyMult()));
            const leveledUp = this.player.addXp(xpGanha);
            if (leveledUp) {
                await this.ui.typeLog('LEVEL UP! Melhore seus atributos.', 'loot');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            }
            this._thiefContestMode = false;
            this._thiefStolen = null;
            this.triggerRandomEvent();
            this.autoSave();
            return;
        }

        this.ui.playSound('gold');
        const mult = this.getDifficultyMult();
        const xpCfg = getConfig().xp;
        const goldCfg = getConfig().gold;
        const xpBase = Math.floor(xpCfg.base + this.player.lv * xpCfg.perLevel);
        const xpGanha = Math.max(1, Math.floor(xpBase * mult));
        const goldGanho = goldCfg.min + Math.floor(Math.random() * goldCfg.rand) + Math.floor(this.player.lv * goldCfg.perLevel);
        this.player.addGold(goldGanho);
        const leveledUp = this.player.addXp(xpGanha);
        await this.ui.typeLog(`Venceu! +${xpGanha} XP | +${goldGanho} Gold`, 'win');

        const drop = getDropChance(this.enemy.name || '');
        const dm = getConfig().dropMult;
        const dropMult = mult < 1 ? dm.easy : mult > 1 ? dm.hard : 1;
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
        this._thiefContestMode = false;
        this._thiefStolen = null;
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
