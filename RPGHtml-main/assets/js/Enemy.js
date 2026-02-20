/**
 * Enemy.js - Dados e lógica dos inimigos. Usa GameConfig para balanceamento.
 */

import { getConfig } from './GameConfig.js';

/** Todos os caminhos de imagem apontam para a pasta /imagens/ com subpastas */
export const MONSTER_TEMPLATES = [
    { name: 'Ratazana', minLv: 1, img: 'inimigos/ratazana gigante.png' },
    { name: 'Esqueleto', minLv: 4, img: 'inimigos/esqueleto.png' },
    { name: 'Lobo', minLv: 6, img: 'inimigos/lobo.png' },
    { name: 'Ogro', minLv: 8, img: 'inimigos/orc.png' },
    { name: 'Cavaleiro', minLv: 13, img: 'inimigos/cavaleiro.png' },
    { name: 'Vampiro', minLv: 16, img: 'inimigos/vampiro.png' },
    { name: 'Urso', minLv: 20, img: 'inimigos/urso.png' },
    { name: 'Demônio', minLv: 26, img: 'inimigos/demonio.png' },
    { name: 'Dragão', minLv: 30, img: 'inimigos/dragao.png' }
];

export const MONSTER_STATS = {
    'Ratazana': { baseHp: 8, baseDmg: 3 },
    'Esqueleto': { baseHp: 12, baseDmg: 5 },
    'Lobo': { baseHp: 20, baseDmg: 9 },
    'Ogro': { baseHp: 32, baseDmg: 14 },
    'Cavaleiro': { baseHp: 44, baseDmg: 18 },
    'Vampiro': { baseHp: 51, baseDmg: 24 },
    'Urso': { baseHp: 67, baseDmg: 30 },
    'Demônio': { baseHp: 73, baseDmg: 38 },
    'Dragão': { baseHp: 120, baseDmg: 55 },
    'Mímico': { baseHp: 50, baseDmg: 20 },
    'Ladrão': { baseHp: 28, baseDmg: 12 }
};

/**
 * Cria um inimigo de combate. HP e dano escalam com nível do jogador (balanceado).
 * @param {number} playerLv - Nível do jogador
 * @param {number} [difficultyMult=1] - Multiplicador de dificuldade (ex.: 1.35 = difícil)
 */
export function createMonster(playerLv, difficultyMult = 1) {
    const cfg = getConfig().enemy;
    const avail = MONSTER_TEMPLATES.filter(m => playerLv >= m.minLv);
    const data = avail[Math.floor(Math.random() * avail.length)];
    const stats = MONSTER_STATS[data.name];
    const mult = Math.max(0.5, Math.min(2, difficultyMult || 1));
    
    // Verificação de segurança para evitar NaN
    const hpScale = cfg.hpScalePerLevel || 0.10;
    const dmgScale = cfg.dmgScalePerLevel || 0.08;
    
    let finalHp = Math.max(6, Math.round(stats.baseHp * (1 + playerLv * hpScale)));
    let finalDmg = Math.max(1, Math.round(stats.baseDmg * (1 + playerLv * dmgScale)));
    finalHp = Math.round(finalHp * mult);
    finalDmg = Math.round(finalDmg * mult);
    return {
        ...data,
        hp: finalHp,
        maxHp: finalHp,
        str: finalDmg,
        lv: playerLv // Adicionar level do inimigo igual ao do player
    };
}

/**
 * Cria o inimigo Mímico (após abrir baú). Um pouco mais forte que monstro comum.
 * @param {number} playerLv - Nível do jogador
 * @param {number} [difficultyMult=1] - Multiplicador de dificuldade
 */
export function createMimic(playerLv, difficultyMult = 1) {
    const cfg = getConfig().enemy;
    const stats = MONSTER_STATS['Mímico'];
    const mult = Math.max(0.5, Math.min(2, difficultyMult || 1));
    
    // Verificação de segurança para evitar NaN
    const hpScale = cfg.hpScalePerLevel || 0.10;
    const dmgScale = cfg.dmgScalePerLevel || 0.08;
    const mimicHpScale = cfg.mimicHpScale || 1.2;
    const mimicDmgScale = cfg.mimicDmgScale || 1.1;
    
    let finalHp = Math.max(8, Math.round(stats.baseHp * (1 + playerLv * hpScale * mimicHpScale)));
    let finalDmg = Math.max(1, Math.round(stats.baseDmg * (1 + playerLv * dmgScale * mimicDmgScale)));
    finalHp = Math.round(finalHp * mult);
    finalDmg = Math.round(finalDmg * mult);
    return {
        name: 'Mímico',
        hp: finalHp,
        maxHp: finalHp,
        str: finalDmg,
        img: 'bau_mimico.png',
        lv: playerLv // Adicionar level do inimigo igual ao do player
    };
}

/**
 * Cria o Ladrão como inimigo de combate (ao contestar o roubo).
 * @param {number} playerLv - Nível do jogador
 * @param {number} [difficultyMult=1] - Multiplicador de dificuldade
 */
export function createThief(playerLv, difficultyMult = 1) {
    const cfg = getConfig().enemy;
    const stats = MONSTER_STATS['Ladrão'];
    const mult = Math.max(0.5, Math.min(2, difficultyMult || 1));
    
    // Verificação de segurança para evitar NaN
    const hpScale = cfg.hpScalePerLevel || 0.10;
    const dmgScale = cfg.dmgScalePerLevel || 0.08;
    
    let finalHp = Math.max(8, Math.round(stats.baseHp * (1 + playerLv * hpScale)));
    let finalDmg = Math.max(1, Math.round(stats.baseDmg * (1 + playerLv * dmgScale)));
    finalHp = Math.round(finalHp * mult);
    finalDmg = Math.round(finalDmg * mult);
    return {
        name: 'Ladrão',
        hp: finalHp,
        maxHp: finalHp,
        str: finalDmg,
        img: 'ladrao.png',
        lv: playerLv // Adicionar level do inimigo igual ao do player
    };
}

/** Inimigos especiais (eventos) - não combatíveis. Imagens em /imagens/. */
export const SPECIAL_ENEMIES = {
    chest: () => {
        const c = getConfig().chest;
        // Verificação de segurança para evitar NaN
        const hpBase = c.hpBase || 30;
        const hpPerLv = c.hpPerLv || 10;
        const dmgBase = c.dmgBase || 0;
        const dmgPerLv = c.dmgPerLv || 0;
        
        const finalHp = Math.floor(hpBase * (1 + hpPerLv));
        const finalDmg = Math.floor(dmgBase * (1 + dmgPerLv));
        return {
            name: 'Baú Misterioso',
            hp: finalHp,
            maxHp: finalHp,
            str: finalDmg,
            img: 'itens/bau.png'
        };
    },
    mimic: () => {
        const c = getConfig().chest;
        // Verificação de segurança para evitar NaN
        const hpBase = c.hpBase || 30;
        const hpPerLv = c.hpPerLv || 10;
        const dmgBase = c.dmgBase || 0;
        const dmgPerLv = c.dmgPerLv || 0;
        
        const finalHp = Math.floor(hpBase * (1 + hpPerLv));
        const finalDmg = Math.floor(dmgBase * (1 + dmgPerLv));
        return {
            name: 'Baú Mímico',
            hp: finalHp,
            maxHp: finalHp,
            str: finalDmg,
            img: 'inimigos/bau_mimico.png'
        };
    },
    healer: () => ({
        name: 'Curandeira Viajante',
        hp: '???',
        maxHp: '???',
        img: 'npcs/curandeira.png'
    }),
    merchant: () => ({
        name: 'Mercador Itinerante',
        hp: 'SOLDO',
        maxHp: 'SOLDO',
        img: 'npcs/vendedor.png'
    }),
    thief: () => ({
        name: 'Ladrão de Estradas',
        hp: 'FUGIU',
        maxHp: 'FUGIU',
        img: 'inimigos/ladrao.png'
    }),
    archer: () => ({
        name: 'Arqueira Guia',
        hp: 'DICA',
        maxHp: 'DICA',
        img: 'npcs/curandeira busto.png'
    })
};
