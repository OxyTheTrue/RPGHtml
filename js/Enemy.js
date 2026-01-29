/**
 * Enemy.js - Dados e lógica dos inimigos
 * Templates de monstros, estatísticas e criação de inimigos (combate e eventos).
 *
 * Balanceamento: escalonamento acompanha a força média do jogador por nível.
 * - HP inimigo: baseHp * (1 + lv * FATOR_HP) — ~4–6 ataques para derrubar.
 * - Dano inimigo: baseDmg * (1 + lv * FATOR_DMG) — ameaça real sem one-shot.
 */

const HP_SCALE_PER_LEVEL = 0.10;  // 10% mais HP por nível do jogador
const DMG_SCALE_PER_LEVEL = 0.08; // 8% mais dano por nível

export const MONSTER_TEMPLATES = [
    { name: 'Ratazana', minLv: 1, img: 'ratazana gigante.png' },
    { name: 'Esqueleto', minLv: 4, img: 'esqueleto.png' },
    { name: 'Lobo', minLv: 6, img: 'lobo.png' },
    { name: 'Ogro', minLv: 8, img: 'ogro.png' },
    { name: 'Cavaleiro', minLv: 13, img: 'cavaleiro.png' },
    { name: 'Vampiro', minLv: 16, img: 'vampiro.png' },
    { name: 'Urso', minLv: 20, img: 'urso.png' },
    { name: 'Demônio', minLv: 26, img: 'demonio.png' },
    { name: 'Dragão', minLv: 30, img: 'dragao.png' }
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
    'Mímico': { baseHp: 50, baseDmg: 20 }
};

/**
 * Cria um inimigo de combate. HP e dano escalam com nível do jogador (balanceado).
 */
export function createMonster(playerLv) {
    const avail = MONSTER_TEMPLATES.filter(m => playerLv >= m.minLv);
    const data = avail[Math.floor(Math.random() * avail.length)];
    const stats = MONSTER_STATS[data.name];
    const finalHp = Math.max(6, Math.round(stats.baseHp * (1 + playerLv * HP_SCALE_PER_LEVEL)));
    const finalDmg = Math.max(1, Math.round(stats.baseDmg * (1 + playerLv * DMG_SCALE_PER_LEVEL)));
    return {
        ...data,
        hp: finalHp,
        maxHp: finalHp,
        str: finalDmg
    };
}

/**
 * Cria o inimigo Mímico (após abrir baú). Um pouco mais forte que monstro comum.
 */
export function createMimic(playerLv) {
    const stats = MONSTER_STATS['Mímico'];
    const finalHp = Math.max(8, Math.round(stats.baseHp * (1 + playerLv * HP_SCALE_PER_LEVEL * 1.2)));
    const finalDmg = Math.max(1, Math.round(stats.baseDmg * (1 + playerLv * DMG_SCALE_PER_LEVEL * 1.1)));
    return {
        name: 'Mímico',
        hp: finalHp,
        maxHp: finalHp,
        str: finalDmg,
        img: 'bau_mimico.png'
    };
}

/** Inimigos especiais (eventos) - não combatíveis. */
export const SPECIAL_ENEMIES = {
    chest: () => ({
        name: 'Baú Misterioso',
        hp: '???',
        maxHp: '???',
        img: 'https://cdn-icons-png.flaticon.com/512/3504/3504362.png'
    }),
    healer: () => ({
        name: 'Curandeira Viajante',
        hp: '???',
        maxHp: '???',
        img: 'curandeira.png'
    }),
    merchant: () => ({
        name: 'Mercador Itinerante',
        hp: 'SOLDO',
        maxHp: 'SOLDO',
        img: 'https://cdn-icons-png.flaticon.com/512/4149/4149883.png'
    }),
    thief: () => ({
        name: 'Ladrão de Estradas',
        hp: 'FUGIU',
        maxHp: 'FUGIU',
        img: 'https://cdn-icons-png.flaticon.com/512/1162/1162382.png'
    }),
    archer: () => ({
        name: 'Arqueira Guia',
        hp: 'DICA',
        maxHp: 'DICA',
        img: 'https://cdn-icons-png.flaticon.com/512/2303/2303901.png'
    })
};
