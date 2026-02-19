/**
 * Shop.js - Lógica de compra. Preços vêm de GameConfig.
 */

import { getConfig } from './GameConfig.js';

export const SHOP_ITEMS = {
    // Itens existentes
    potion: { name: 'Poção Vida', heal: 18, icon: 'fa-flask', img: 'itens/pocao.png' },
    mana_potion: { name: 'Poção Mana', manaGain: 22, icon: 'fa-flask-vial', img: 'itens/pocao de mana.png' },
    boots: { name: 'Bota Agilidade', type: 'boots', dur: 5, icon: 'fa-boot', img: 'itens/botas.png' },
    shield: { name: 'Escudo Prata', type: 'shield', dur: 2, icon: 'fa-shield-halved', img: 'itens/escudo.png' },
    coin: { name: 'Moeda Sorte', type: 'coin', dur: 3, icon: 'fa-coins', img: 'itens/moeda da sorte.png' },
    
    // Novos itens ATIVOS
    sword_fire: { name: 'Espada de Fogo', type: 'weapon', dur: 4, dmgBonus: 3, burn: true, icon: 'fa-fire', img: 'itens/espada_fogo.svg' },
    bow_ice: { name: 'Arco de Gelo', type: 'weapon', dur: 3, freeze: true, slow: true, icon: 'fa-snowflake', img: 'itens/arco_gelo.svg' },
    hammer_thunder: { name: 'Martelo Trovão', type: 'weapon', dur: 3, stun: 1, dmgBonus: 2, icon: 'fa-bolt', img: 'itens/martelo_trovao.svg' },
    dagger_poison: { name: 'Adaga Venenosa', type: 'weapon', dur: 5, poison: 2, critBonus: 0.15, icon: 'fa-skull', img: 'itens/adaga_veneno.svg' },
    scroll_light: { name: 'Pergaminho Luz', type: 'magic', dur: 2, holyDmg: 4, heal: 10, icon: 'fa-sun', img: 'itens/pergamino_luz.svg' },
    
    // Novos itens PASSIVOS
    ring_life: { name: 'Anel da Vida', type: 'passive', hpRegen: 2, maxHpBonus: 5, icon: 'fa-ring', img: 'itens/anel_vida.svg' },
    amulet_mana: { name: 'Amuleto Mana', type: 'passive', manaRegen: 1, maxManaBonus: 8, icon: 'fa-circle-notch', img: 'itens/amuleto_mana.svg' },
    cloak_shadows: { name: 'Capa Sombras', type: 'passive', dodgeBonus: 0.2, critBonus: 0.1, icon: 'fa-user-ninja', img: 'itens/capa_sombras.svg' },
    gloves_strength: { name: 'Luvas Força', type: 'passive', strBonus: 2, dmgBonus: 1, icon: 'fa-hand-rock', img: 'itens/luvas_forca.svg' },
    boots_swift: { name: 'Botas Velozes', type: 'passive', spdBonus: 3, firstStrike: true, icon: 'fa-wind', img: 'itens/botas_velozes.svg' }
};

export const ITEMS = Object.fromEntries(
    Object.entries(SHOP_ITEMS).map(([k, v]) => {
        const cost = getConfig().shop[k] ?? 999;
        return [k, { ...v, cost }];
    })
);

/** Preços base na ordem dos botões. Sempre atualizado. */
export function getBasePrices() {
    const s = getConfig().shop;
    return [
        'potion', 'mana_potion', 'boots', 'shield', 'coin',
        'sword_fire', 'bow_ice', 'hammer_thunder', 'dagger_poison', 'scroll_light',
        'ring_life', 'amulet_mana', 'cloak_shadows', 'gloves_strength', 'boots_swift'
    ].map(k => s[k] ?? 0);
}

/**
 * Tenta comprar um item. Custos vêm de GameConfig.
 */
export function buyItem(type, player, discount = 1) {
    const cost = (getConfig().shop[type] ?? 999);
    const item = { ...ITEMS[type], cost };
    if (!item) return { success: false, message: 'Item inválido' };

    const finalCost = Math.floor(item.cost * discount);
    if (player.gold < finalCost) {
        return { success: false, message: 'Ouro insuficiente' };
    }
    if (player.inventory.length >= 5) {
        return { success: false, message: 'Inventário cheio' };
    }

    player.gold -= finalCost;
    player.inventory.push({ ...item });
    return { success: true };
}

export function getPrice(type, discount = 1) {
    const c = getConfig().shop[type];
    return c != null ? Math.floor(c * discount) : 0;
}
