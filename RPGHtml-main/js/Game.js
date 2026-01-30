/**
 * Game.js - Motor principal do jogo
 * Controla loop de combate, eventos aleatórios, vitória/derrota e persistência.
 */

import { Player } from './Player.js';
import { createMonster, createMimic, createThief, SPECIAL_ENEMIES } from './Enemy.js';
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
 * Sistema de drops: taxas reduzidas, raridade por tipo. Dificuldade ainda altera via dropMult.
 * Base mais baixa: comum 2.5% chave / 3% poção, elite 4% / 4%, boss 6% / 5%.
 */
function getDropChance(enemyName) {
    const boss = ['Demônio', 'Dragão'];
    const elite = ['Vampiro', 'Urso', 'Cavaleiro'];
    if (boss.includes(enemyName)) return { key: 0.06, potion: 0.05 };
    if (elite.includes(enemyName)) return { key: 0.04, potion: 0.04 };
    return { key: 0.025, potion: 0.03 };
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

    /** Eventos aleatórios: menos frequentes; dificuldade mantém skew (fácil = mais NPCs/baú, difícil = mais combate). */
    triggerRandomEvent() {
        const mult = this.getDifficultyMult();
        const roll = Math.random();
        let chestChance = 0.06;
        let healerChance = 0.03;
        let merchantChance = 0.025;
        let thiefChance = 0.025;
        let archerChance = 0.03;
        if (mult < 1) {
            chestChance = 0.08;
            healerChance = 0.05;
            merchantChance = 0.04;
            thiefChance = 0.015;
            archerChance = 0.04;
        } else if (mult > 1) {
            chestChance = 0.04;
            healerChance = 0.02;
            merchantChance = 0.015;
            thiefChance = 0.05;
            archerChance = 0.02;
        }
        if (roll < chestChance) {
            this.encounterChest();
            return;
        }
        const eventRoll = Math.random();
        const t = chestChance;
        if (eventRoll < t + healerChance) this.encounterHealer();
        else if (eventRoll < t + healerChance + merchantChance) this.encounterMerchant();
        else if (eventRoll < t + healerChance + merchantChance + thiefChance) this.encounterThief();
        else if (eventRoll < t + healerChance + merchantChance + thiefChance + archerChance) this.encounterArcher();
        else this.spawnMonster();
    }

    async encounterChest() {
        this.enemy = SPECIAL_ENEMIES.chest();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog('Um baú empoeirado repousa à margem do caminho. Parece trancado; não há alma viva por perto.', 'loot');
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

    /** Curandeira: castelo, 4 opções. Amigável → cura grátis. Rude → triste, sai. Neutro → oferta 5G. Ignorar → sai. */
    async encounterHealer() {
        this.enemy = SPECIAL_ENEMIES.healer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        const fullHp = this.player.hp >= this.player.maxHp;
        const intro = fullHp
            ? "Uma mulher com roupas simples e um cinto de ervas se aproxima. Curandeira: \"Boa tarde, viajante. Estou a caminho de um castelo — ouvi falar dele há alguns dias, numa rua de comércio. Dizem que há relíquias por lá. Você parece bem... Conhece esse castelo?\""
            : "Uma mulher com roupas simples e um cinto de ervas se aproxima. Curandeira: \"Boa tarde, viajante. Estou a caminho de um castelo — ouvi falar dele há alguns dias, numa rua de comércio. Dizem que há relíquias por lá. Você, por acaso, conhece esse castelo? E... esses ferimentos... a estrada não perdoa.\"";
        await this.ui.typeLog(intro, 'heal');
        this._npc = 'healer';
        this._healerFullHp = fullHp;
        this._renderNpcChoices('healer');
    }

    async npcChoiceHealer(tone) {
        const fullHp = this._healerFullHp;
        if (tone === 'amigavel') {
            await this.ui.typeLog("Você: \"Também estou em busca de aventuras. Ouvi rumores sobre o castelo — quem sabe nos encontramos por lá!\"", 'info');
            if (fullHp) {
                await this.ui.typeLog("Curandeira: \"Que alma gentil! Você parece bem, então. Que os caminhos te protejam. Até mais!\"", 'heal');
            } else {
                this.player.hp = this.player.maxHp;
                this.ui.playSound('heal');
                await this.ui.typeLog("Curandeira: \"Que alma gentil! Vejo que está machucado. Deixe-me cuidar disso — não quero nada em troca. Que os caminhos te protejam!\"", 'heal');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            }
            this.spawnMonster();
            return;
        }
        if (tone === 'rude') {
            await this.ui.typeLog("Você: \"Não estou interessado nas suas histórias. Afaste-se.\"", 'damage');
            await this.ui.typeLog("Curandeira: \"Entendido. Desejo-lhe sorte na estrada. Que as feridas... não pesem.\" Ela segue viagem, triste.", 'damage');
            this.spawnMonster();
            return;
        }
        if (tone === 'neutro') {
            await this.ui.typeLog("Você: \"Não conheço o castelo. Boa sorte na sua jornada.\"", 'default');
            if (fullHp) {
                await this.ui.typeLog("Curandeira: \"Obrigada. Cuide-se!\" Ela acena e segue.", 'heal');
                this.spawnMonster();
                return;
            }
            await this.ui.typeLog("Curandeira: \"Obrigada. Aliás, posso cuidar desses ferimentos por 5 moedas, se quiser.\"", 'heal');
            this._npcPhase = 1;
            const canPay = this.player.gold >= 5;
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="healer-neutral-accept" ${!canPay ? 'disabled' : ''}>ACEITAR (5G)</button>
                <button class="action-btn btn-def" data-action="healer-neutral-decline">RECUSAR</button>
            `;
            return;
        }
        if (tone === 'ignorar') {
            await this.ui.typeLog("Você não responde e segue o caminho.", 'default');
            await this.ui.typeLog("Curandeira: \"Bem... que a estrada seja gentil.\" Ela segue em outra direção.", 'heal');
            this.spawnMonster();
        }
    }

    async healerNeutralAccept() {
        if (this.player.gold < 5) return;
        this.player.gold -= 5;
        this.player.hp = this.player.maxHp;
        this.ui.playSound('heal');
        await this.ui.typeLog("Curandeira: \"Aqui estamos. Que os caminhos te protejam!\" Ela cura suas feridas.", 'heal');
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        this.spawnMonster();
    }

    async healerNeutralDecline() {
        await this.ui.typeLog("Curandeira: \"Sem problemas. Boa viagem!\"", 'heal');
        this.spawnMonster();
    }

    /** Mercador: estrada, bandidos. Amigável → loja 50% + poção grátis. Rude → não abre. Neutro → loja 50%. Ignorar → segue. */
    async encounterMerchant() {
        this.merchantDiscount = 0.5;
        this.enemy = SPECIAL_ENEMIES.merchant();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog("Um homem robusto puxa uma carroça cheia de frascos e tecidos. Mercador: \"Olá! Vindo da feira — a estrada é longa. Você que vem na direção contrária: viu bandidos ou algo suspeito? Prefiro saber antes de seguir.\"", 'loot');
        this._npc = 'merchant';
        this._renderNpcChoices('merchant');
    }

    async npcChoiceMerchant(tone) {
        if (tone === 'amigavel') {
            await this.ui.typeLog("Você: \"A estrada parece tranquila até aqui. Boa sorte! Se precisar de algo, estou por perto.\"", 'info');
            await this.ui.typeLog("Mercador: \"Obrigado, amigo! Que tal dar uma olhada na carroça? Para você, tudo pela metade. E leva uma poção de cortesia.\"", 'loot');
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
            await this.ui.typeLog("Você: \"Não sou seu guia. Se vira.\"", 'damage');
            await this.ui.typeLog("Mercador: \"Não era pra tanto. Siga em frente, então.\" Ele segue com a carroça.", 'damage');
            this.spawnMonster();
            return;
        }
        if (tone === 'neutro') {
            await this.ui.typeLog("Você: \"Não vi nada. Cuidado.\"", 'default');
            await this.ui.typeLog("Mercador: \"Valeu. Quer dar uma olhada nas minhas coisas? Metade do preço.\"", 'loot');
            const c = document.getElementById('action-buttons');
            c.innerHTML = `
                <button class="action-btn btn-heal" data-action="open-shop"><i class="fa-solid fa-store"></i> ABRIR LOJA</button>
                <button class="action-btn btn-def" data-action="continue-travel"><i class="fa-solid fa-road"></i> CONTINUAR</button>
            `;
            return;
        }
        if (tone === 'ignorar') {
            await this.ui.typeLog("Você ignora o mercador e segue.", 'default');
            await this.ui.typeLog("Mercador: \"Tranquilo. Boa viagem.\"", 'heal');
            this.spawnMonster();
        }
    }

    /** Ladrão: taxa. Amigável → entrega pouco, sem briga. Rude → combate. Neutro/ignorar → roubo normal → contestar/deixar. */
    async encounterThief() {
        this.enemy = SPECIAL_ENEMIES.thief();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog("Uma figura encapuzada bloqueia o caminho. Ladrão: \"Oi, viajante. Aqui a passagem tem taxa. Moedas ou sangue — ou os dois. O que você escolhe?\"", 'damage');
        this._npc = 'thief';
        this._renderNpcChoices('thief');
    }

    async npcChoiceThief(tone) {
        if (tone === 'amigavel') {
            await this.ui.typeLog("Você: \"Não quero briga. Fica com isso e vamos cada um pro seu lado.\"", 'info');
            const offer = Math.min(10, Math.max(1, Math.floor(this.player.gold * 0.1)));
            if (this.player.gold >= 1) {
                this.player.gold -= offer;
                await this.ui.typeLog(`Você entrega ${offer} moedas. Ladrão: \"Justo. Até a próxima.\" Ele some nas sombras.`, 'heal');
                this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            } else {
                await this.ui.typeLog("Ladrão: \"Nada? Que azar.\" Ele some nas sombras.", 'default');
            }
            this.spawnMonster();
            return;
        }
        if (tone === 'rude') {
            await this.ui.typeLog("Você: \"Sai da frente ou te parto ao meio.\"", 'damage');
            await this.ui.typeLog("Ladrão: \"Era isso que eu queria ouvir.\" A luta começa!", 'damage');
            this._thiefStolen = { gold: 0, item: null };
            this.thiefContest();
            return;
        }
        this._doThiefRobbery(tone);
    }

    async _doThiefRobbery(tone) {
        if (tone === 'neutro') {
            await this.ui.typeLog("Você: \"Pega o que quiser e deixa eu ir.\"", 'default');
        } else {
            await this.ui.typeLog("Você tenta passar sem responder.", 'default');
            await this.ui.typeLog("Ladrão: \"Não respondendo? Tudo bem, eu escolho.\"", 'damage');
        }
        this.ui.playSound('dmg');
        const hasGold = this.player.gold > 0;
        const hasItems = this.player.inventory.length > 0;
        this._thiefStolen = { gold: 0, item: null };
        if (hasGold && (!hasItems || Math.random() < 0.5)) {
            const pct = 0.2 + Math.random() * 0.2;
            const loss = Math.max(1, Math.floor(this.player.gold * pct));
            this.player.gold -= loss;
            this._thiefStolen.gold = loss;
            await this.ui.typeLog(`O ladrão levou ${loss} moedas e sumiu na penumbra!`, 'damage');
        } else if (hasItems) {
            const idx = Math.floor(Math.random() * this.player.inventory.length);
            const item = this.player.removeItem(idx);
            this._thiefStolen.item = item;
            this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
            await this.ui.typeLog(`O ladrão agarrou sua ${item.name} e fugiu!`, 'damage');
        } else {
            await this.ui.typeLog("Ladrão: \"Nada? Que azar.\" Ele some.", 'default');
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
        await this.ui.typeLog('Você deixa o ladrão ir. Melhor não arriscar.', 'default');
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
        this.ui.typeLog('Você persegue o ladrão! A luta começa.', 'spawn').then(() => this.ui.toggleButtons(false));
    }

    /** Arqueira: conselhos. Amigável/neutro → dica. Rude/ignorar → sem dica. */
    async encounterArcher() {
        this.enemy = SPECIAL_ENEMIES.archer();
        this.ui.setEnemyImage(this.enemy.img);
        this.ui.updateUI(this.player, this.enemy, { merchantDiscount: this.merchantDiscount });
        await this.ui.typeLog("Uma arqueira está à beira do caminho, inspecionando a corda do arco. Arqueira: \"Ei, você. Também vai pra frente? Ando há dias — dá pra sentir quando a estrada vai esquentar. Quer um conselho de quem já viu muita coisa?\"", 'info');
        this._npc = 'archer';
        this._archerTip = TIPS[Math.floor(Math.random() * TIPS.length)];
        this._renderNpcChoices('archer');
    }

    async npcChoiceArcher(tone) {
        if (tone === 'amigavel') {
            await this.ui.typeLog("Você: \"Sempre aceito conselhos de quem conhece a estrada.\"", 'info');
            await this.ui.typeLog(`Arqueira: \"${this._archerTip}\" Ela sorri. \"Cuide-se. A estrada é dura.\"`, 'heal');
        } else if (tone === 'neutro') {
            await this.ui.typeLog("Você: \"Pode falar. Estou ouvindo.\"", 'default');
            await this.ui.typeLog(`Arqueira: \"${this._archerTip}\"`, 'info');
        } else if (tone === 'rude') {
            await this.ui.typeLog("Você: \"Não preciso de conselhos de estranhos.\"", 'damage');
            await this.ui.typeLog("Arqueira: \"Como quiser. Boa sorte.\" Ela segue em frente.", 'damage');
        } else {
            await this.ui.typeLog("Você ignora a arqueira e segue.", 'default');
            await this.ui.typeLog("Arqueira: \"Tudo bem. Siga em frente.\"", 'heal');
        }
        this.spawnMonster();
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
            const mult = this.getDifficultyMult();
            const xpBase = Math.floor(XP_BASE + this.player.lv * XP_PER_LEVEL);
            const xpGanha = Math.max(1, Math.floor(xpBase * mult));
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
