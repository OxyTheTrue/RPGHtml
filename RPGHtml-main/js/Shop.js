/**
 * Shop.js - Lógica de compra e definição de itens
 * Catálogo de itens e regras de compra (preço com desconto, inventário cheio).
 *
 * Balanceamento: preços altos para ouro ter valor — jogador precisa poupar para itens melhores.
 * Poções acessíveis; equipamentos e moeda da sorte como meta de ouro.
 */

export const ITEMS = {
    potion: { cost: 28, name: 'Poção Vida', heal: 18, icon: 'fa-flask' },
    mana_potion: { cost: 32, name: 'Poção Mana', manaGain: 22, icon: 'fa-flask-vial' },
    boots: { cost: 58, name: 'Bota Agilidade', type: 'boots', dur: 5, icon: 'fa-boot' },
    shield: { cost: 78, name: 'Escudo Prata', type: 'shield', dur: 2, icon: 'fa-shield-halved' },
    coin: { cost: 125, name: 'Moeda Sorte', type: 'coin', dur: 3, icon: 'fa-coins' }
};

/** Preços base na ordem dos botões da loja (potion, mana_potion, boots, shield, coin). */
export const BASE_PRICES = [28, 32, 58, 78, 125];

/**
 * Tenta comprar um item.
 * @param {string} type - Chave do item (potion, mana_potion, boots, shield, coin)
 * @param {Player} player - Instância do jogador
 * @param {number} discount - Multiplicador de preço (1 = normal, 0.5 = metade)
 * @returns {{ success: boolean, message?: string }}
 */
export function buyItem(type, player, discount = 1) {
    const item = ITEMS[type];
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

/**
 * Retorna o preço final de um item com desconto.
 */
export function getPrice(type, discount = 1) {
    const item = ITEMS[type];
    return item ? Math.floor(item.cost * discount) : 0;
}
