/**
 * Shop.js - Lógica de compra. Preços vêm de GameConfig.
 */

import { getConfig } from './GameConfig.js';

export const SHOP_ITEMS = {
    potion: { name: 'Poção Vida', heal: 18, icon: 'fa-flask', img: 'itens/pocao.png' },
    mana_potion: { name: 'Poção Mana', manaGain: 22, icon: 'fa-flask-vial', img: 'itens/pocao de mana.png' },
    boots: { name: 'Bota Agilidade', type: 'boots', dur: 5, icon: 'fa-boot', img: 'itens/botas.png' },
    shield: { name: 'Escudo Prata', type: 'shield', dur: 2, icon: 'fa-shield-halved', img: 'itens/escudo.png' },
    coin: { name: 'Moeda Sorte', type: 'coin', dur: 3, icon: 'fa-coins', img: 'itens/moeda da sorte.png' }
};

export const ITEMS = Object.fromEntries(
    Object.entries(SHOP_ITEMS).map(([k, v]) => {
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
