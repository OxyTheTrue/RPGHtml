/**
 * AdminPanel.js - Painel de debug/edição (Shift+D).
 * Atributos: GameConfig. Diálogos: DialogueData. Preview, Reset, Max Status, Forçar Evento.
 */

import { getConfig, setConfigValue, resetConfig, DEFAULT_CONFIG } from './GameConfig.js';
import { getDialogue, get, set, resetDialogue, DEFAULT_DIALOGUE } from './DialogueData.js';

const CONFIG_FIELDS = [
    { path: 'xp.base', label: 'XP base', min: 1, max: 50 },
    { path: 'xp.perLevel', label: 'XP por nível', min: 0.5, max: 3, step: 0.1 },
    { path: 'gold.min', label: 'Gold mínimo', min: 0, max: 20 },
    { path: 'gold.rand', label: 'Gold rand', min: 0, max: 20 },
    { path: 'gold.perLevel', label: 'Gold por nível', min: 0, max: 2, step: 0.1 },
    { path: 'drops.commonKey', label: 'Drop chave (comum)', min: 0, max: 0.2, step: 0.005 },
    { path: 'drops.commonPotion', label: 'Drop poção (comum)', min: 0, max: 0.2, step: 0.005 },
    { path: 'drops.eliteKey', label: 'Drop chave (elite)', min: 0, max: 0.2, step: 0.005 },
    { path: 'drops.elitePotion', label: 'Drop poção (elite)', min: 0, max: 0.2, step: 0.005 },
    { path: 'drops.bossKey', label: 'Drop chave (boss)', min: 0, max: 0.25, step: 0.005 },
    { path: 'drops.bossPotion', label: 'Drop poção (boss)', min: 0, max: 0.25, step: 0.005 },
    { path: 'enemy.hpScalePerLevel', label: 'HP inimigo/ nível', min: 0.05, max: 0.3, step: 0.01 },
    { path: 'enemy.dmgScalePerLevel', label: 'Dano inimigo/ nível', min: 0.05, max: 0.2, step: 0.01 },
    { path: 'player.baseNextXp', label: 'Base next XP', min: 20, max: 150 },
    { path: 'player.xpMultiplier', label: 'XP multiplier', min: 1.1, max: 2, step: 0.05 },
    { path: 'player.startHp', label: 'HP inicial', min: 5, max: 30 },
    { path: 'player.startMana', label: 'Mana inicial', min: 5, max: 30 },
    { path: 'healer.cost', label: 'Cura (ouro)', min: 0, max: 50 },
    { path: 'merchant.discount', label: 'Desconto mercador', min: 0.3, max: 1, step: 0.05 },
    { path: 'thief.goldPctMin', label: 'Ladrão % ouro min', min: 0.1, max: 0.5, step: 0.05 },
    { path: 'thief.goldPctMax', label: 'Ladrão % ouro max', min: 0.2, max: 0.6, step: 0.05 },
    { path: 'chest.mimicChance', label: 'Chance Mímico', min: 0, max: 1, step: 0.05 },
    { path: 'chest.goldBase', label: 'Ouro baú (base)', min: 10, max: 80 },
    { path: 'chest.goldPerLv', label: 'Ouro baú / nível', min: 0, max: 25 },
];

function flattenDialogue(obj, prefix = '') {
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push(...flattenDialogue(v, path));
        } else if (typeof v === 'string') {
            out.push({ path, label: path });
        } else if (Array.isArray(v)) {
            v.forEach((_, i) => out.push({ path: `${path}.${i}`, label: `Dica ${i + 1}` }));
        }
    }
    return out;
}

const DIALOGUE_PATHS = flattenDialogue(DEFAULT_DIALOGUE);

function getNested(obj, path) {
    return path.split('.').reduce((o, p) => (o != null ? o[p] : undefined), obj);
}

export function initAdminPanel(gameRef) {
    const container = document.getElementById('admin-panel');
    if (!container) return;

    let game = gameRef;

    function restoreGameRef() {
        if (typeof window.__rpgGame !== 'undefined') game = window.__rpgGame;
    }

    function render() {
        const cfg = getConfig();
        CONFIG_FIELDS.forEach(({ path }) => {
            const input = container.querySelector(`[data-config-path="${path}"]`);
            if (input) {
                const v = getNested(cfg, path);
                if (typeof v === 'number') input.value = v;
            }
        });
        DIALOGUE_PATHS.forEach(({ path }) => {
            const ta = container.querySelector(`[data-dialogue-path="${path}"]`);
            if (ta) {
                let v = get(path);
                if (Array.isArray(v)) v = v.join('\n');
                ta.value = (v != null ? String(v) : '');
            }
        });
    }

    const html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="margin:0;">Admin – Config & Diálogos</h2>
            <button class="admin-close" id="admin-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="admin-tabs">
            <button type="button" class="admin-tab-btn active" data-tab="attributos">Atributos</button>
            <button type="button" class="admin-tab-btn" data-tab="dialogos">Diálogos</button>
        </div>
        <div id="admin-tab-attributos" class="admin-tab visible">
            <div class="admin-section">
                <h3>XP / Gold</h3>
                ${CONFIG_FIELDS.filter(f => f.path.startsWith('xp.') || f.path.startsWith('gold.')).map(f => `
                    <div class="admin-row">
                        <label>${f.label}</label>
                        <input type="number" data-config-path="${f.path}" min="${f.min}" max="${f.max}" step="${f.step ?? 1}" />
                    </div>
                `).join('')}
            </div>
            <div class="admin-section">
                <h3>Drops</h3>
                ${CONFIG_FIELDS.filter(f => f.path.startsWith('drops.')).map(f => `
                    <div class="admin-row">
                        <label>${f.label}</label>
                        <input type="number" data-config-path="${f.path}" min="${f.min}" max="${f.max}" step="${f.step ?? 0.001}" />
                    </div>
                `).join('')}
            </div>
            <div class="admin-section">
                <h3>Inimigos / Player / NPCs</h3>
                ${CONFIG_FIELDS.filter(f => !f.path.startsWith('xp.') && !f.path.startsWith('gold.') && !f.path.startsWith('drops.')).map(f => `
                    <div class="admin-row">
                        <label>${f.label}</label>
                        <input type="number" data-config-path="${f.path}" min="${f.min}" max="${f.max}" step="${f.step ?? 1}" />
                    </div>
                `).join('')}
            </div>
        </div>
        <div id="admin-tab-dialogos" class="admin-tab">
            <div class="admin-preview-row">
                <select id="admin-preview-select">
                    <option value="healer">Curandeira</option>
                    <option value="merchant">Mercador</option>
                    <option value="thief">Ladrão</option>
                    <option value="archer">Arqueira</option>
                    <option value="chest">Baú</option>
                    <option value="monster">Monstro</option>
                </select>
                <button type="button" class="admin-btn-preview" id="admin-preview-btn">Preview</button>
            </div>
            ${['chest', 'healer', 'merchant', 'thief', 'archer'].map(npc => {
                const entries = DIALOGUE_PATHS.filter(d => d.path.startsWith(npc + '.'));
                if (!entries.length) return '';
                return `
                    <div class="admin-section">
                        <h3>${npc}</h3>
                        ${entries.map(e => `
                            <div class="admin-dialogue-item">
                                <label>${e.label || e.path}</label>
                                <textarea data-dialogue-path="${e.path}" rows="2"></textarea>
                            </div>
                        `).join('')}
                    </div>
                `;
            }).filter(Boolean).join('')}
        </div>
        <div class="admin-actions">
            <button type="button" class="admin-btn-reset" id="admin-reset">Resetar Tudo</button>
            <button type="button" class="admin-btn-max" id="admin-max">Max Status</button>
            <button type="button" class="admin-btn-force" id="admin-force">Forçar Próximo Evento</button>
        </div>
    `;

    container.innerHTML = html;

    const tabs = container.querySelectorAll('.admin-tab-btn');
    const panels = container.querySelectorAll('.admin-tab');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            const name = t.getAttribute('data-tab');
            tabs.forEach(x => x.classList.toggle('active', x === t));
            panels.forEach(p => {
                const isAttr = p.id === 'admin-tab-attributos';
                p.classList.toggle('visible', (name === 'attributos' && isAttr) || (name === 'dialogos' && !isAttr));
            });
        });
    });

    container.querySelector('#admin-close')?.addEventListener('click', () => {
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
    });

    container.querySelectorAll('[data-config-path]').forEach(input => {
        const path = input.getAttribute('data-config-path');
        input.addEventListener('change', () => {
            let v = parseFloat(input.value, 10);
            if (isNaN(v)) v = 0;
            setConfigValue(path, v);
        });
    });

    container.querySelectorAll('[data-dialogue-path]').forEach(ta => {
        const path = ta.getAttribute('data-dialogue-path');
        ta.addEventListener('input', () => {
            const val = ta.value;
            if (path.startsWith('archer.tips.')) {
                const idx = parseInt(path.split('.')[2], 10);
                const tips = get('archer.tips') || [];
                const arr = [...(Array.isArray(tips) ? tips : [])];
                arr[idx] = val;
                set('archer.tips', arr);
            } else {
                set(path, val);
            }
        });
    });

    container.querySelector('#admin-preview-btn')?.addEventListener('click', () => {
        restoreGameRef();
        const sel = container.querySelector('#admin-preview-select');
        const force = sel?.value || 'healer';
        if (!game?.player) {
            alert('Inicie um jogo para usar Preview.');
            return;
        }
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
        game.triggerRandomEvent(force);
    });

    container.querySelector('#admin-reset')?.addEventListener('click', () => {
        resetConfig();
        resetDialogue();
        render();
        alert('Config e diálogos resetados. Pode atualizar a página.');
    });

    container.querySelector('#admin-max')?.addEventListener('click', () => {
        restoreGameRef();
        if (!game?.player) {
            alert('Inicie um jogo para usar Max Status.');
            return;
        }
        const p = game.player;
        p.hp = p.maxHp;
        p.mana = p.maxMana;
        p.gold = 99999;
        p.furia = 100;
        game.ui?.updateUI(p, game.enemy, { merchantDiscount: game.merchantDiscount });
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
    });

    container.querySelector('#admin-force')?.addEventListener('click', () => {
        restoreGameRef();
        if (!game?.player) {
            alert('Inicie um jogo para forçar evento.');
            return;
        }
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
        game.triggerRandomEvent();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'D' && e.shiftKey) {
            e.preventDefault();
            container.classList.toggle('visible');
            container.setAttribute('aria-hidden', container.classList.contains('visible') ? 'false' : 'true');
            if (container.classList.contains('visible')) render();
        } else if (e.key === 'Escape' && container.classList.contains('visible')) {
            container.classList.remove('visible');
            container.setAttribute('aria-hidden', 'true');
        }
    });

    render();
}
