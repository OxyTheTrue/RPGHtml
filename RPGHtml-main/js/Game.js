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

// Mapeamento de IDs de habilidades para imagens
export const SKILL_IMAGES = {
    'fogo': 'habilidades/bola de fogo.png',
    'agua': 'habilidades/tempestade.png',
    'terra': 'habilidades/tempestade de areia.png'
};

const SAVE_KEY = 'rpg_save';
const MANUAL_SAVES_KEY = 'rpg_manual_saves';
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
    if (type === 'key') return { name: 'Chave Misteriosa', icon: 'fa-key', type: 'key', img: 'itens/chave.png' };
    const heal = Math.max(8, pot.hpBase + Math.floor(playerLv * pot.hpPerLv));
    const manaGain = Math.max(10, pot.manaBase + Math.floor(playerLv * pot.manaPerLv));
    if (type === 'potion_hp') return { name: 'Poção Vida', heal, icon: 'fa-flask', img: 'itens/pocao.png' };
    if (type === 'potion_mana') return { name: 'Poção Mana', manaGain, icon: 'fa-flask-vial', img: 'itens/pocao de mana.png' };
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
                difficulty: this.difficultyMult,
                // Estado dos eventos
                _npc: this._npc,
                _npcPhase: this._npcPhase,
                _healerFullHp: this._healerFullHp,
                _thiefContestMode: this._thiefContestMode,
                _thiefStolen: this._thiefStolen,
                _archerTip: this._archerTip
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

    /** Voltar uma etapa no fluxo Novo Jogo (dificuldade→nome→botões, load→botões). */
    menuBack() {
        this.ui.playSound('heal');
        const cur = this._menuStep || 'buttons';
        if (cur === 'difficulty') {
            this._menuStep = 'name';
            this.ui.showMenuStep('name');
        } else if (cur === 'name') {
            this._menuStep = 'buttons';
            this.ui.showMenuStep('buttons');
        } else if (cur === 'load') {
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
        this.ui.setPlayerImage('player/Player.png'); // Definir imagem do player
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
            if (typeof saved.difficulty === 'number') {
                this.setDifficultyMult(saved.difficulty);
                
                // Restaurar estado dos eventos
                this._npc = saved._npc || null;
                this._npcPhase = saved._npcPhase || null;
                this._healerFullHp = saved._healerFullHp || false;
                this._thiefContestMode = saved._thiefContestMode || false;
                this._thiefStolen = saved._thiefStolen || null;
                this._archerTip = saved._archerTip || '';
                
                this.ui.setPlayerName(this.player.name);
                this.ui.setPlayerImage('player/Player.png'); // Definir imagem do player
                this.ui.showGame();
                this.ui.showMenuStep('buttons');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
                this.ui.updateSkillSlots(this.player, SKILL_LIST);
                this.ui.toggleButtons(false);
                
                if (this._npc && this._npc !== 'thief') {
                    // Restaurar evento NPC existente
                    this._restoreNpcEvent();
                } else if (this.enemy && this.enemy.hp > 0) {
                    // Restaurar inimigo existente
                    this.ui.setEnemyImage(this.enemy.img); // Restaurar imagem do inimigo
                    this.ui.typeLog(`${this.enemy.name} está na sua frente!`, 'spawn').then(() => this.ui.toggleButtons(false));
                } else {
                    // Spawna novo inimigo
                    this.spawnMonster();
                }
            }
            this.ui.typeLog('Progresso carregado!', 'heal');
        } catch (_) {
            // ignore invalid save
        }
    }

    /** Restaura o estado do evento NPC ao carregar save */
    _restoreNpcEvent() {
        switch (this._npc) {
            case 'healer':
                this._restoreHealerEvent();
                break;
            case 'merchant':
                this._restoreMerchantEvent();
                break;
            case 'archer':
                this._restoreArcherEvent();
                break;
            case 'thief':
                // Thief é tratado separadamente pois envolve combate
                if (this._thiefContestMode) {
                    this._restoreThiefContest();
                } else {
                    this._restoreThiefEvent();
                }
                break;
            default:
                this.spawnMonster();
        }
    }

    /** Restaura evento da curandeira */
    _restoreHealerEvent() {
        this.enemy = SPECIAL_ENEMIES.healer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        const fullHp = this._healerFullHp;
        this.ui.typeLog(fullHp ? getD('healer.introFullHp') : getD('healer.introInjured'), 'heal');
        
        if (this._npcPhase === 1) {
            // Restaurar fase de negociação da curandeira
            const cost = getConfig().healer.cost;
            const canPay = this.player.gold >= cost;
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="npc-choice" data-npc="healer" data-tone="neutro-accept">
                    <i class="fa-solid fa-coins"></i> PAGAR ${cost} OURO
                </button>
                <button class="action-btn btn-def" data-action="npc-choice" data-npc="healer" data-tone="neutro-decline">
                    <i class="fa-solid fa-times"></i> RECUSAR
                </button>
            `;
            bindActionButtons();
        } else {
            // Restaurar fase inicial da curandeira
            this._renderNpcChoices('healer');
        }
    }

    /** Restora evento do mercador */
    _restoreMerchantEvent() {
        this.enemy = SPECIAL_ENEMIES.merchant();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog(getD('merchant.intro'), 'loot');
        this._renderNpcChoices('merchant');
    }

    /** Restora evento do arqueiro */
    _restoreArcherEvent() {
        this.enemy = SPECIAL_ENEMIES.archer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.typeLog(getD('archer.intro'), 'info');
        this._renderNpcChoices('archer');
    }

    /** Restora evento do ladrão */
    _restoreThiefEvent() {
        this.enemy = SPECIAL_ENEMIES.thief();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        if (this._thiefStolen && (this._thiefStolen.gold > 0 || this._thiefStolen.item)) {
            // Restaurar estado pós-roubo
            const s = this._thiefStolen;
            if (s.gold) {
                this.ui.typeLog(applyD(getD('thief.robberyGold'), { loss: s.gold }), 'damage');
            } else if (s.item) {
                this.ui.typeLog(applyD(getD('thief.robberyItem'), { itemName: s.item.name }), 'damage');
            }
            
            // Mostrar opções pós-roubo
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-atk" data-action="npc-choice" data-npc="thief" data-tone="contest">
                    <i class="fa-solid fa-sword"></i> ENFRENTAR
                </button>
                <button class="action-btn btn-def" data-action="npc-choice" data-npc="thief" data-tone="leave">
                    <i class="fa-solid fa-walking"></i> DEIXAR IR
                </button>
            `;
            bindActionButtons();
        } else {
            // Restaurar encontro inicial do ladrão
            this.ui.typeLog(getD('thief.intro'), 'damage');
            this._renderNpcChoices('thief');
        }
    }

    /** Restora combate com ladrão */
    _restoreThiefContest() {
        this.enemy = createThief(this.player.lv, this.getDifficultyMult());
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.renderCombatButtons(SKILL_LIST);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.ui.toggleButtons(false);
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
        
        // Sistema de dano flutuante e efeitos
        this.ui.showFloatingDamage('enemy', dmg, 'damage');
        this.ui.applyDamageEffect('enemy');
        this.ui.animateEnemyDamage(); // Animação de dano do inimigo
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.isTyping = true;
        
        if (this.enemy.hp <= 0) await this.win();
        else {
            // Atraso de 1 segundo antes do turno do inimigo
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.enemyTurn();
        }
        this.isTyping = false;
    }

    async enemyTurn() {
        const co = getConfig().combat;
        const dmg = Math.ceil(this.enemy.str * (co.enemyAtkMin + Math.random() * (co.enemyAtkMax - co.enemyAtkMin)));
        const actual = this.player.takeDamage(dmg, this.isDefending);
        this.ui.playSound('dmg');
        
        // Sistema de dano flutuante e efeitos
        this.ui.showFloatingDamage('player', actual, 'damage');
        this.ui.applyDamageEffect('player');
        this.ui.animatePlayerDamage(); // Animação de dano do player
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.isTyping = true;
        
        if (this.player.hp <= 0) {
            this.ui.openDeathModal();
        } else {
            this.ui.toggleButtons(false);
        }
        this.isTyping = false;
    }

    playerHeal() {
        const sk = getConfig().skills;
        if (this.player.mana < sk.healMana) return;
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        this.player.spendMana(sk.healMana);
        const cura = Math.floor(this.player.int * sk.healMult);
        this.player.heal(cura);
        
        // Sistema de cura flutuante e efeitos
        this.ui.showFloatingDamage('player', cura, 'heal');
        this.ui.applyHealEffect('player');
        this.ui.animatePlayerHeal(); // Animação de cura do player
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        // Atraso de 1 segundo antes do turno do inimigo
        setTimeout(() => this.enemyTurn(), 1000);
    }

    playerDefend() {
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        this.isDefending = true;
        this.ui.animatePlayerDefend(); // Animação de defesa do player
        setTimeout(() => this.enemyTurn(), 1000);
    }

    playerRest() {
        this.ui.playSound('heal');
        this.ui.toggleButtons(true);
        const ganho = Math.floor(this.player.int * getConfig().skills.restMult);
        this.player.restoreMana(ganho);
        
        // Sistema de mana flutuante e efeitos
        this.ui.showFloatingDamage('player', ganho, 'mana');
        this.ui.applyHealEffect('player');
        this.ui.animatePlayerRest(); // Animação de descanso do player
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        // Atraso de 1 segundo antes do turno do inimigo
        setTimeout(() => this.enemyTurn(), 1000);
    }

    useUltimate() {
        if (this.player.furia < 100) return;
        this.ui.playSound('magic');
        this.ui.toggleButtons(true);
        const dmg = Math.ceil(this.player.str * getConfig().skills.ultMult);
        this.enemy.hp -= dmg;
        this.player.furia = 0;
        
        // Sistema de dano flutuante e efeitos
        this.ui.showFloatingDamage('enemy', dmg, 'damage');
        this.ui.applyDamageEffect('enemy');
        this.ui.animatePlayerUltimate(); // Animação de golpe de fúria
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        if (this.enemy.hp <= 0) this.win();
        else {
            // Atraso de 1 segundo antes do turno do inimigo
            setTimeout(() => this.enemyTurn(), 1000);
        }
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
        
        // Sistema de dano flutuante e efeitos
        this.ui.showFloatingDamage('enemy', dmg, 'damage');
        this.ui.applyDamageEffect('enemy');
        this.ui.animateEnemyDamage(); // Animação de dano do inimigo
        
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        if (this.enemy.hp <= 0) await this.win();
        else {
            // Atraso de 1 segundo antes do turno do inimigo
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.enemyTurn();
        }
    }

    async useItem(index) {
        if (this.isTyping || !this.player.inventory[index] || this.player.hp <= 0) return;
        const item = this.player.inventory[index];
        this.ui.playSound('heal');

        if (item.type === 'key') {
            await this.ui.typeLog(getD('chest.keyUse'), 'loot');
            return;
        }

        if (item.heal) {
            this.player.heal(item.heal);
            // Sistema de cura flutuante e efeitos
            this.ui.showFloatingDamage('player', item.heal, 'heal');
            this.ui.applyHealEffect('player');
            this.ui.animatePlayerHeal(); // Animação de cura do player
        } else if (item.manaGain) {
            this.player.mana = Math.min(this.player.maxMana, this.player.mana + item.manaGain);
            // Sistema de mana flutuante e efeitos
            this.ui.showFloatingDamage('player', item.manaGain, 'mana');
            this.ui.applyHealEffect('player');
            this.ui.animatePlayerRest(); // Animação de descanso para mana
        }
        
        this.player.removeItem(index);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        
        // Atraso de 1 segundo antes do turno do inimigo
        setTimeout(() => this.enemyTurn(), 1000);
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
                this.ui.showFloatingDamage('player', s.gold, 'xp');
            }
            if (s.item) {
                this.player.addItem(s.item);
            }
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            const xpCfg = getConfig().xp;
            const xpBase = Math.floor(xpCfg.base + this.player.lv * xpCfg.perLevel);
            const xpGanha = Math.max(1, Math.floor(xpBase * this.getDifficultyMult()));
            const leveledUp = this.player.addXp(xpGanha);
            if (leveledUp) {
                this.ui.showFloatingDamage('player', xpGanha, 'xp');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            }
            this._thiefContestMode = false;
            this._thiefStolen = null;
            this.triggerRandomEvent();
            this.autoSave();
            return;
        }

        // Animar morte do inimigo
        this.ui.animateEnemyDeath();
        
        this.ui.playSound('gold');
        const mult = this.getDifficultyMult();
        const xpCfg = getConfig().xp;
        const goldCfg = getConfig().gold;
        const xpBase = Math.floor(xpCfg.base + this.player.lv * xpCfg.perLevel);
        const xpGanha = Math.max(1, Math.floor(xpBase * mult));
        const goldGanho = goldCfg.min + Math.floor(Math.random() * goldCfg.rand) + Math.floor(this.player.lv * goldCfg.perLevel);
        this.player.addGold(goldGanho);
        const leveledUp = this.player.addXp(xpGanha);
        
        // Coletar informações de loot
        const lootInfo = {
            xp: xpGanha,
            gold: goldGanho,
            items: []
        };

        const drop = getDropChance(this.enemy.name || '');
        const dm = getConfig().dropMult;
        const dropMult = mult < 1 ? dm.easy : mult > 1 ? dm.hard : 1;
        const keyChance = Math.min(0.99, drop.key * dropMult);
        const potionChance = Math.min(0.99, drop.potion * dropMult);
        const roll = Math.random();
        
        if (this.player.inventory.length < 5) {
            if (roll < keyChance) {
                const keyItem = createDropItem('key');
                this.player.addItem(keyItem);
                lootInfo.items.push(keyItem);
            } else if (roll < keyChance + potionChance) {
                const potType = Math.random() < 0.5 ? 'potion_hp' : 'potion_mp';
                const item = createDropItem(potType, this.player.lv);
                if (item && this.player.addItem(item)) {
                    lootInfo.items.push(item);
                }
            }
        }

        // Esperar animação de morte terminar antes de mostrar loot
        setTimeout(async () => {
            // Mostrar tela de loot
            await this.showLootModal(lootInfo);

            if (leveledUp) {
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            } else {
                this.triggerRandomEvent();
            }
            this.autoSave();
        }, 1500); // Tempo para animação de morte
    }

    async showLootModal(lootInfo) {
        return new Promise(resolve => {
            const modal = document.getElementById('loot-modal');
            const content = document.getElementById('loot-content');
            
            // Criar conteúdo do loot com visual melhorado
            let html = '<div class="loot-container">';
            
            // Header de vitória
            html += '<div class="loot-header">';
            html += '<div class="loot-title">🏆 VITÓRIA CONQUISTADA 🏆</div>';
            html += '<div class="loot-subtitle">Recompensas obtidas</div>';
            html += '</div>';
            
            // Conteúdo das recompensas
            html += '<div class="loot-rewards">';
            
            if (lootInfo.xp > 0) {
                html += '<div class="reward-item xp-reward">';
                html += '<div class="reward-icon">⭐</div>';
                html += '<div class="reward-info">';
                html += `<div class="reward-label">EXPERIÊNCIA</div>`;
                html += `<div class="reward-value">+${lootInfo.xp} XP</div>`;
                html += '</div>';
                html += '</div>';
            }
            
            if (lootInfo.gold > 0) {
                html += '<div class="reward-item gold-reward">';
                html += '<div class="reward-icon">💰</div>';
                html += '<div class="reward-info">';
                html += `<div class="reward-label">OURO</div>`;
                html += `<div class="reward-value">+${lootInfo.gold} Gold</div>`;
                html += '</div>';
                html += '</div>';
            }
            
            if (lootInfo.items.length > 0) {
                html += '<div class="reward-item items-reward">';
                html += '<div class="reward-icon">🎒</div>';
                html += '<div class="reward-info">';
                html += `<div class="reward-label">ITENS</div>`;
                html += '<div class="items-list">';
                lootInfo.items.forEach(item => {
                    html += `<div class="loot-item">`;
                    html += `<i class="fa-solid ${item.icon}"></i>`;
                    html += `<span>${item.name}</span>`;
                    html += '</div>';
                });
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
            
            html += '</div>';
            
            // Footer com animação
            html += '<div class="loot-footer">';
            html += '<div class="loot-animation">✨</div>';
            html += '<div class="loot-message">Parabéns pela sua vitória!</div>';
            html += '</div>';
            
            html += '</div>';
            content.innerHTML = html;
            
            // Mostrar modal com animação
            modal.style.display = 'block';
            this.ui.openOverlay();
            
            // Adicionar classe de animação após um pequeno delay
            setTimeout(() => {
                modal.classList.add('loot-modal-animate');
            }, 100);
            
            // Configurar botão de continuar
            const continueBtn = document.querySelector('[data-action="continue-after-loot"]');
            if (continueBtn) {
                continueBtn.onclick = () => {
                    modal.classList.remove('loot-modal-animate');
                    setTimeout(() => {
                        this.ui.closeAllModals();
                        resolve();
                    }, 300);
                };
            }
        });
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
        if (this.player && this.player.hp > 0 && !this._saving) {
            this._saving = true;
            this.autoSave();
            this.ui.showSaveFeedback();
            
            // Resetar flag após um curto período
            setTimeout(() => {
                this._saving = false;
            }, 1000);
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

    saveToManualSlot(slot) {
        console.log('Tentando salvar no slot:', slot);
        console.log('Player exists:', !!this.player);
        console.log('Player HP:', this.player ? this.player.hp : 'no player');
        
        if (this.player && this.player.hp > 0) {
            const payload = {
                p: this.player.toJSON ? this.player.toJSON() : this.player,
                e: this.enemy,
                difficulty: this.difficultyMult,
                // Estado dos eventos
                _npc: this._npc,
                _npcPhase: this._npcPhase,
                _healerFullHp: this._healerFullHp,
                _thiefContestMode: this._thiefContestMode,
                _thiefStolen: this._thiefStolen,
                _archerTip: this._archerTip,
                // Metadados do save
                timestamp: Date.now(),
                playerLevel: this.player.lv,
                playerName: this.player.name,
                gold: this.player.gold
            };

            const manualSaves = JSON.parse(localStorage.getItem(MANUAL_SAVES_KEY) || '{}');
            manualSaves[slot] = payload;
            localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(manualSaves));
            
            console.log('Save manual realizado com sucesso no slot:', slot);
            this.ui.showSaveFeedback();
        } else {
            console.log('Não foi possível salvar - player não existe ou HP <= 0');
        }
    }

    loadManualSlot(slot) {
        const manualSaves = JSON.parse(localStorage.getItem(MANUAL_SAVES_KEY) || '{}');
        const saveData = manualSaves[slot];
        
        if (!saveData) return;
        
        // Mostrar tela de loading
        this.ui.showLoadingScreen();
        
        // Simular tempo de carregamento
        setTimeout(() => {
            try {
                this.player = Player.fromSave(saveData.p);
                this.enemy = saveData.e || null;
                this.setDifficultyMult(saveData.difficulty);
                
                // Restaurar estado dos eventos
                this._npc = saveData._npc || null;
                this._npcPhase = saveData._npcPhase || null;
                this._healerFullHp = saveData._healerFullHp || false;
                this._thiefContestMode = saveData._thiefContestMode || false;
                this._thiefStolen = saveData._thiefStolen || null;
                this._archerTip = saveData._archerTip || '';
                
                this.ui.setPlayerName(this.player.name);
                this.ui.setPlayerImage('player/Player.png'); // Definir imagem do player
                this.ui.showGame();
                this.ui.showMenuStep('buttons');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
                this.ui.updateSkillSlots(this.player, SKILL_LIST);
                this.ui.toggleButtons(false);
                
                if (this._npc && this._npc !== 'thief') {
                    this._restoreNpcEvent();
                } else if (this.enemy && this.enemy.hp > 0) {
                    this.ui.setEnemyImage(this.enemy.img);
                    this.ui.typeLog(`${this.enemy.name} está na sua frente!`, 'spawn').then(() => this.ui.toggleButtons(false));
                } else {
                    this.spawnMonster();
                }
                
                this.ui.hideLoadingScreen();
                this.ui.typeLog('Jogo carregado com sucesso!', 'heal');
            } catch (error) {
                console.error('Erro ao carregar save:', error);
                this.ui.hideLoadingScreen();
                this.ui.typeLog('Erro ao carregar save!', 'damage');
            }
        }, 2000);
    }

    deleteManualSlot(slot) {
        const manualSaves = JSON.parse(localStorage.getItem(MANUAL_SAVES_KEY) || '{}');
        delete manualSaves[slot];
        localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(manualSaves));
        this.ui.updateSaveSlots();
    }

    /** Retorna se há save para continuar. */
    hasSave() {
        return !!localStorage.getItem(SAVE_KEY);
    }
}
