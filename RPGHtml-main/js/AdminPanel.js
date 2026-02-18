/**
 * AdminPanel.js - Painel de debug/edição melhorado (Shift+D).
 * Interface organizada por categorias com funcionalidades práticas para testes.
 */

import { getConfig, setConfigValue, resetConfig, DEFAULT_CONFIG } from './GameConfig.js';
import { getDialogue, set, resetDialogue, DEFAULT_DIALOGUE } from './DialogueData.js';
import { createDropItem } from './Game.js';

let game;

function getGenerateType(fieldPath) {
    if (fieldPath.includes('enemy')) return 'enemy';
    if (fieldPath.includes('hp')) return 'hp';
    if (fieldPath.includes('mana')) return 'mana';
    if (fieldPath.includes('xp')) return 'xp';
    if (fieldPath.includes('potion') || fieldPath.includes('item')) return 'item';
    if (fieldPath.includes('gold')) return 'gold';
    if (fieldPath.includes('chest')) return 'chest';
    if (fieldPath.includes('thief')) return 'thief';
    if (fieldPath.includes('healer')) return 'healer';
    if (fieldPath.includes('merchant')) return 'merchant';
    if (fieldPath.includes('key')) return 'key';
    if (fieldPath.includes('skill')) return 'skill';
    return 'default';
}

function generateContent(type, fieldPath) {
    if (!game?.player) {
        alert('Inicie um jogo para usar esta função!');
        return;
    }

    switch(type) {
        case 'enemy':
            game.spawnMonster();
            game.ui.typeLog('Inimigo spawnado!', 'info');
            break;
        case 'hp':
            game.player.hp = game.player.maxHp;
            game.ui.updateUI(game.player, game.enemy);
            game.ui.typeLog('HP restaurado!', 'heal');
            break;
        case 'mana':
            game.player.mana = game.player.maxMana;
            game.ui.updateUI(game.player, game.enemy);
            game.ui.typeLog('Mana restaurada!', 'heal');
            break;
        case 'xp':
            const xpAmount = Math.floor(Math.random() * 200) + 100;
            game.player.xp += xpAmount;
            game.ui.updateUI(game.player, game.enemy);
            game.ui.typeLog(`+${xpAmount} XP!`, 'loot');
            break;
        case 'item':
            const items = ['potion_hp', 'mana_potion', 'boots', 'shield', 'coin'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            const item = createDropItem(randomItem, game.player.lv);
            if (item && game.player.addItem(item)) {
                game.ui.updateUI(game.player, game.enemy);
                game.ui.typeLog(`${item.name} adicionado ao inventário!`, 'loot');
            }
            break;
        case 'key':
            const keyItem = createDropItem('key');
            if (keyItem && game.player.addItem(keyItem)) {
                game.ui.updateUI(game.player, game.enemy);
                game.ui.typeLog(`${keyItem.name} adicionado ao inventário!`, 'loot');
            }
            break;
        case 'gold':
            const goldAmount = Math.floor(Math.random() * 200) + 100;
            game.player.gold += goldAmount;
            game.ui.updateUI(game.player, game.enemy);
            game.ui.typeLog(`+${goldAmount} gold!`, 'loot');
            break;
        case 'chest':
            game.openChestChoice();
            break;
        case 'thief':
            game.thiefContest();
            break;
        case 'healer':
            game.healerNeutralAccept();
            break;
        case 'merchant':
            game.openShop();
            break;
        case 'skill':
            game.openSkillTree();
            break;
        default:
            alert('Tipo de geração não implementado');
    }
}

// Configurações organizadas por categorias
const CONFIG_CATEGORIES = {
    player: {
        title: ' JOGADOR',
        icon: 'fa-user',
        fields: [
            { path: 'xp.base', label: 'XP Base', min: 1, max: 50, description: 'XP ganho por nível' },
            { path: 'xp.perLevel', label: 'XP por Nível', min: 0.5, max: 3, step: 0.1, description: 'XP necessário para próximo nível' },
            { path: 'player.startHp', label: 'HP Inicial', min: 5, max: 30, description: 'HP no início do jogo' },
            { path: 'player.startMana', label: 'Mana Inicial', min: 5, max: 30, description: 'Mana no início do jogo' },
            { path: 'player.baseNextXp', label: 'XP Base Próximo', min: 20, max: 150, description: 'XP base para próximo nível' },
            { path: 'player.xpMultiplier', label: 'Multiplicador XP', min: 1, max: 2, step: 0.1, description: 'Multiplicador de XP ganho' }
        ]
    },
    combat: {
        title: ' COMBATE',
        icon: 'fa-sword',
        fields: [
            { path: 'enemy.hpScalePerLevel', label: 'HP Inimigo/Nível', min: 0.05, max: 0.3, step: 0.01, description: 'Multiplicador de HP do inimigo por nível' },
            { path: 'enemy.dmgScalePerLevel', label: 'Dano Inimigo/Nível', min: 0.05, max: 0.2, step: 0.01, description: 'Multiplicador de dano do inimigo por nível' }
        ]
    },
    economy: {
        title: ' ECONOMIA',
        icon: 'fa-coins',
        fields: [
            { path: 'gold.min', label: 'Gold Mínimo', min: 0, max: 50, description: 'Gold mínimo gerado por inimigo' },
            { path: 'gold.rand', label: 'Gold Rand', min: 0, max: 20, description: 'Gold aleatório extra (0-20)' },
            { path: 'gold.perLevel', label: 'Gold/Nível', min: 0, max: 5, step: 0.1, description: 'Gold extra por nível' },
            { path: 'merchant.discount', label: 'Desconto Loja', min: 0.5, max: 1, step: 0.05, description: 'Desconto na loja do mercador' },
            { path: 'healer.cost', label: 'Custo Cura', min: 0, max: 100, step: 1, description: 'Custo da cura da curandeira' }
        ]
    },
    drops: {
        title: ' DROPS',
        icon: 'fa-gift',
        fields: [
            { path: 'drops.commonKey', label: 'Chave Comum', min: 0, max: 0.2, step: 0.01, description: 'Chance de drop de chave comum' },
            { path: 'drops.commonPotion', label: 'Poção Comum', min: 0, max: 0.2, step: 0.01, description: 'Chance de drop de poção comum' },
            { path: 'drops.eliteKey', label: 'Chave Elite', min: 0, max: 0.1, step: 0.01, description: 'Chance de drop de chave elite' },
            { path: 'drops.elitePotion', label: 'Poção Elite', min: 0, max: 0.1, step: 0.01, description: 'Chance de drop de poção elite' },
            { path: 'drops.bossKey', label: 'Chave Boss', min: 0, max: 0.25, step: 0.01, description: 'Chance de drop de chave de boss' },
            { path: 'drops.bossPotion', label: 'Poção Boss', min: 0, max: 0.25, step: 0.01, description: 'Chance de drop de poção de boss' }
        ]
    },
    events: {
        title: ' EVENTOS',
        icon: 'fa-calendar',
        fields: [
            { path: 'chest.mimicChance', label: 'Chance Baú Mímico', min: 0, max: 0.5, step: 0.01, description: 'Chance de baú ser um mimico' },
            { path: 'thief.goldPctMin', label: 'Roubo % Mínimo', min: 0, max: 0.5, step: 0.01, description: 'Porcentagem mínima de ouro roubada' },
            { path: 'thief.goldPctMax', label: 'Roubo % Máximo', min: 0, max: 0.6, step: 0.01, description: 'Porcentagem máxima de ouro roubada' }
        ]
    }
};

function flattenDialogue(obj, prefix = '') {
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push(...flattenDialogue(v, path));
        } else if (typeof v === 'string') {
            out.push({ path, label: v });
        } else if (Array.isArray(v)) {
            v.forEach((_, i) => out.push({ path: `${path}.${i}`, label: `Dica ${i + 1}` }));
        }
    }
    return out;
}

function render() {
    const container = document.getElementById('admin-container');
    if (!container) return;

    // Cabeçalho com título e botão de fechar
    const header = `
        <div class="admin-header">
            <div class="admin-title">
                <i class="fa-solid fa-cogs"></i>
                <span>PAINEL DE ADMINISTRAÇÃO</span>
            </div>
            <button class="admin-close" id="admin-close">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
    `;

    // Abas de navegação
    const tabs = Object.keys(CONFIG_CATEGORIES).map(category => `
        <button class="admin-tab-btn" data-tab="${category}">
            <i class="${CONFIG_CATEGORIES[category].icon}"></i>
            <span>${CONFIG_CATEGORIES[category].title}</span>
        </button>
    `).join('');

    // Conteúdo das abas
    const panels = Object.entries(CONFIG_CATEGORIES).map(([category, config]) => `
        <div class="admin-tab" id="admin-tab-${category}">
            <div class="admin-category-header">
                <i class="${config.icon}"></i>
                <h3>${config.title}</h3>
            </div>
            <div class="admin-fields">
                ${config.fields.map(field => `
                    <div class="admin-field">
                        <div class="field-info">
                            <label>${field.label}</label>
                            <small>${field.description}</small>
                        </div>
                        <div class="field-control">
                            <input type="number" 
                                   data-config-path="${field.path}" 
                                   min="${field.min}" 
                                   max="${field.max}" 
                                   step="${field.step || 1}" 
                                   value="${getConfig()[field.path] || field.min}" />
                            <button class="field-reset" data-path="${field.path}">↺</button>
                            <button class="field-generate" data-field="${field.path}" data-type="${getGenerateType(field.path)}">🎲</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Ações rápidas
    const quickActions = `
        <div class="admin-quick-actions">
            <button class="admin-quick-btn" id="admin-save-config">
                <i class="fa-solid fa-save"></i>
                <span>Salvar Config</span>
            </button>
            <button class="admin-quick-btn" id="admin-reset-config">
                <i class="fa-solid fa-undo"></i>
                <span>Resetar Config</span>
            </button>
            <button class="admin-quick-btn" id="admin-export-config">
                <i class="fa-solid fa-download"></i>
                <span>Exportar Config</span>
            </button>
            <button class="admin-quick-btn" id="admin-import-config">
                <i class="fa-solid fa-upload"></i>
                <span>Importar Config</span>
            </button>
        </div>
    `;

    // Diálogos de eventos
    const dialogues = ['healer', 'merchant', 'thief', 'archer', 'chest'];
    const dialoguePanel = `
        <div class="admin-tab" id="admin-tab-dialogos">
            <div class="admin-category-header">
                <i class="fa-solid fa-comments"></i>
                <h3>DIÁLOGOS DE EVENTOS</h3>
            </div>
            <div class="admin-dialogue-selector">
                <select id="admin-dialogue-select">
                    ${dialogues.map(npc => `
                        <option value="${npc}">${npc.charAt(0).toUpperCase() + npc.slice(1)}</option>
                    `).join('')}
                </select>
                <button class="admin-preview-btn" id="admin-preview-btn">
                    <i class="fa-solid fa-eye"></i>
                    <span>Preview</span>
                </button>
            </div>
            <div class="admin-dialogue-content" id="admin-dialogue-content"></div>
        </div>
    </div>
    `;

    // Botões de teste
    const testButtons = `
        <div class="admin-test-section">
            <h3>🎮 TESTES RÁPIDOS</h3>
            <div class="test-grid">
                <button class="test-btn" id="test-heal">
                    <i class="fa-solid fa-heart"></i>
                    <span>Curar Player</span>
                </button>
                <button class="test-btn" id="test-add-gold">
                    <i class="fa-solid fa-coins"></i>
                    <span>+100 Gold</span>
                </button>
                <button class="test-btn" id="test-add-xp">
                    <i class="fa-solid fa-star"></i>
                    <span>+100 XP</span>
                </button>
                <button class="test-btn" id="test-add-item">
                    <i class="fa-solid fa-gift"></i>
                    <span>Adicionar Item Aleatório</span>
                </button>
                <button class="test-btn" id="test-spawn-enemy">
                    <i class="fa-solid fa-dragon"></i>
                    <span>Spawn Inimigo Aleatório</span>
                </button>
                <button class="test-btn" id="test-trigger-event">
                    <i class="fa-solid fa-calendar"></i>
                    <span>Disparar Evento Aleatório</span>
                </button>
            </div>
        </div>
    `;

    container.innerHTML = `
        ${header}
        <div class="admin-tabs">
            ${tabs}
        </div>
        <div class="admin-content">
            ${panels}
            ${dialoguePanel}
            ${testButtons}
            ${quickActions}
        </div>
    `;

    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Tabs
    const tabs = document.querySelectorAll('.admin-tab-btn');
    const panels = document.querySelectorAll('.admin-tab');

    tabs.forEach(t => {
        t.addEventListener('click', () => {
            const name = t.getAttribute('data-tab');
            tabs.forEach(x => x.classList.toggle('active', x === t));
            panels.forEach(p => {
                p.classList.toggle('visible', p.id === `admin-tab-${name}`);
            });
        });
    });

    // Close button
    document.querySelector('#admin-close')?.addEventListener('click', () => {
        const container = document.getElementById('admin-container');
        if (container) {
            container.classList.remove('visible');
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
        }
    });

    // Config inputs
    document.querySelectorAll('[data-config-path]').forEach(input => {
        const path = input.getAttribute('data-config-path');
        input.addEventListener('change', () => {
            let v = parseFloat(input.value, 10);
            if (isNaN(v)) v = 0;
            setConfigValue(path, v);
        });

        // Reset buttons
        const resetBtn = input.nextElementSibling;
        if (resetBtn && resetBtn.classList.contains('field-reset')) {
            resetBtn.addEventListener('click', () => {
                input.value = getConfig()[path] || DEFAULT_CONFIG[path];
                setConfigValue(path, input.value);
            });
        }
    });

    // Quick actions
    document.getElementById('admin-save-config')?.addEventListener('click', saveConfig);
    document.getElementById('admin-reset-config')?.addEventListener('click', resetAllConfig);
    document.getElementById('admin-export-config')?.addEventListener('click', exportConfig);
    document.getElementById('admin-import-config')?.addEventListener('click', importConfig);

    // Test buttons
    document.getElementById('test-heal')?.addEventListener('click', () => {
        if (window.game?.player) {
            window.game.player.hp = window.game.player.maxHp;
            window.game.player.mana = window.game.player.maxMana;
            window.game.ui.updateUI(window.game.player, window.game.enemy);
        }
    });

    document.getElementById('test-add-gold')?.addEventListener('click', () => {
        if (window.game?.player) {
            window.game.player.gold += 100;
            window.game.ui.updateUI(window.game.player, window.game.enemy);
        }
    });

    document.getElementById('test-add-xp')?.addEventListener('click', () => {
        if (window.game?.player) {
            window.game.player.xp += 100;
            window.game.ui.updateUI(window.game.player, window.game.enemy);
        }
    });

    document.getElementById('test-add-item')?.addEventListener('click', () => {
        if (window.game?.player) {
            const items = ['potion_hp', 'mana_potion', 'boots', 'shield', 'coin'];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            const item = createDropItem(randomItem, window.game.player.lv);
            if (item && window.game.player.addItem(item)) {
                window.game.ui.updateUI(window.game.player, window.game.enemy);
            }
        }
    });

    document.getElementById('test-spawn-enemy')?.addEventListener('click', () => {
        if (window.game) {
            window.game.spawnMonster();
        }
    });

    document.getElementById('test-trigger-event')?.addEventListener('click', () => {
        if (window.game) {
            window.game.triggerRandomEvent();
        }
    });

    // Dialogue preview
    document.getElementById('admin-preview-btn')?.addEventListener('click', () => {
        const sel = document.querySelector('#admin-dialogue-select');
        const npc = sel?.value;
        if (!npc) return;
        
        const entries = DIALOGUE_PATHS.filter(d => d.path.startsWith(npc + '.'));
        const content = document.getElementById('admin-dialogue-content');
        content.innerHTML = entries.map(e => `
            <div class="dialogue-item">
                <label>${e.label || e.path}</label>
                <textarea data-dialogue-path="${e.path}" rows="3">${get(e.path) || ''}</textarea>
            </div>
        `).join('');
    });

    // Dialogue save
    document.getElementById('admin-dialogue-content')?.addEventListener('input', (e) => {
        const path = e.target.getAttribute('data-dialogue-path');
        if (path.startsWith('archer.tips.')) {
            const idx = parseInt(path.split('.')[2], 10);
            const tips = get('archer.tips') || [];
            const arr = [...(Array.isArray(tips) ? tips : [])];
            arr[idx] = e.target.value;
            set('archer.tips', arr);
        } else {
            set(path, e.target.value);
        }
    });

    // Generate buttons
    document.querySelectorAll('.field-generate').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldPath = btn.getAttribute('data-field');
            const type = btn.getAttribute('data-type');
            generateContent(type, fieldPath);
        });
    });

    // Teclado: Shift+D para abrir/fechar, Esc para fechar
    document.addEventListener('keydown', (e) => {
        const container = document.getElementById('admin-container');
        if (!container) return;
        
        if (e.key === 'D' && e.shiftKey) {
            e.preventDefault();
            container.classList.toggle('visible');
            
            // Forçar display via JavaScript se CSS não funcionar
            if (container.classList.contains('visible')) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
            
            container.setAttribute('aria-hidden', container.classList.contains('visible') ? 'false' : 'true');
            if (container.classList.contains('visible')) render();
        } else if (e.key === 'Escape' && container.classList.contains('visible')) {
            container.classList.remove('visible');
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
        }
    });
}

function saveConfig() {
    const config = {};
    document.querySelectorAll('[data-config-path]').forEach(input => {
        const path = input.getAttribute('data-config-path');
        config[path] = parseFloat(input.value, 10);
    });
    
    localStorage.setItem('rpg_admin_config', JSON.stringify(config));
    alert('Configuração salva com sucesso!');
}

function resetAllConfig() {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
        resetConfig();
        localStorage.removeItem('rpg_admin_config');
        render();
        alert('Configurações resetadas!');
    }
}

function exportConfig() {
    const config = localStorage.getItem('rpg_admin_config');
    if (config) {
        const blob = new Blob([config], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rpg_config.json';
        a.click();
        alert('Configuração exportada!');
    }
}

function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);
                    localStorage.setItem('rpg_admin_config', JSON.stringify(config));
                    Object.entries(config).forEach(([path, value]) => {
                        setConfigValue(path, value);
                    });
                    render();
                    alert('Configuração importada com sucesso!');
                } catch (error) {
                    alert('Erro ao importar configuração: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function initAdminPanel(gameRef) {
    game = gameRef;
    let container = document.getElementById('admin-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-container';
        container.className = 'admin-panel';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
    }
    render();
}

export { initAdminPanel };
