/**
 * GameConfig.js - Configuração global do RPG (balanceamento).
 * Valores numéricos centralizados. Persistência via localStorage (Admin).
 */

const STORAGE_KEY = 'rpg_admin_config';

export const DEFAULT_CONFIG = {
    xp: { base: 6, perLevel: 2.1 },
    gold: { min: 2, rand: 5, perLevel: 0.8 },
    drops: {
        commonKey: 0.025,
        commonPotion: 0.03,
        eliteKey: 0.04,
        elitePotion: 0.04,
        bossKey: 0.06,
        bossPotion: 0.05
    },
    dropMult: { easy: 1.35, hard: 0.7 },
    enemy: { hpScalePerLevel: 0.10, dmgScalePerLevel: 0.08, mimicHpScale: 1.2, mimicDmgScale: 1.1 },
    player: {
        baseNextXp: 50,
        xpMultiplier: 1.42,
        startHp: 10,
        startMana: 10,
        startStr: 3,
        startInt: 3,
        startLuk: 1,
        startSpd: 1,
        startVit: 3,
        vitHpPerPoint: 3,
        intManaPerPoint: 2
    },
    healer: { cost: 5 },
    merchant: { discount: 0.5 },
    thief: { goldPctMin: 0.2, goldPctMax: 0.4, friendlyOfferPct: 0.1, friendlyOfferCap: 10 },
    chest: { mimicChance: 0.4, goldBase: 30, goldPerLv: 10 },
    events: {
        normal: { chest: 0.06, healer: 0.03, merchant: 0.025, thief: 0.025, archer: 0.03 },
        easy: { chest: 0.08, healer: 0.05, merchant: 0.04, thief: 0.015, archer: 0.04 },
        hard: { chest: 0.04, healer: 0.02, merchant: 0.015, thief: 0.05, archer: 0.02 }
    },
    combat: { atkMin: 0.75, atkMax: 1.15, enemyAtkMin: 0.8, enemyAtkMax: 1.2, defendReduction: 0.5 },
    skills: { healMana: 5, healMult: 1.7, restMult: 1.0, ultMult: 2.2, furiaPerHit: 20 },
    potion: { hpBase: 10, hpPerLv: 1.5, manaBase: 12, manaPerLv: 1.2 },
    shop: { potion: 28, mana_potion: 32, boots: 58, shield: 78, coin: 125 }
};

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

let _config = deepCopy(DEFAULT_CONFIG);

function deepMerge(target, source) {
    for (const k of Object.keys(source)) {
        if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k] && typeof target[k] === 'object')
            deepMerge(target[k], source[k]);
        else
            target[k] = source[k];
    }
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            _config = deepCopy(DEFAULT_CONFIG);
            deepMerge(_config, saved);
        }
    } catch (_) { /* keep defaults */ }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_config));
    } catch (_) {}
}

/** Retorna cópia da config atual (sempre use get()). */
export function getConfig() {
    return deepCopy(_config);
}

/** Atualiza um valor. path ex: 'xp.base', 'healer.cost'. Persiste e retorna config. */
export function setConfigValue(path, value) {
    const parts = path.split('.');
    let o = _config;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (!(k in o)) o[k] = {};
        o = o[k];
    }
    o[parts[parts.length - 1]] = value;
    save();
    return getConfig();
}

/** Restaura defaults e limpa persistência. */
export function resetConfig() {
    _config = deepCopy(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    return getConfig();
}

/** Garante config carregada ao importar. */
load();
