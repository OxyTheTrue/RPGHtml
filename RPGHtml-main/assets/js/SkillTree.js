// Sistema de Árvore de Habilidades
export class SkillTree {
    constructor() {
        this.skills = {
            // Força
            strength_starter: {
                name: 'Iniciante em Força',
                cost: 1,
                effects: { dmgBonus: 2 },
                requires: [],
                branch: 'strength'
            },
            strength_might: {
                name: 'Poderio',
                cost: 1,
                effects: { dmgBonus: 3, maxHpBonus: 5 },
                requires: ['strength_starter'],
                branch: 'strength'
            },
            strength_berserker: {
                name: 'Berserker',
                cost: 2,
                effects: { dmgBonus: 4, critBonus: 0.10 },
                requires: ['strength_might'],
                branch: 'strength'
            },
            strength_titan: {
                name: 'Titã',
                cost: 3,
                effects: { dmgBonus: 6, maxHpBonus: 20, critBonus: 0.15 },
                requires: ['strength_berserker'],
                branch: 'strength'
            },
            
            // Vitalidade
            vitality_starter: {
                name: 'Iniciante em Vitalidade',
                cost: 1,
                effects: { maxHpBonus: 10 },
                requires: [],
                branch: 'vitality'
            },
            vitality_endurance: {
                name: 'Resistência',
                cost: 1,
                effects: { maxHpBonus: 15, hpRegen: 1 },
                requires: ['vitality_starter'],
                branch: 'vitality'
            },
            vitality_toughness: {
                name: 'Tenacidade',
                cost: 2,
                effects: { maxHpBonus: 20, damageReduction: 0.10 },
                requires: ['vitality_endurance'],
                branch: 'vitality'
            },
            vitality_immortal: {
                name: 'Imortal',
                cost: 3,
                effects: { maxHpBonus: 30, hpRegen: 3, damageReduction: 0.20 },
                requires: ['vitality_toughness'],
                branch: 'vitality'
            },
            
            // Inteligência
            intelligence_starter: {
                name: 'Iniciante em Inteligência',
                cost: 1,
                effects: { maxManaBonus: 5 },
                requires: [],
                branch: 'intelligence'
            },
            intelligence_wisdom: {
                name: 'Sabedoria',
                cost: 1,
                effects: { maxManaBonus: 8, manaRegen: 1 },
                requires: ['intelligence_starter'],
                branch: 'intelligence'
            },
            intelligence_arcane: {
                name: 'Arcano',
                cost: 2,
                effects: { maxManaBonus: 12, magicDmgBonus: 2 },
                requires: ['intelligence_wisdom'],
                branch: 'intelligence'
            },
            intelligence_archmage: {
                name: 'Arquimago',
                cost: 3,
                effects: { maxManaBonus: 20, magicDmgBonus: 4, manaRegen: 2 },
                requires: ['intelligence_arcane'],
                branch: 'intelligence'
            }
        };
    }
    
    // Verifica se um nó está disponível para desbloquear
    isSkillAvailable(skillId, unlockedSkills) {
        const skill = this.skills[skillId];
        if (!skill) return false;
        
        // Se já está desbloqueado, não está disponível
        if (unlockedSkills.includes(skillId)) return false;
        
        // Verifica se todos os requisitos foram atendidos
        return skill.requires.every(req => unlockedSkills.includes(req));
    }
    
    // Verifica se um nó está bloqueado (requisitos não atendidos)
    isSkillLocked(skillId, unlockedSkills) {
        const skill = this.skills[skillId];
        if (!skill) return true;
        
        // Se já está desbloqueado, não está bloqueado
        if (unlockedSkills.includes(skillId)) return false;
        
        // Se está disponível, não está bloqueado
        if (this.isSkillAvailable(skillId, unlockedSkills)) return false;
        
        return true;
    }
    
    // Calcula o custo total de uma habilidade
    getSkillCost(skillId) {
        const skill = this.skills[skillId];
        return skill ? skill.cost : 0;
    }
    
    // Aplica os efeitos de uma habilidade ao jogador
    applySkillEffects(skillId, player) {
        const skill = this.skills[skillId];
        if (!skill) return;
        
        const effects = skill.effects;
        
        // Aplica bônus de dano
        if (effects.dmgBonus) {
            player.dmgBonus = (player.dmgBonus || 0) + effects.dmgBonus;
        }
        
        // Aplica bônus de HP máximo
        if (effects.maxHpBonus) {
            player.maxHpBonus = (player.maxHpBonus || 0) + effects.maxHpBonus;
            player.maxHp = player.baseMaxHp + player.maxHpBonus;
            player.hp = Math.min(player.hp + effects.maxHpBonus, player.maxHp);
        }
        
        // Aplica regeneração de HP
        if (effects.hpRegen) {
            player.hpRegen = (player.hpRegen || 0) + effects.hpRegen;
        }
        
        // Aplica redução de dano
        if (effects.damageReduction) {
            player.damageReduction = (player.damageReduction || 0) + effects.damageReduction;
        }
        
        // Aplica bônus de mana máximo
        if (effects.maxManaBonus) {
            player.maxManaBonus = (player.maxManaBonus || 0) + effects.maxManaBonus;
            player.maxMana = player.baseMaxMana + player.maxManaBonus;
            player.mana = Math.min(player.mana + effects.maxManaBonus, player.maxMana);
        }
        
        // Aplica regeneração de mana
        if (effects.manaRegen) {
            player.manaRegen = (player.manaRegen || 0) + effects.manaRegen;
        }
        
        // Aplica bônus de dano mágico
        if (effects.magicDmgBonus) {
            player.magicDmgBonus = (player.magicDmgBonus || 0) + effects.magicDmgBonus;
        }
        
        // Aplica bônus crítico
        if (effects.critBonus) {
            player.critBonus = (player.critBonus || 0) + effects.critBonus;
        }
    }
    
    // Remove os efeitos de uma habilidade do jogador (para reset)
    removeSkillEffects(skillId, player) {
        const skill = this.skills[skillId];
        if (!skill) return;
        
        const effects = skill.effects;
        
        // Remove bônus de dano
        if (effects.dmgBonus) {
            player.dmgBonus = Math.max(0, (player.dmgBonus || 0) - effects.dmgBonus);
        }
        
        // Remove bônus de HP máximo
        if (effects.maxHpBonus) {
            player.maxHpBonus = Math.max(0, (player.maxHpBonus || 0) - effects.maxHpBonus);
            player.maxHp = player.baseMaxHp + player.maxHpBonus;
            player.hp = Math.min(player.hp, player.maxHp);
        }
        
        // Remove regeneração de HP
        if (effects.hpRegen) {
            player.hpRegen = Math.max(0, (player.hpRegen || 0) - effects.hpRegen);
        }
        
        // Remove redução de dano
        if (effects.damageReduction) {
            player.damageReduction = Math.max(0, (player.damageReduction || 0) - effects.damageReduction);
        }
        
        // Remove bônus de mana máximo
        if (effects.maxManaBonus) {
            player.maxManaBonus = Math.max(0, (player.maxManaBonus || 0) - effects.maxManaBonus);
            player.maxMana = player.baseMaxMana + player.maxManaBonus;
            player.mana = Math.min(player.mana, player.maxMana);
        }
        
        // Remove regeneração de mana
        if (effects.manaRegen) {
            player.manaRegen = Math.max(0, (player.manaRegen || 0) - effects.manaRegen);
        }
        
        // Remove bônus de dano mágico
        if (effects.magicDmgBonus) {
            player.magicDmgBonus = Math.max(0, (player.magicDmgBonus || 0) - effects.magicDmgBonus);
        }
        
        // Remove bônus crítico
        if (effects.critBonus) {
            player.critBonus = Math.max(0, (player.critBonus || 0) - effects.critBonus);
        }
    }
    
    // Obtém todas as habilidades de uma ramificação
    getBranchSkills(branch) {
        return Object.entries(this.skills)
            .filter(([id, skill]) => skill.branch === branch)
            .map(([id, skill]) => ({ id, ...skill }));
    }
    
    // Calcula o total de pontos gastos
    getTotalSpentPoints(unlockedSkills) {
        return unlockedSkills.reduce((total, skillId) => {
            return total + this.getSkillCost(skillId);
        }, 0);
    }
}
