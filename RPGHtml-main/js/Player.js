/**
 * Player.js - Classe e lógica do jogador. Usa GameConfig para valores iniciais e curvas.
 */

import { getConfig } from './GameConfig.js';

export class Player {
    constructor(name = 'GUERREIRO') {
        const p = getConfig().player;
        this.name = name;
        this.lv = 1;
        this.xp = 0;
        this.maxHp = 15;
        this.hp = this.maxHp;
        this.baseMaxHp = 15; // HP base sem bônus
        this.maxMana = 10;
        this.mana = this.maxMana;
        this.baseMaxMana = 10; // Mana base sem bônus
        this.baseAtk = 3;
        this.baseDef = 1;
        this.baseSpd = 3;
        this.baseLck = 1;
        this.nextXp = getConfig().player.baseNextXp;
        this.furia = 0;
        this.gold = 0;
        this.inventory = [];
        this.activeInventory = []; // Itens ativos (consumíveis, equipamentos usáveis)
        this.passiveInventory = []; // Itens passivos (equipamentos com efeitos permanentes)
        this.skills = [];
        this.skillPoints = 0;
        this.unlockedSkills = []; // Habilidades desbloqueadas na árvore
        this.pendingPoints = 0;
        this.levels = { str: 1, spd: 1, int: 1, luk: 1, vit: 1 };
        
        // Propriedades individuais para compatibilidade
        this.str = this.levels.str;
        this.int = this.levels.int;
        this.spd = this.levels.spd;
        this.luk = this.levels.luk;
        this.vit = this.levels.vit;
        
        this.buffs = { boots: 0, shield: 0, coin: 0 };
        
        // Bônus da árvore de habilidades
        this.dmgBonus = 0;
        this.maxHpBonus = 0;
        this.hpRegen = 0;
        this.damageReduction = 0;
        this.maxManaBonus = 0;
        this.manaRegen = 0;
        this.magicDmgBonus = 0;
        this.critBonus = 0;
        this.bleeding = false;
    }

    /** Cria um novo jogador a partir do nome. */
    static createNew(name) {
        return new Player(name || 'GUERREIRO');
    }

    /** Restaura jogador a partir de dados salvos (objeto plano). */
    static fromSave(data) {
        const p = new Player(data.name);
        
        // Garantir que todos os valores essenciais existam
        p.lv = data.lv || 1;
        p.xp = data.xp || 0;
        p.hp = data.hp || 15;
        p.maxHp = data.maxHp || 15;
        p.baseMaxHp = data.baseMaxHp || 15;
        p.mana = data.mana || 10;
        p.maxMana = data.maxMana || 10;
        p.baseMaxMana = data.baseMaxMana || 10;
        p.furia = data.furia || 0;
        p.gold = data.gold || 0;
        p.nextXp = data.nextXp || getConfig().player.baseNextXp;
        p.inventory = data.inventory || [];
        p.activeInventory = data.activeInventory || [];
        p.passiveInventory = data.passiveInventory || [];
        p.skills = data.skills || [];
        p.skillPoints = data.skillPoints || 0;
        p.unlockedSkills = data.unlockedSkills || [];
        p.pendingPoints = data.pendingPoints || 0;
        p.levels = data.levels || { str: 1, spd: 1, int: 1, luk: 1, vit: 1 };
        p.buffs = data.buffs || { boots: 0, shield: 0, coin: 0 };
        
        // Bônus da árvore de habilidades
        p.dmgBonus = data.dmgBonus || 0;
        p.maxHpBonus = data.maxHpBonus || 0;
        p.hpRegen = data.hpRegen || 0;
        p.damageReduction = data.damageReduction || 0;
        p.maxManaBonus = data.maxManaBonus || 0;
        p.manaRegen = data.manaRegen || 0;
        p.magicDmgBonus = data.magicDmgBonus || 0;
        p.critBonus = data.critBonus || 0;
        
        // Atributos base
        p.baseAtk = data.baseAtk || 3;
        p.baseDef = data.baseDef || 1;
        p.baseSpd = data.baseSpd || 3;
        p.baseLck = data.baseLck || 1;
        
        // Sincronizar propriedades individuais com levels
        p.str = p.levels.str;
        p.int = p.levels.int;
        p.spd = p.levels.spd;
        p.luk = p.levels.luk;
        p.vit = p.levels.vit;
        
        return p;
    }

    /** Serializa para JSON (mantém estrutura de objeto para localStorage). */
    toJSON() {
        return {
            name: this.name,
            lv: this.lv,
            xp: this.xp,
            hp: this.hp,
            maxHp: this.maxHp,
            baseMaxHp: this.baseMaxHp,
            mana: this.mana,
            maxMana: this.maxMana,
            baseMaxMana: this.baseMaxMana,
            baseAtk: this.baseAtk,
            baseDef: this.baseDef,
            baseSpd: this.baseSpd,
            baseLck: this.baseLck,
            str: this.str,
            int: this.int,
            luk: this.luk,
            spd: this.spd,
            vit: this.vit,
            nextXp: this.nextXp,
            furia: this.furia,
            gold: this.gold,
            inventory: [...this.inventory],
            activeInventory: [...this.activeInventory],
            passiveInventory: [...this.passiveInventory],
            skills: this.skills.map(s => ({ ...s })),
            skillPoints: this.skillPoints,
            unlockedSkills: [...this.unlockedSkills],
            pendingPoints: this.pendingPoints,
            levels: { ...this.levels },
            buffs: { ...this.buffs },
            
            // Bônus da árvore de habilidades
            dmgBonus: this.dmgBonus,
            maxHpBonus: this.maxHpBonus,
            hpRegen: this.hpRegen,
            damageReduction: this.damageReduction,
            maxManaBonus: this.maxManaBonus,
            manaRegen: this.manaRegen,
            magicDmgBonus: this.magicDmgBonus,
            critBonus: this.critBonus,
            
            bleeding: this.bleeding
        };
    }

    /** Dano físico aproximado (min-max). Fórmula contida: 0.75–1.15 * STR. */
    getPhysicalDamageRange() {
        const str = this.str || 1;
        const min = Math.floor(str * 0.75);
        const max = Math.ceil(str * 1.15);
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
        if (!item) return false;
        this.inventory.push({ ...item });
        
        // Separar entre ativos e passivos
        if (this.isActiveItem(item.type)) {
            this.activeInventory.push({ ...item });
        } else {
            this.passiveInventory.push({ ...item });
        }
        
        return true;
    }

    /** Verifica se um item é ativo (usável) ou passivo */
    isActiveItem(itemType) {
        const activeItems = ['potion_hp', 'potion_mana', 'key'];
        return activeItems.includes(itemType);
    }

    /** Remove item do inventário pelo índice. */
    removeItem(index) {
        if (index < 0 || index >= this.inventory.length) return null;
        const removedItem = this.inventory.splice(index, 1)[0];
        
        // Remover também dos inventários específicos
        const activeIndex = this.activeInventory.findIndex(item => item.type === removedItem.type);
        if (activeIndex !== -1) {
            this.activeInventory.splice(activeIndex, 1);
        }
        
        const passiveIndex = this.passiveInventory.findIndex(item => item.type === removedItem.type);
        if (passiveIndex !== -1) {
            this.passiveInventory.splice(passiveIndex, 1);
        }
        
        return removedItem;
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
        this.inventory = [];
        this.activeInventory = []; // Limpar inventário ativo
        this.passiveInventory = []; // Limpar inventário passivo
    }

    /** Verifica se está vivo. */
    get isAlive() {
        return this.hp > 0;
    }
}
