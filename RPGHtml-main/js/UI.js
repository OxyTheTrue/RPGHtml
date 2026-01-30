/**
 * UI.js - Manipulação do DOM
 * Barras de vida, log, botões, tooltips e modais.
 */

import { BASE_PRICES } from './Shop.js';
import { resolveImagePath, IMG_FALLBACK } from './assets.js';

/** Cores do log por tipo de mensagem (dano, cura, loot, etc.). */
const LOG_COLORS = {
    damage: '#ff4757',
    heal: '#2ed573',
    loot: '#ffa502',
    info: '#54a0ff',
    win: '#2ecc71',
    spawn: '#f1c40f',
    default: '#00ff9d'
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

    /** Mostra etapa do menu: 'buttons' | 'name' | 'difficulty'. */
    showMenuStep(step) {
        ['buttons', 'name', 'difficulty'].forEach(s => {
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

        document.getElementById('p-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
        document.getElementById('p-mana-bar').style.width = (player.mana / player.maxMana * 100) + '%';
        document.getElementById('p-furia-bar').style.width = player.furia + '%';
        document.getElementById('p-xp-bar').style.width = (player.xp / player.nextXp * 100) + '%';

        if (enemy) {
            const bar = document.getElementById('enemy-bar');
            if (typeof enemy.hp === 'number' && typeof enemy.maxHp === 'number') {
                bar.style.width = (enemy.hp / enemy.maxHp * 100) + '%';
            }
            document.getElementById('enemy-name').textContent = enemy.name;
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

        document.querySelectorAll('.item-price').forEach((span, i) => {
            span.textContent = Math.floor(BASE_PRICES[i] * merchantDiscount);
        });

        document.querySelectorAll('.lvl-up-btn').forEach(btn => {
            btn.style.display = player.pendingPoints > 0 ? 'block' : 'none';
        });

        const slots = document.querySelectorAll('.slot');
        slots.forEach((s, i) => {
            s.innerHTML = player.inventory[i]
                ? `<i class="fa-solid ${player.inventory[i].icon}" style="color: #ffa502"></i>`
                : '';
        });

        const ult = document.getElementById('ult-btn');
        if (ult) ult.style.display = player.furia >= 100 ? 'flex' : 'none';

        const valAtk = document.getElementById('val-atk');
        if (valAtk) {
            const { min, max } = player.getPhysicalDamageRange ? player.getPhysicalDamageRange() : { min: 0, max: 0 };
            valAtk.textContent = `${min}-${max} Dano`;
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
            img.onerror = null;
            img.src = IMG_FALLBACK;
            img.alt = '?';
        };
        img.onerror = useFallback;
    }

    setPlayerName(name) {
        document.getElementById('p-display-name').textContent = name;
    }

    openOverlay() {
        document.getElementById('overlay').style.display = 'block';
    }

    closeAllModals() {
        document.getElementById('overlay').style.display = 'none';
        ['shop-modal', 'skill-modal', 'skill-detail-modal', 'death-modal', 'settings-modal'].forEach(id => {
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
        const log = document.getElementById('game-log');
        if (!log) return;
        const line = document.createElement('div');
        line.className = 'log-line';
        line.style.color = LOG_COLORS.heal;
        line.textContent = '> Progresso salvo!';
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
        setTimeout(() => line.remove(), 2000);
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

    /** Adiciona classe de erro em um botão (ex.: loja). */
    blinkButtonError(btnElement) {
        if (!btnElement) return;
        btnElement.classList.add('error-blink');
        setTimeout(() => btnElement.classList.remove('error-blink'), 400);
    }
}
