/**
 * UI.js - Manipulação do DOM
 * Barras de vida, log, botões, tooltips e modais.
 */

import { getBasePrices } from './Shop.js';
import { resolveImagePath, IMG_FALLBACK } from './assets.js';

/** Cores do log por tipo de mensagem (dano, cura, loot, etc.). */
const LOG_COLORS = {
    damage: '#ff4757',
    heal: '#0b7939',
    loot: '#ffd079',
    info: '#54a0ff',
    win: '#2ecc71',
    spawn: '#f1970f',
    default: '#ffffff'
};

const STAT_CONFIG = {
    str: { name: 'FORÇA', icon: 'fa-hand-fist', color: '#ff4757' },
    spd: { name: 'VELOCIDADE', icon: 'fa-bolt', color: '#54a0ff' },
    int: { name: 'INTELIGÊNCIA', icon: 'fa-brain', color: '#9c88ff' },
    luk: { name: 'SORTE', icon: 'fa-clover', color: '#2ed573' },
    vit: { name: 'VITALIDADE', icon: 'fa-heart-pulse', color: '#ff6b81' }
};

let tooltipTimeout = null;

const SETTINGS_MUTE_KEY = 'rpg_mute';

export class UI {
    constructor() {
        this.tooltip = document.getElementById('stat-tooltip');
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this._bindTooltipClose();
    }

    /** Retorna se o áudio está mudo (persistido em localStorage). */
    isMuted() {
        return localStorage.getItem(SETTINGS_MUTE_KEY) === '1';
    }

    setMuted(muted) {
        if (muted) localStorage.setItem(SETTINGS_MUTE_KEY, '1');
        else localStorage.removeItem(SETTINGS_MUTE_KEY);
    }

    _bindTooltipClose() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.attr-info') && this.tooltip && this.tooltip.classList.contains('visible')) {
                this.tooltip.classList.remove('visible');
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
            }
        });
    }

    /** Toca som (atk, magic, heal, dmg, gold). Respeita mute nas configurações. */
    playSound(type) {
        if (this.isMuted()) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        const now = this.audioCtx.currentTime;
        switch (type) {
            case 'atk':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                break;
            case 'magic':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                break;
            case 'heal':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);
                break;
            case 'dmg':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(10, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                break;
            case 'gold':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                break;
        }
        osc.start();
        osc.stop(now + 0.3);
    }

    showGame() {
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
    }

    /** Mostra etapa do menu: 'buttons' | 'name' | 'difficulty' | 'load'. */
    showMenuStep(step) {
        ['buttons', 'name', 'difficulty', 'load'].forEach(s => {
            const el = document.getElementById(`menu-step-${s}`);
            if (el) el.style.display = s === step ? 'flex' : 'none';
        });
    }

    showStatValue(stat, player, event) {
        if (!player) return;
        const c = STAT_CONFIG[stat];
        if (!c) return;
        const level = player.levels[stat];
        const value = player[stat];
        document.getElementById('tooltip-icon').className = `fa-solid ${c.icon}`;
        document.getElementById('tooltip-icon').style.color = c.color;
        document.getElementById('tooltip-name').textContent = c.name;
        document.getElementById('tooltip-level').textContent = level;
        document.getElementById('tooltip-value').textContent = value;
        if (event) {
            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY - 20}px`;
        }
        this.tooltip.classList.add('visible');
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => this.tooltip.classList.remove('visible'), 3000);
    }

    updateUI(player, enemy, options = {}) {
        if (!player) return;
        const { merchantDiscount = 1 } = options;

        const hpBar = document.getElementById('p-hp-bar');
        if (hpBar) hpBar.style.width = (player.hp / player.maxHp * 100) + '%';
        
        const manaBar = document.getElementById('p-mana-bar');
        if (manaBar) manaBar.style.width = (player.mana / player.maxMana * 100) + '%';
        
        const furiaBar = document.getElementById('p-furia-bar');
        if (furiaBar) furiaBar.style.width = player.furia + '%';
        
        const xpBar = document.getElementById('p-xp-bar');
        if (xpBar) xpBar.style.width = (player.xp / player.nextXp * 100) + '%';

        // Update XP display
        const xpCurrentEl = document.getElementById('p-xp-current');
        const xpNeededEl = document.getElementById('p-xp-needed');
        if (xpCurrentEl) xpCurrentEl.textContent = Math.floor(player.xp);
        if (xpNeededEl) xpNeededEl.textContent = player.nextXp;

        // Update skill points display in stats panel
        const skillPointsDisplay = document.getElementById('p-skill-points-display');
        if (skillPointsDisplay) skillPointsDisplay.textContent = player.skillPoints || 0;

        // Update XP to next in stats panel
        const xpToNextEl = document.getElementById('p-xp-to-next');
        if (xpToNextEl) xpToNextEl.textContent = `${Math.ceil(player.nextXp - player.xp)} XP`;

        if (enemy) {
            const bar = document.getElementById('enemy-bar');
            if (typeof enemy.hp === 'number' && typeof enemy.maxHp === 'number' && bar) {
                bar.style.width = (enemy.hp / enemy.maxHp * 100) + '%';
            }
            const enemyNameEl = document.getElementById('enemy-name');
            if (enemyNameEl) enemyNameEl.textContent = enemy.name;
            document.getElementById('enemy-hp').textContent = typeof enemy.hp === 'number' ? Math.ceil(enemy.hp) : enemy.hp;
            document.getElementById('enemy-max-hp').textContent = enemy.maxHp;
        }

        document.getElementById('p-lv').textContent = player.lv;
        document.getElementById('p-hp').textContent = Math.ceil(player.hp);
        document.getElementById('p-max-hp').textContent = player.maxHp;
        document.getElementById('p-mana').textContent = Math.ceil(player.mana);
        document.getElementById('p-gold').textContent = player.gold;
        const spEl = document.getElementById('p-skill-points');
        if (spEl) spEl.textContent = player.skillPoints || 0;

        document.getElementById('stat-str').textContent = player.levels.str;
        document.getElementById('stat-spd').textContent = player.levels.spd;
        document.getElementById('stat-int').textContent = player.levels.int;
        document.getElementById('stat-luk').textContent = player.levels.luk;
        document.getElementById('stat-vit').textContent = player.levels.vit;

        const prices = getBasePrices();
        document.querySelectorAll('.item-price').forEach((span, i) => {
            span.textContent = Math.floor((prices[i] ?? 0) * merchantDiscount);
        });

        document.querySelectorAll('.lvl-up-btn').forEach(btn => {
            btn.style.display = player.pendingPoints > 0 ? 'block' : 'none';
        });

        const slots = document.querySelectorAll('.slot');
        slots.forEach((s, i) => {
            const item = player.inventory[i];
            
            if (item) {
                // Verificar se o ícone já tem 'fa-solid' ou precisa adicionar
                const iconClass = item.icon.startsWith('fa-') ? item.icon : `fa-solid ${item.icon}`;
                s.innerHTML = `<i class="${iconClass}" style="color: #ffa502"></i>`;
            } else {
                s.innerHTML = '';
            }
        });

        // Atualizar inventário de itens ativos
        const activeSlots = document.querySelectorAll('#active-slots .slot');
        activeSlots.forEach((s, i) => {
            const item = player.activeInventory[i];
            
            if (item) {
                const iconClass = item.icon.startsWith('fa-') ? item.icon : `fa-solid ${item.icon}`;
                s.innerHTML = `<i class="${iconClass}" style="color: #ffa502"></i>`;
            } else {
                s.innerHTML = '';
            }
        });

        // Atualizar inventário de itens passivos
        const passiveSlots = document.querySelectorAll('#passive-slots .slot');
        passiveSlots.forEach((s, i) => {
            const item = player.passiveInventory[i];
            
            if (item) {
                const iconClass = item.icon.startsWith('fa-') ? item.icon : `fa-solid ${item.icon}`;
                s.innerHTML = `<i class="${iconClass}" style="color: #ffa502"></i>`;
            } else {
                s.innerHTML = '';
            }
        });

        const ult = document.getElementById('ult-btn');
        if (ult) ult.style.display = player.furia >= 100 ? 'flex' : 'none';

        const valAtk = document.getElementById('val-atk');
        if (valAtk) {
            const { min, max } = player.getPhysicalDamageRange ? player.getPhysicalDamageRange() : { min: 0, max: 0 };
            valAtk.textContent = `${min}-${max} Dano`;
        }

        // Update learned skills in stats panel
        this.updateLearnedSkills(player);
    }

    updateLearnedSkills(player) {
        const learnedSkillsEl = document.getElementById('learned-skills-list');
        if (!learnedSkillsEl || !player.skills) return;

        learnedSkillsEl.innerHTML = '';
        
        if (player.skills.length === 0) {
            learnedSkillsEl.innerHTML = '<p style="color: var(--text-dim); font-size: 0.9rem;">Nenhuma habilidade aprendida</p>';
            return;
        }

        player.skills.forEach(skill => {
            const skillEl = document.createElement('div');
            skillEl.className = 'learned-skill-item';
            skillEl.style.cssText = `
                background: var(--panel);
                padding: 10px;
                border-radius: 8px;
                border: 1px solid var(--border);
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            
            skillEl.innerHTML = `
                <i class="fa-solid ${skill.icon || 'fa-magic'}" style="color: var(--mana); font-size: 1.2rem;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text);">${skill.name || 'Skill'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-dim);">Nível ${skill.level || 1}</div>
                </div>
            `;
            
            learnedSkillsEl.appendChild(skillEl);
        });
    }

    // Sistema de dano flutuante
    showFloatingDamage(target, amount, type = 'damage') {
        const container = document.getElementById(`${target}-damage-indicators`);
        if (!container) return;

        const damageEl = document.createElement('div');
        damageEl.className = `damage-number ${type}`;
        damageEl.textContent = type === 'heal' ? `+${amount}` : `-${amount}`;
        
        // Posição aleatória no container
        const randomX = 20 + Math.random() * 60; // 20-80% do width
        const randomY = 20 + Math.random() * 60; // 20-80% do height
        
        damageEl.style.left = `${randomX}%`;
        damageEl.style.top = `${randomY}%`;
        
        container.appendChild(damageEl);
        
        // Remover após a animação
        setTimeout(() => {
            if (damageEl.parentNode) {
                damageEl.parentNode.removeChild(damageEl);
            }
        }, 1500);
    }

    // Efeitos visuais de combate
    applyDamageEffect(target = 'enemy') {
        const spriteContainer = document.getElementById(`${target}-sprite-container`);
        if (!spriteContainer) return;

        spriteContainer.classList.add('shake-effect');
        setTimeout(() => {
            spriteContainer.classList.remove('shake-effect');
        }, 500);
    }

    applyHealEffect(target = 'player') {
        const spriteContainer = document.getElementById(`${target}-sprite-container`);
        if (!spriteContainer) return;

        spriteContainer.classList.add('flash-effect');
        setTimeout(() => {
            spriteContainer.classList.remove('flash-effect');
        }, 300);
    }

    // Feedback de combate na área central
    showCombatFeedback(message, type = 'info') {
        const feedbackEl = document.getElementById('combat-feedback');
        if (!feedbackEl) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'combat-message';
        messageEl.style.cssText = `
            background: var(--panel);
            padding: 15px 20px;
            border-radius: 10px;
            border: 2px solid var(--border);
            margin-bottom: 10px;
            font-weight: 600;
            text-align: center;
            animation: slideInRight 0.3s ease-out;
            color: ${type === 'damage' ? 'var(--damage)' : type === 'heal' ? 'var(--heal)' : type === 'xp' ? 'var(--xp)' : 'var(--text)'};
        `;
        
        messageEl.textContent = message;
        
        feedbackEl.appendChild(messageEl);
        
        // Remover após alguns segundos
        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    // Toggle do painel de status
    toggleStatsPanel() {
        const panel = document.getElementById('stats-panel');
        if (!panel) return;

        panel.classList.toggle('visible');
    }

    closeStatsPanel() {
        const panel = document.getElementById('stats-panel');
        if (!panel) return;

        panel.classList.remove('visible');
    }

    // Animação de morte do inimigo
    animateEnemyDeath() {
        const enemySprite = document.getElementById('enemy-img');
        const enemyCard = document.querySelector('.enemy-card');
        
        if (enemySprite) {
            enemySprite.classList.add('enemy-death-animation');
        }
        
        if (enemyCard) {
            enemyCard.classList.add('enemy-death-card');
        }
        
        // Remover classes após animação
        setTimeout(() => {
            if (enemySprite) {
                enemySprite.classList.remove('enemy-death-animation');
            }
            if (enemyCard) {
                enemyCard.classList.remove('enemy-death-card');
            }
        }, 1500);
    }

    // Animação de dano do player
    animatePlayerDamage() {
        const playerVisual = document.querySelector('.player-visual');
        
        if (playerVisual) {
            playerVisual.classList.add('player-damage-animation');
            
            // Remover classe após animação
            setTimeout(() => {
                playerVisual.classList.remove('player-damage-animation');
            }, 500);
        }
    }

    // Animação de dano do inimigo
    animateEnemyDamage() {
        const enemySprite = document.getElementById('enemy-img');
        const enemyCard = document.querySelector('.enemy-card');
        
        if (enemySprite) {
            enemySprite.classList.add('enemy-damage-animation');
        }
        
        if (enemyCard) {
            enemyCard.classList.add('enemy-damage-card');
        }
        
        // Remover classes após animação
        setTimeout(() => {
            if (enemySprite) {
                enemySprite.classList.remove('enemy-damage-animation');
            }
            if (enemyCard) {
                enemyCard.classList.remove('enemy-damage-card');
            }
        }, 500);
    }

    // Animação de cura do player
    animatePlayerHeal() {
        const playerVisual = document.querySelector('.player-visual');
        
        if (playerVisual) {
            playerVisual.classList.add('player-heal-animation');
            
            // Remover classe após animação
            setTimeout(() => {
                playerVisual.classList.remove('player-heal-animation');
            }, 800);
        }
    }

    // Animação de defesa do player
    animatePlayerDefend() {
        const playerVisual = document.querySelector('.player-visual');
        
        if (playerVisual) {
            playerVisual.classList.add('player-defend-animation');
            
            // Remover classe após animação
            setTimeout(() => {
                playerVisual.classList.remove('player-defend-animation');
            }, 1000);
        }
    }

    // Animação de descanso do player
    animatePlayerRest() {
        const playerVisual = document.querySelector('.player-visual');
        
        if (playerVisual) {
            playerVisual.classList.add('player-rest-animation');
            
            // Remover classe após animação
            setTimeout(() => {
                playerVisual.classList.remove('player-rest-animation');
            }, 1200);
        }
    }

    // Animação de golpe de fúria do player
    animatePlayerUltimate() {
        const playerVisual = document.querySelector('.player-visual');
        
        if (playerVisual) {
            playerVisual.classList.add('player-ultimate-animation');
            
            // Remover classe após animação
            setTimeout(() => {
                playerVisual.classList.remove('player-ultimate-animation');
            }, 1500);
        }
    }

    /** Atualiza apenas os botões de skill (ícone e nível). */
    updateSkillSlots(player, skillList) {
        for (let i = 0; i < 3; i++) {
            const slot = document.getElementById(`skill-slot-${i}`);
            if (!slot) continue;
            if (player.skills[i]) {
                const sData = skillList.find(s => s.id === player.skills[i].id);
                slot.disabled = false;
                slot.innerHTML = `<i class="fa-solid ${sData.icon}"></i><div class="skill-info">LV ${player.skills[i].level}</div>`;
            } else {
                slot.disabled = true;
                slot.innerHTML = '<i class="fa-solid fa-lock"></i>';
            }
        }
    }

    /**
     * Adiciona mensagem ao log com cor. Mantém mensagem mais recente ao fundo (scroll automático).
     * @param {string} text - Texto da mensagem
     * @param {string} colorOrType - Cor hex ou chave em LOG_COLORS ('damage'|'heal'|'loot'|'info'|'win'|'default')
     */
    async typeLog(text, colorOrType = 'default') {
        const log = document.getElementById('game-log');
        if (!log) return;
        const color = LOG_COLORS[colorOrType] || colorOrType;
        const line = document.createElement('div');
        line.style.color = color;
        line.className = 'log-line';
        line.innerHTML = '> ';
        log.appendChild(line);
        for (const char of text) {
            line.innerHTML += char;
            log.scrollTop = log.scrollHeight;
            await new Promise(r => setTimeout(r, 10));
        }
        await new Promise(r => setTimeout(r, 400));
        log.scrollTop = log.scrollHeight;
    }

    /** Renderiza os botões de combate (ataque, curar, defender, descansar, ultimate, skills). */
    renderCombatButtons(skillList = []) {
        const container = document.getElementById('action-buttons');
        container.innerHTML = `
            <button class="action-btn btn-atk" data-action="attack">
                <i class="fa-solid fa-sword"></i> ATACAR <div class="skill-info" id="val-atk">-</div>
            </button>
            <button class="action-btn btn-heal" data-action="heal">
                <i class="fa-solid fa-hand-holding-medical"></i> CURAR <div class="skill-info" id="val-heal">-</div>
            </button>
            <button class="action-btn btn-def" data-action="defend">
                <i class="fa-solid fa-shield-halved"></i> DEFENDER <div class="skill-info">REDUZ DANO</div>
            </button>
            <button class="action-btn btn-rest" data-action="rest">
                <i class="fa-solid fa-bed"></i> DESCANSAR <div class="skill-info" id="val-rest">-</div>
            </button>
            <button id="ult-btn" class="action-btn btn-ult" data-action="ultimate" style="display: none;">
                <i class="fa-solid fa-sun"></i> GOLPE SUPREMO <div class="skill-info" id="val-ult">LIBERADO!</div>
            </button>
            <div class="skill-row">
                <button id="skill-slot-0" class="action-btn btn-skill" data-action="skill" data-skill-index="0" disabled><i class="fa-solid fa-lock"></i></button>
                <button id="skill-slot-1" class="action-btn btn-skill" data-action="skill" data-skill-index="1" disabled><i class="fa-solid fa-lock"></i></button>
                <button id="skill-slot-2" class="action-btn btn-skill" data-action="skill" data-skill-index="2" disabled><i class="fa-solid fa-lock"></i></button>
            </div>
        `;
    }

    toggleButtons(disabled) {
        document.querySelectorAll('#action-buttons button').forEach(b => {
            if (!b.id || !b.id.startsWith('skill-slot')) b.disabled = disabled;
        });
    }

    applyDamageEffect() {
        const img = document.getElementById('enemy-img');
        if (img) {
            img.classList.add('take-damage');
            setTimeout(() => img.classList.remove('take-damage'), 400);
        }
    }

    /**
     * Define imagem do inimigo. Usa /imagens/ + nome do arquivo.
     * Fallback visual (placeholder) se a imagem não existir ou falhar.
     */
    setEnemyImage(src) {
        const img = document.getElementById('enemy-img');
        if (!img) return;
        const resolved = resolveImagePath(src);
        img.src = resolved;
        img.alt = src ? String(src) : '';
        const useFallback = () => {
            img.src = IMG_FALLBACK;
            img.alt = 'Imagem não encontrada';
        };
        img.onerror = useFallback;
        img.onload = () => {
            if (img.naturalWidth === 0) useFallback();
        };
    }

    /**
     * Define imagem do player. Usa /imagens/ + nome do arquivo.
     * Fallback visual (placeholder) se a imagem não existir ou falhar.
     */
    setPlayerImage(src) {
        const img = document.getElementById('player-img');
        if (!img) return;
        const resolved = resolveImagePath(src);
        img.src = resolved;
        img.alt = src ? String(src) : '';
        const useFallback = () => {
            img.src = IMG_FALLBACK;
            img.alt = 'Imagem não encontrada';
        };
        img.onerror = useFallback;
        img.onload = () => {
            if (img.naturalWidth === 0) useFallback();
        };
    }

    setPlayerName(name) {
        document.getElementById('p-display-name').textContent = name;
    }

    openOverlay() {
        document.getElementById('overlay').style.display = 'block';
    }

    closeOverlay() {
        document.getElementById('overlay').style.display = 'none';
    }

    closeAllModals() {
        document.getElementById('overlay').style.display = 'none';
        ['shop-modal', 'skill-modal', 'skill-detail-modal', 'death-modal', 'settings-modal', 'loot-modal', 'save-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    openSettingsModal(game) {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('settings-modal').style.display = 'block';
        if (game) this.syncSettingsFromGame(game);
    }

    /** Sincroniza mute no modal de configurações (dificuldade só ao iniciar novo jogo). */
    syncSettingsFromGame(game) {
        const muteCheck = document.getElementById('settings-mute');
        if (muteCheck) muteCheck.checked = this.isMuted();
    }

    closeSettingsModal() {
        document.getElementById('overlay').style.display = 'none';
        const el = document.getElementById('settings-modal');
        if (el) el.style.display = 'none';
    }

    /** Exibe feedback rápido de "Salvo!" no log. */
    showSaveFeedback() {
        // Evitar múltiplas chamadas simultâneas
        if (this._saveFeedbackActive) return;
        this._saveFeedbackActive = true;
        
        this.showSaveModal();
        this.playSound('heal');
        
        // Resetar flag após o modal fechar
        setTimeout(() => {
            this._saveFeedbackActive = false;
        }, 2500);
    }

    /** Exibe modal de confirmação de save */
    showSaveModal() {
        const modal = document.getElementById('save-modal');
        if (!modal || modal.style.display === 'block') return;
        
        // Limpar animações anteriores
        modal.classList.remove('save-modal-animate');
        
        modal.style.display = 'block';
        this.openOverlay();
        
        // Adiciona animação de entrada
        requestAnimationFrame(() => {
            modal.classList.add('save-modal-animate');
        });
        
        // Auto-remove após 2 segundos
        setTimeout(() => {
            modal.classList.remove('save-modal-animate');
            setTimeout(() => {
                this.closeOverlay();
                modal.style.display = 'none';
            }, 300);
        }, 2000);
    }

    openShopModal() {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('shop-modal').style.display = 'block';
    }

    openSkillModal() {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('skill-modal').style.display = 'block';
    }

    openSkillDetailModal(contentHtml, learnDisabled, onLearnClick) {
        document.getElementById('skill-detail-content').innerHTML = contentHtml;
        const btn = document.getElementById('learn-confirm-btn');
        btn.disabled = learnDisabled;
        btn.onclick = onLearnClick;
        document.getElementById('skill-detail-modal').style.display = 'block';
    }

    closeSkillDetailModal() {
        document.getElementById('skill-detail-modal').style.display = 'none';
    }

    openDeathModal() {
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('death-modal').style.display = 'block';
        
        // Limpar estatísticas (não mostrar mais)
        const statsContent = document.getElementById('death-stats');
        if (statsContent) {
            statsContent.innerHTML = '';
        }
    }

    showTransitionScreen() {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('death-modal').style.display = 'none';
        document.getElementById('transition-screen').style.display = 'flex';
        
        // Atualizar gold do player
        this.updateTransitionGold();
        
        // Atualizar estado dos cards de itens
        this.updateShopItemCards();
        
        // Mostrar detalhes do primeiro item por padrão
        this.showItemDetail('potion_hp');
        
        // Garantir que o botão tenha o evento bindado
        setTimeout(() => {
            const transitionBtn = document.querySelector('[data-action="continue-transition"]');
            if (transitionBtn) {
                transitionBtn.onclick = () => {
                    if (window.game) {
                        window.game.continueFromTransition();
                    }
                };
            }
            
            // Adicionar eventos aos cards de itens
            const itemCards = document.querySelectorAll('.shop-item-card');
            itemCards.forEach(card => {
                card.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.game && window.game.ui) {
                        window.game.ui.showItemDetail(card.getAttribute('data-item'));
                    }
                };
            });
            
            // Adicionar evento ao botão de compra do painel de detalhes
            const detailBuyBtn = document.getElementById('detail-buy-btn');
            if (detailBuyBtn) {
                detailBuyBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.game) {
                        window.game.buyFromTransitionShopDetail();
                    }
                };
            }
        }, 100);
    }

    updateShopItemCards() {
        if (!window.game || !window.game.player) return;
        
        const gold = window.game.player.gold;
        const prices = {
            // Itens existentes
            potion_hp: 28,
            mana_potion: 32,
            boots: 58,
            shield: 78,
            coin: 125,
            
            // Novos itens ATIVOS
            sword_fire: 95,
            bow_ice: 88,
            hammer_thunder: 102,
            dagger_poison: 76,
            scroll_light: 85,
            
            // Novos itens PASSIVOS
            ring_life: 68,
            amulet_mana: 72,
            cloak_shadows: 110,
            gloves_strength: 64,
            boots_swift: 82
        };
        
        const itemCards = document.querySelectorAll('.shop-item-card');
        
        itemCards.forEach((card, index) => {
            const itemType = card.getAttribute('data-item');
            const price = prices[itemType];
            
            if (gold < price) {
                card.style.opacity = '0.5';
                card.style.cursor = 'not-allowed';
                card.style.border = '2px solid #666';
            } else {
                card.style.opacity = '1';
                card.style.cursor = 'pointer';
                card.style.border = '2px solid rgba(255, 255, 255, 0.1)';
            }
        });
    }

    updateTransitionGold() {
        if (!window.game || !window.game.player) return;
        
        const goldDisplay = document.getElementById('transition-player-gold');
        if (goldDisplay) {
            const gold = window.game.player.gold;
            goldDisplay.textContent = gold.toLocaleString('pt-BR');
        }
        
        // Atualizar também todos os botões de compra
        const itemData = {
            // Itens existentes
            potion_hp: 28,
            mana_potion: 32,
            boots: 58,
            shield: 78,
            coin: 125,
            
            // Novos itens ATIVOS
            sword_fire: 95,
            bow_ice: 88,
            hammer_thunder: 102,
            dagger_poison: 76,
            scroll_light: 85,
            
            // Novos itens PASSIVOS
            ring_life: 68,
            amulet_mana: 72,
            cloak_shadows: 110,
            gloves_strength: 64,
            boots_swift: 82
        };
        
        const gold = window.game.player.gold;
        const buyBtn = document.getElementById('detail-buy-btn');
        
        if (buyBtn) {
            const item = buyBtn.getAttribute('data-item');
            const price = itemData[item];
            
            if (gold < price) {
                buyBtn.disabled = true;
                buyBtn.innerHTML = '<i class="fa-solid fa-times"></i> SEM GOLD';
                buyBtn.style.background = '#666';
            } else {
                buyBtn.disabled = false;
                buyBtn.innerHTML = '<i class="fa-solid fa-shopping-cart"></i> COMPRAR';
                buyBtn.style.background = 'var(--primary)';
            }
        }
    }

    showItemDetail(itemType) {
        const itemData = {
            // Itens existentes
            potion_hp: {
                icon: 'fa-solid fa-flask',
                name: 'Poção HP',
                description: '+18 HP instantâneo. Recupera vida imediatamente em combate.',
                price: 28
            },
            mana_potion: {
                icon: 'fa-solid fa-flask-vial',
                name: 'Poção MP',
                description: '+22 MANA instantâneo. Recupera mana imediatamente em combate.',
                price: 32
            },
            boots: {
                icon: 'fa-solid fa-boot',
                name: 'Botas Mágicas',
                description: '+SPD (Ativo). Aumenta permanentemente a velocidade do personagem.',
                price: 58
            },
            shield: {
                icon: 'fa-solid fa-shield-halved',
                name: 'Escudo Resistente',
                description: '-Dano recebido (Ativo). Reduz permanentemente o dano sofrido.',
                price: 78
            },
            coin: {
                icon: 'fa-solid fa-coins',
                name: 'Moeda da Sorte',
                description: '+Sorte (Ativo). Aumenta permanentemente a sorte em encontros e drops.',
                price: 125
            },
            
            // Novos itens ATIVOS
            sword_fire: {
                icon: 'fa-solid fa-fire',
                name: 'Espada de Fogo',
                description: '+Dano e efeito de queima. Causa dano adicional fogo por 4 turnos.',
                price: 95
            },
            bow_ice: {
                icon: 'fa-solid fa-snowflake',
                name: 'Arco de Gelo',
                description: 'Congela e causa lentidão. Impede o ataque inimigo por 1 turno.',
                price: 88
            },
            hammer_thunder: {
                icon: 'fa-solid fa-bolt',
                name: 'Martelo Trovão',
                description: 'Atordoa inimigos e +dano. Chance de atordoar por 1 turno.',
                price: 102
            },
            dagger_poison: {
                icon: 'fa-solid fa-skull',
                name: 'Adaga Venenosa',
                description: 'Causa veneno e +crítico. Dano contínuo por 2 turnos.',
                price: 76
            },
            scroll_light: {
                icon: 'fa-solid fa-sun',
                name: 'Pergaminho Luz',
                description: 'Dano sagrado e cura. Causa dano extra em inimigos das trevas.',
                price: 85
            },
            
            // Novos itens PASSIVOS
            ring_life: {
                icon: 'fa-solid fa-ring',
                name: 'Anel da Vida',
                description: 'Regeneração de HP e +HP máximo. Recupera 2 HP por turno.',
                price: 68
            },
            amulet_mana: {
                icon: 'fa-solid fa-circle-notch',
                name: 'Amuleto Mana',
                description: 'Regeneração de MP e +MP máximo. Recupera 1 MP por turno.',
                price: 72
            },
            cloak_shadows: {
                icon: 'fa-solid fa-user-ninja',
                name: 'Capa Sombras',
                description: 'Esquiva e crítico. +20% esquiva e +10% chance crítica.',
                price: 110
            },
            gloves_strength: {
                icon: 'fa-solid fa-hand-rock',
                name: 'Luvas Força',
                description: '+Força e bônus de dano. Aumenta o dano físico permanentemente.',
                price: 64
            },
            boots_swift: {
                icon: 'fa-solid fa-wind',
                name: 'Botas Velozes',
                description: '+Velocidade e ataque primeiro. Sempre ataca primeiro no combate.',
                price: 82
            }
        };
        
        const item = itemData[itemType];
        if (!item) return;
        
        // Atualizar painel de detalhes
        document.getElementById('detail-icon').innerHTML = `<i class="${item.icon}"></i>`;
        document.getElementById('detail-name').textContent = item.name;
        document.getElementById('detail-description').textContent = item.description;
        document.getElementById('detail-price').textContent = `Preço: ${item.price} G`;
        document.getElementById('detail-buy-btn').setAttribute('data-item', itemType);
        
        // Mostrar painel de detalhes
        document.getElementById('item-detail-panel').style.display = 'block';
        
        // Atualizar estado do botão de compra (usando método unificado)
        this.updateTransitionGold();
    }

    hideTransitionScreen() {
        document.getElementById('transition-screen').style.display = 'none';
    }

    /** Renderiza árvore de skills (nós clicáveis). */
    renderSkillTree(skillList, player, onSkillNodeClick) {
        const container = document.getElementById('skill-tree-content');
        container.innerHTML = '';
        skillList.forEach(s => {
            const playerSkill = player.skills.find(ps => ps.id === s.id);
            const lv = playerSkill ? playerSkill.level : 0;
            const node = document.createElement('div');
            node.className = `skill-node ${lv > 0 ? 'learned' : ''}`;
            node.innerHTML = `
                <i class="fa-solid ${s.icon}" style="color: ${lv > 0 ? s.color : '#555'}"></i>
                <div class="skill-name">${s.name}</div>
                ${lv > 0 ? `<span class="badge" style="background:var(--mana)">LV ${lv}</span>` : '<span class="badge">BLOQUEADO</span>'}
            `;
            node.onclick = () => onSkillNodeClick(s);
            container.appendChild(node);
        });
    }

    /** Conteúdo HTML do modal de detalhe da skill. reqLv vindo do Game (5, 10, 15…). */
    getSkillDetailContent(skill, player, reqLv) {
        return `
            <i class="fa-solid ${skill.icon} detail-icon" style="color: ${skill.color}"></i>
            <h2 style="color:${skill.color}; margin: 0;">${skill.name.toUpperCase()}</h2>
            <p style="font-size: 14px; opacity: 0.9;">${skill.desc}</p>
            <div class="stat-badge">REQUER PLAYER LV: ${reqLv}</div>
        `;
    }

    showContinueButton(show) {
        const btn = document.getElementById('continue-btn');
        if (btn) btn.style.display = show ? 'flex' : 'none';
    }

    /** Mostra tela de loading */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /** Esconde tela de loading */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /** Atualiza a visualização dos slots de save */
    updateSaveSlots() {
        console.log('Atualizando slots de save...');
        const manualSaves = JSON.parse(localStorage.getItem('rpg_manual_saves') || '{}');
        console.log('Saves manuais encontrados:', manualSaves);
        
        for (let i = 0; i < 3; i++) {
            const slot = document.querySelector(`[data-slot="${i}"]`);
            const content = slot.querySelector('.save-slot-content');
            const saveData = manualSaves[i];
            
            console.log(`Slot ${i}:`, saveData);
            
            if (saveData) {
                // Slot com save
                content.classList.remove('empty');
                content.classList.add('filled');
                
                const date = new Date(saveData.timestamp);
                const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                content.innerHTML = `
                    <div class="save-slot-info">
                        <div class="save-slot-player">${saveData.playerName}</div>
                        <div class="save-slot-details">
                            Nível ${saveData.playerLevel} | ${saveData.gold} 🪙
                        </div>
                        <div class="save-slot-date">${dateStr}</div>
                    </div>
                `;
            } else {
                // Slot vazio
                content.classList.add('empty');
                content.classList.remove('filled');
                content.innerHTML = `
                    <i class="fa-solid fa-plus"></i>
                    <span>Vazio</span>
                `;
            }
        }
    }

    /** Adiciona classe de erro em um botão (ex.: loja). */
    blinkButtonError(btnElement) {
        if (!btnElement) return;
        btnElement.classList.add('error-blink');
        setTimeout(() => btnElement.classList.remove('error-blink'), 400);
    }
}
