/**
 * Shop.js - Lógica de compra. Preços vêm de GameConfig.
 */

import { getConfig } from './GameConfig.js';

const ITEM_META = {
    potion: { name: 'Poção Vida', heal: 18, icon: 'fa-flask' },
    mana_potion: { name: 'Poção Mana', manaGain: 22, icon: 'fa-flask-vial' },
    boots: { name: 'Bota Agilidade', type: 'boots', dur: 5, icon: 'fa-boot' },
    shield: { name: 'Escudo Prata', type: 'shield', dur: 2, icon: 'fa-shield-halved' },
    coin: { name: 'Moeda Sorte', type: 'coin', dur: 3, icon: 'fa-coins' }
};

export const ITEMS = Object.fromEntries(
    Object.entries(ITEM_META).map(([k, v]) => {
        const cost = getConfig().shop[k] ?? 999;
        return [k, { ...v, cost }];
    })
);

/** Preços base na ordem dos botões (potion, mana_potion, boots, shield, coin). Sempre atualizado. */
export function getBasePrices() {
    const s = getConfig().shop;
    return ['potion', 'mana_potion', 'boots', 'shield', 'coin'].map(k => s[k] ?? 0);
}

/**
 * Tenta comprar um item. Custos vêm de GameConfig.
 */
export function buyItem(type, player, discount = 1) {
    const cost = (getConfig().shop[type] ?? 999);
    const item = { ...ITEM_META[type], cost };
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
