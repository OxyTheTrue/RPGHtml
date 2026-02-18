/**
 * Player.js - Classe e lógica do jogador. Usa GameConfig para valores iniciais e curvas.
 */

import { getConfig } from './GameConfig.js';

export class Player {
    constructor(name = 'GUERREIRO') {
        const p = getConfig().player;
        this.name = name;
        this.lv = 1;
        this.hp = p.startHp;
        this.maxHp = p.startHp;
        this.mana = p.startMana;
        this.maxMana = p.startMana;
        this.str = p.startStr;
        this.int = p.startInt;
        this.luk = p.startLuk;
        this.spd = p.startSpd;
        this.vit = p.startVit;
        this.xp = 0;
        this.nextXp = getConfig().player.baseNextXp;
        this.furia = 0;
        this.gold = 0;
        this.inventory = [];
        this.skills = [];
        this.skillPoints = 0;
        this.pendingPoints = 0;
        this.levels = { str: 1, spd: 1, int: 1, luk: 1, vit: 1 };
        this.buffs = { boots: 0, shield: 0, coin: 0 };
        this.bleeding = false;
    }

    /** Cria um novo jogador a partir do nome. */
    static createNew(name) {
        return new Player(name || 'GUERREIRO');
    }

    /** Restaura jogador a partir de dados salvos (objeto plano). */
    static fromSave(data) {
        const p = new Player(data.name);
        Object.assign(p, data);
        return p;
    }

    /** Serializa para JSON (mantém estrutura de objeto para localStorage). */
    toJSON() {
        return {
            name: this.name,
            lv: this.lv,
            hp: this.hp,
            maxHp: this.maxHp,
            mana: this.mana,
            maxMana: this.maxMana,
            str: this.str,
            int: this.int,
            luk: this.luk,
            spd: this.spd,
            vit: this.vit,
            xp: this.xp,
            nextXp: this.nextXp,
            furia: this.furia,
            gold: this.gold,
            inventory: [...this.inventory],
            skills: this.skills.map(s => ({ ...s })),
            skillPoints: this.skillPoints,
            pendingPoints: this.pendingPoints,
            levels: { ...this.levels },
            buffs: { ...this.buffs },
            bleeding: this.bleeding
        };
    }

    /** Dano físico aproximado (min-max). Fórmula contida: 0.75–1.15 * STR. */
    getPhysicalDamageRange() {
        const min = Math.floor(this.str * 0.75);
        const max = Math.ceil(this.str * 1.15);
        return { min, max };
    }

    /** Aplica cura (retorna valor efetivamente curado). */
    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - before;
    }

    /** Aplica dano; retorna dano efetivo. Aumenta fúria. */
    takeDamage(rawDmg, defending = false) {
        const red = getConfig().combat.defendReduction;
        const dmg = defending ? Math.ceil(rawDmg * red) : rawDmg;
        this.hp = Math.max(0, this.hp - dmg);
        this.furia = Math.min(100, this.furia + getConfig().skills.furiaPerHit);
        return dmg;
    }

    /** Gasta mana; retorna true se havia mana suficiente. */
    spendMana(amount) {
        if (this.mana < amount) return false;
        this.mana -= amount;
        return true;
    }

    /** Recupera mana (descansar). */
    restoreMana(amount) {
        this.mana = Math.min(this.maxMana, this.mana + amount);
    }

    /** Gasta um ponto de atributo e aplica bônus (balanceado: +3 HP/vit, +2 Mana/int). */
    spendPoint(stat) {
        if (this.pendingPoints <= 0) return false;
        this.levels[stat]++;
        this[stat]++;
        const p = getConfig().player;
        if (stat === 'vit') this.maxHp += p.vitHpPerPoint;
        if (stat === 'int') this.maxMana += p.intManaPerPoint;
        this.pendingPoints--;
        if (this.pendingPoints === 0) {
            this.lv++;
            this.xp = 0;
            this.nextXp = Math.floor(p.baseNextXp * Math.pow(p.xpMultiplier, this.lv - 1));
            /* Trava de progressão: 1 ponto de skill a cada 5 níveis (5, 10, 15, ...). */
            if (this.lv % 5 === 0) this.skillPoints++;
            this.hp = this.maxHp;
            this.mana = this.maxMana;
            return 'level_up';
        }
        return 'point_spent';
    }

    /** Adiciona XP; retorna true se subiu de nível. */
    addXp(amount) {
        this.xp += amount;
        if (this.xp >= this.nextXp) {
            this.pendingPoints += 3;
            return true;
        }
        return false;
    }

    /** Adiciona ouro. */
    addGold(amount) {
        this.gold += amount;
    }

    /** Remove item do inventário pelo índice. */
    removeItem(index) {
        if (index < 0 || index >= this.inventory.length) return null;
        return this.inventory.splice(index, 1)[0];
    }

    /** Adiciona item ao inventário (até 5). */
    addItem(item) {
        if (this.inventory.length >= 5) return false;
        this.inventory.push({ ...item });
        return true;
    }

    /** Aprende ou sobe nível de uma skill. */
    learnSkill(skillId, reqLv) {
        if (this.skillPoints <= 0 || this.lv < reqLv) return false;
        this.skillPoints--;
        const existing = this.skills.find(s => s.id === skillId);
        if (existing) existing.level++;
        else this.skills.push({ id: skillId, level: 1 });
        return true;
    }

    /** Reseta estado para "após morte" (mantém nível/atributos). */
    resetAfterDeath() {
        this.hp = this.maxHp;
        this.mana = this.maxMana;
        this.xp = 0;
        this.gold = 0;
        this.inventory = [];
    }

    /** Verifica se está vivo. */
    get isAlive() {
        return this.hp > 0;
    }
}
