/**
 * Sistema de Árvore de Skills - Path of Exile Style
 * Sistema de nós conectados com dependências e progressão
 */

class SkillTreeManager {
    constructor() {
        this.skills = new Map();
        this.connections = new Map();
        this.playerSkills = new Set();
        this.skillPoints = 0;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.init();
    }

    init() {
        this.createSkillTree();
        this.setupCanvas();
        this.setupEventListeners();
        this.render();
    }

    createSkillTree() {
        // Estrutura da árvore de skills inspirada em POE
        const skillData = [
            // Nó central inicial
            { id: 'start', name: 'Iniciante', x: 400, y: 300, tier: 0, class: 'start', icon: 'fa-user', description: 'Começo da jornada' },
            
            // Ramo de Força (vermelho)
            { id: 'strength_1', name: 'Força Bruta', x: 300, y: 250, tier: 1, class: 'strength', icon: 'fa-hand-fist', description: '+5 Força', requires: ['start'], effect: { str: 5 } },
            { id: 'strength_2', name: 'Poder Físico', x: 200, y: 200, tier: 2, class: 'strength', icon: 'fa-dumbbell', description: '+10 Força', requires: ['strength_1'], effect: { str: 10 } },
            { id: 'strength_3', name: 'Gigante', x: 100, y: 150, tier: 3, class: 'strength', icon: 'fa-mountain', description: '+20 Força, +50 HP', requires: ['strength_2'], effect: { str: 20, maxHp: 50 } },
            
            // Ramo de Inteligência (azul)
            { id: 'intelligence_1', name: 'Sabedoria', x: 500, y: 250, tier: 1, class: 'intelligence', icon: 'fa-brain', description: '+5 Inteligência', requires: ['start'], effect: { int: 5 } },
            { id: 'intelligence_2', name: 'Arcano', x: 600, y: 200, tier: 2, class: 'intelligence', icon: 'fa-hat-wizard', description: '+10 Inteligência', requires: ['intelligence_1'], effect: { int: 10 } },
            { id: 'intelligence_3', name: 'Mestre Arcano', x: 700, y: 150, tier: 3, class: 'intelligence', icon: 'fa-sparkles', description: '+20 Inteligência, +50 MP', requires: ['intelligence_2'], effect: { int: 20, maxMana: 50 } },
            
            // Ramo de Destreza (verde)
            { id: 'dexterity_1', name: 'Agilidade', x: 400, y: 200, tier: 1, class: 'dexterity', icon: 'fa-bolt', description: '+5 Destreza', requires: ['start'], effect: { spd: 5 } },
            { id: 'dexterity_2', name: 'Velocidade', x: 400, y: 100, tier: 2, class: 'dexterity', icon: 'fa-wind', description: '+10 Destreza', requires: ['dexterity_1'], effect: { spd: 10 } },
            { id: 'dexterity_3', name: 'Assassino', x: 400, y: 0, tier: 3, class: 'dexterity', icon: 'fa-user-ninja', description: '+20 Destreza, +10% Crítico', requires: ['dexterity_2'], effect: { spd: 20, critChance: 10 } },
            
            // Ramo de Vitalidade (laranja)
            { id: 'vitality_1', name: 'Resistência', x: 300, y: 350, tier: 1, class: 'vitality', icon: 'fa-shield', description: '+10 HP', requires: ['start'], effect: { maxHp: 10 } },
            { id: 'vitality_2', name: 'Fortitude', x: 200, y: 400, tier: 2, class: 'vitality', icon: 'fa-heart', description: '+25 HP', requires: ['vitality_1'], effect: { maxHp: 25 } },
            { id: 'vitality_3', name: 'Imortal', x: 100, y: 450, tier: 3, class: 'vitality', icon: 'fa-infinity', description: '+50 HP, +5 Regeneração', requires: ['vitality_2'], effect: { maxHp: 50, hpRegen: 5 } },
            
            // Ramo de Sorte (amarelo)
            { id: 'luck_1', name: 'Sorte Inicial', x: 500, y: 350, tier: 1, class: 'luck', icon: 'fa-clover', description: '+3 Sorte', requires: ['start'], effect: { luk: 3 } },
            { id: 'luck_2', name: 'Afortunado', x: 600, y: 400, tier: 2, class: 'luck', icon: 'fa-dice', description: '+7 Sorte', requires: ['luck_1'], effect: { luk: 7 } },
            { id: 'luck_3', name: 'Mestre da Sorte', x: 700, y: 450, tier: 3, class: 'luck', icon: 'fa-trophy', description: '+15 Sorte, +20% Drops', requires: ['luck_2'], effect: { luk: 15, dropRate: 20 } },
            
            // Habilidades de Combate
            { id: 'dual_wield', name: 'Duplo Empunho', x: 250, y: 300, tier: 2, class: 'combat', icon: 'fa-swords', description: '+15% Dano com duas armas', requires: ['strength_1', 'dexterity_1'], effect: { dualWieldDamage: 15 } },
            { id: 'spell_mastery', name: 'Maestria Mágica', x: 550, y: 300, tier: 2, class: 'combat', icon: 'fa-book-spells', description: '+20% Dano mágico', requires: ['intelligence_1'], effect: { spellDamage: 20 } },
            { id: 'critical_strike', name: 'Golpe Crítico', x: 450, y: 350, tier: 2, class: 'combat', icon: 'fa-explosion', description: '+15% Chance de crítico', requires: ['dexterity_1'], effect: { critChance: 15 } },
            
            // Habilidades Defensivas
            { id: 'armor_mastery', name: 'Maestria de Armadura', x: 350, y: 400, tier: 2, class: 'defense', icon: 'fa-shield-alt', description: '+30% Armadura', requires: ['vitality_1'], effect: { armor: 30 } },
            { id: 'evasion', name: 'Evasão', x: 450, y: 400, tier: 2, class: 'defense', icon: 'fa-ghost', description: '+25% Evasão', requires: ['dexterity_1', 'vitality_1'], effect: { evasion: 25 } },
            
            // Habilidades Avançadas
            { id: 'berserker', name: 'Berserker', x: 150, y: 300, tier: 3, class: 'ultimate', icon: 'fa-fire', description: '+50% Dano, -20% Defesa', requires: ['strength_2'], effect: { damage: 50, defense: -20 } },
            { id: 'archmage', name: 'Arquimago', x: 650, y: 300, tier: 3, class: 'ultimate', icon: 'fa-hat-wizard', description: '+50% Dano mágico, +100 MP', requires: ['intelligence_2'], effect: { spellDamage: 50, maxMana: 100 } },
            { id: 'shadow_master', name: 'Mestre das Sombras', x: 400, y: 50, tier: 3, class: 'ultimate', icon: 'fa-user-secret', description: '+40% Crítico, +30% Evasão', requires: ['dexterity_2'], effect: { critChance: 40, evasion: 30 } }
        ];

        // Criar skills
        skillData.forEach(skill => {
            this.skills.set(skill.id, {
                ...skill,
                unlocked: skill.id === 'start', // Nó inicial já desbloqueado
                connections: [],
                level: 0
            });
        });

        // Criar conexões
        skillData.forEach(skill => {
            if (skill.requires) {
                skill.requires.forEach(reqId => {
                    const reqSkill = this.skills.get(reqId);
                    if (reqSkill) {
                        reqSkill.connections.push(skill.id);
                    }
                });
            }
        });

        // Marcar skill inicial como adquirida
        this.playerSkills.add('start');
    }

    setupCanvas() {
        this.container = document.getElementById('skill-tree-content');
        if (!this.container) {
            console.error('Container da skill tree não encontrado');
            return;
        }

        // Criar canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'grab';
        
        this.ctx = this.canvas.getContext('2d');
        
        // Limpar container e adicionar canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);
        
        // Adicionar controles
        this.addControls();
    }

    addControls() {
        const controls = document.createElement('div');
        controls.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 8px;
            color: white;
            font-size: 12px;
            z-index: 1000;
        `;
        
        controls.innerHTML = `
            <div>Pontos: <span id="skill-points-display">0</span></div>
            <div>Zoom: <button onclick="skillTree.zoomIn()">+</button> <button onclick="skillTree.zoomOut()">-</button></div>
            <div><button onclick="skillTree.resetView()">Resetar Visão</button></div>
            <div><button onclick="skillTree.resetSkills()">Resetar Skills</button></div>
        `;
        
        this.container.appendChild(controls);
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // Touch events para mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.render();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= delta;
        this.zoom = Math.max(0.5, Math.min(2, this.zoom));
        this.render();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        
        // Verificar se clicou em algum skill
        this.skills.forEach(skill => {
            const distance = Math.sqrt(Math.pow(x - skill.x, 2) + Math.pow(y - skill.y, 2));
            if (distance < 20) {
                this.toggleSkill(skill.id);
            }
        });
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.isDragging = true;
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.lastMouseX;
            const deltaY = touch.clientY - this.lastMouseY;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            
            this.render();
        }
    }

    handleTouchEnd(e) {
        this.isDragging = false;
    }

    toggleSkill(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill || skill.id === 'start') return;

        if (this.playerSkills.has(skillId)) {
            // Remover skill
            this.removeSkill(skillId);
        } else {
            // Adicionar skill
            this.addSkill(skillId);
        }
    }

    addSkill(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill) return;

        // Verificar se tem pontos suficientes
        if (this.skillPoints <= 0) {
            this.showMessage('Pontos de skill insuficientes!');
            return;
        }

        // Verificar dependências
        if (!this.canUnlockSkill(skillId)) {
            this.showMessage('Você precisa desbloquear as skills anteriores primeiro!');
            return;
        }

        // Adicionar skill
        this.playerSkills.add(skillId);
        this.skillPoints--;
        skill.unlocked = true;
        skill.level = 1;

        // Aplicar efeitos
        this.applySkillEffects(skill);

        // Atualizar display
        this.updateSkillPointsDisplay();
        this.render();

        this.showMessage(`Skill "${skill.name}" desbloqueado!`);
    }

    removeSkill(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill) return;

        // Verificar se outras skills dependem desta
        const dependentSkills = this.getDependentSkills(skillId);
        if (dependentSkills.length > 0) {
            this.showMessage('Não pode remover skill com dependências!');
            return;
        }

        // Remover skill
        this.playerSkills.delete(skillId);
        this.skillPoints++;
        skill.unlocked = false;
        skill.level = 0;

        // Remover efeitos
        this.removeSkillEffects(skill);

        // Atualizar display
        this.updateSkillPointsDisplay();
        this.render();

        this.showMessage(`Skill "${skill.name}" removida!`);
    }

    canUnlockSkill(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill || !skill.requires) return true;

        return skill.requires.every(reqId => this.playerSkills.has(reqId));
    }

    getDependentSkills(skillId) {
        const dependents = [];
        this.skills.forEach(skill => {
            if (skill.requires && skill.requires.includes(skillId) && this.playerSkills.has(skill.id)) {
                dependents.push(skill.id);
            }
        });
        return dependents;
    }

    applySkillEffects(skill) {
        if (!skill.effect || !window.game) return;

        const player = window.game.player;
        Object.entries(skill.effect).forEach(([stat, value]) => {
            switch (stat) {
                case 'str':
                case 'int':
                case 'spd':
                case 'luk':
                case 'vit':
                    player[stat] = (player[stat] || 0) + value;
                    break;
                case 'maxHp':
                    player.maxHp += value;
                    player.hp = Math.min(player.hp + value, player.maxHp);
                    break;
                case 'maxMana':
                    player.maxMana += value;
                    player.mana = Math.min(player.mana + value, player.maxMana);
                    break;
                case 'hpRegen':
                case 'critChance':
                case 'dropRate':
                    // Stats especiais
                    player[stat] = (player[stat] || 0) + value;
                    break;
            }
        });

        // Atualizar UI
        if (window.game && window.game.ui) {
            window.game.ui.updateUI();
        }
    }

    removeSkillEffects(skill) {
        if (!skill.effect || !window.game) return;

        const player = window.game.player;
        Object.entries(skill.effect).forEach(([stat, value]) => {
            switch (stat) {
                case 'str':
                case 'int':
                case 'spd':
                case 'luk':
                case 'vit':
                    player[stat] = Math.max(0, (player[stat] || 0) - value);
                    break;
                case 'maxHp':
                    player.maxHp = Math.max(1, player.maxHp - value);
                    player.hp = Math.min(player.hp, player.maxHp);
                    break;
                case 'maxMana':
                    player.maxMana = Math.max(0, player.maxMana - value);
                    player.mana = Math.min(player.mana, player.maxMana);
                    break;
                case 'hpRegen':
                case 'critChance':
                case 'dropRate':
                    player[stat] = Math.max(0, (player[stat] || 0) - value);
                    break;
            }
        });

        // Atualizar UI
        if (window.game && window.game.ui) {
            window.game.ui.updateUI();
        }
    }

    render() {
        if (!this.ctx || !this.canvas) return;

        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Salvar estado
        this.ctx.save();

        // Aplicar transformações
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // Desenhar conexões
        this.drawConnections();

        // Desenhar skills
        this.drawSkills();

        // Restaurar estado
        this.ctx.restore();
    }

    drawConnections() {
        this.skills.forEach(skill => {
            if (skill.connections) {
                skill.connections.forEach(targetId => {
                    const targetSkill = this.skills.get(targetId);
                    if (targetSkill) {
                        this.drawConnection(skill, targetSkill);
                    }
                });
            }
        });
    }

    drawConnection(from, to) {
        const isPathActive = this.playerSkills.has(from.id) && this.playerSkills.has(to.id);
        
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        
        if (isPathActive) {
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 3;
        } else if (this.playerSkills.has(from.id)) {
            this.ctx.strokeStyle = '#FFC107';
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 1;
        }
        
        this.ctx.stroke();
    }

    drawSkills() {
        this.skills.forEach(skill => {
            this.drawSkill(skill);
        });
    }

    drawSkill(skill) {
        const isUnlocked = this.playerSkills.has(skill.id);
        const canUnlock = this.canUnlockSkill(skill.id);
        
        // Cor baseada na classe
        const colors = {
            start: '#4CAF50',
            strength: '#F44336',
            intelligence: '#2196F3',
            dexterity: '#4CAF50',
            vitality: '#FF9800',
            luck: '#FFD700',
            combat: '#9C27B0',
            defense: '#795548',
            ultimate: '#E91E63'
        };
        
        const color = colors[skill.class] || '#666';
        
        // Desenhar círculo do skill
        this.ctx.beginPath();
        this.ctx.arc(skill.x, skill.y, 20, 0, Math.PI * 2);
        
        if (isUnlocked) {
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 3;
        } else if (canUnlock) {
            this.ctx.fillStyle = '#333';
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.fillStyle = '#222';
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 1;
        }
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Desenhar ícone (simplificado - texto)
        this.ctx.fillStyle = isUnlocked ? '#FFF' : '#999';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Usar primeira letra do nome como ícone
        const icon = skill.name.charAt(0);
        this.ctx.fillText(icon, skill.x, skill.y);
        
        // Desenhar nome se estiver desbloqueado
        if (isUnlocked) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(skill.name, skill.x, skill.y + 35);
        }
    }

    showMessage(message) {
        // Criar toast message
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }

    updateSkillPointsDisplay() {
        const display = document.getElementById('skill-points-display');
        if (display) {
            display.textContent = this.skillPoints;
        }
    }

    setSkillPoints(points) {
        this.skillPoints = points;
        this.updateSkillPointsDisplay();
    }

    zoomIn() {
        this.zoom = Math.min(2, this.zoom * 1.2);
        this.render();
    }

    zoomOut() {
        this.zoom = Math.max(0.5, this.zoom / 1.2);
        this.render();
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    resetSkills() {
        if (confirm('Tem certeza que deseja resetar todas as skills?')) {
            // Remover todos os skills exceto o inicial
            this.playerSkills.clear();
            this.playerSkills.add('start');
            
            // Resetar estados
            this.skills.forEach(skill => {
                if (skill.id !== 'start') {
                    skill.unlocked = false;
                    skill.level = 0;
                }
            });
            
            // Calcular pontos totais
            const totalSkills = this.skills.size - 1; // -1 pelo start
            this.skillPoints = totalSkills;
            
            this.updateSkillPointsDisplay();
            this.render();
            
            this.showMessage('Skills resetadas!');
        }
    }

    saveSkillTree() {
        const saveData = {
            playerSkills: Array.from(this.playerSkills),
            skillPoints: this.skillPoints
        };
        localStorage.setItem('skillTreeSave', JSON.stringify(saveData));
    }

    loadSkillTree() {
        const saveData = localStorage.getItem('skillTreeSave');
        if (saveData) {
            const data = JSON.parse(saveData);
            this.playerSkills = new Set(data.playerSkills);
            this.skillPoints = data.skillPoints;
            
            // Atualizar estados dos skills
            this.skills.forEach(skill => {
                skill.unlocked = this.playerSkills.has(skill.id);
                skill.level = this.playerSkills.has(skill.id) ? 1 : 0;
            });
            
            this.updateSkillPointsDisplay();
            this.render();
        }
    }
}

// Adicionar CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(style);

// Instância global
window.skillTree = new SkillTreeManager();
