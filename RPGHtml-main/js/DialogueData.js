/**
 * DialogueData.js - Textos de eventos e NPCs (Amigável, Rude, Neutro, Ignorar).
 * Centralizado para edição no Admin. Persistência via localStorage.
 */

const STORAGE_KEY = 'rpg_admin_dialogue';

export const DEFAULT_DIALOGUE = {
    chest: {
        intro: 'Um baú empoeirado repousa à margem do caminho. Parece trancado; não há alma viva por perto.',
        noKey: 'Você não tem uma CHAVE no inventário!',
        mimic: 'AO ABRIR, O BAÚ SE TRANSFORMOU EM UM MÍMICO!',
        success: 'A chave serviu! O baú continha {{gold}} moedas!',
        keyUse: 'Isso é uma chave. Procure algo para abrir!'
    },
    healer: {
        introFullHp: 'Uma mulher com roupas simples e um cinto de ervas se aproxima. Curandeira: "Boa tarde, viajante. Estou a caminho de um castelo — ouvi falar dele há alguns dias, numa rua de comércio. Dizem que há relíquias por lá. Você parece bem... Conhece esse castelo?"',
        introInjured: 'Uma mulher com roupas simples e um cinto de ervas se aproxima. Curandeira: "Boa tarde, viajante. Estou a caminho de um castelo — ouvi falar dele há alguns dias, numa rua de comércio. Dizem que há relíquias por lá. Você, por acaso, conhece esse castelo? E... esses ferimentos... a estrada não perdoa."',
        amigavel: {
            player: 'Você: "Também estou em busca de aventuras. Ouvi rumores sobre o castelo — quem sabe nos encontramos por lá!"',
            npcFullHp: 'Curandeira: "Que alma gentil! Você parece bem, então. Que os caminhos te protejam. Até mais!"',
            npcInjured: 'Curandeira: "Que alma gentil! Vejo que está machucado. Deixe-me cuidar disso — não quero nada em troca. Que os caminhos te protejam!"'
        },
        rude: {
            player: 'Você: "Não estou interessado nas suas histórias. Afaste-se."',
            npc: 'Curandeira: "Entendido. Desejo-lhe sorte na estrada. Que as feridas... não pesem." Ela segue viagem, triste.'
        },
        neutro: {
            player: 'Você: "Não conheço o castelo. Boa sorte na sua jornada."',
            npcOffer: 'Curandeira: "Obrigada. Aliás, posso cuidar desses ferimentos por 5 moedas, se quiser."',
            npcFullHp: 'Curandeira: "Obrigada. Cuide-se!" Ela acena e segue.',
            npcAccept: 'Curandeira: "Aqui estamos. Que os caminhos te protejam!" Ela cura suas feridas.',
            npcDecline: 'Curandeira: "Sem problemas. Boa viagem!"'
        },
        ignorar: {
            player: 'Você não responde e segue o caminho.',
            npc: 'Curandeira: "Bem... que a estrada seja gentil." Ela segue em outra direção.'
        }
    },
    merchant: {
        intro: 'Um homem robusto puxa uma carroça cheia de frascos e tecidos. Mercador: "Olá! Vindo da feira — a estrada é longa. Você que vem na direção contrária: viu bandidos ou algo suspeito? Prefiro saber antes de seguir."',
        amigavel: {
            player: 'Você: "A estrada parece tranquila até aqui. Boa sorte! Se precisar de algo, estou por perto."',
            npc: 'Mercador: "Obrigado, amigo! Que tal dar uma olhada na carroça? Para você, tudo pela metade. E leva uma poção de cortesia."'
        },
        rude: {
            player: 'Você: "Não sou seu guia. Se vira."',
            npc: 'Mercador: "Não era pra tanto. Siga em frente, então." Ele segue com a carroça.'
        },
        neutro: {
            player: 'Você: "Não vi nada. Cuidado."',
            npc: 'Mercador: "Valeu. Quer dar uma olhada nas minhas coisas? Metade do preço."'
        },
        ignorar: {
            player: 'Você ignora o mercador e segue.',
            npc: 'Mercador: "Tranquilo. Boa viagem."'
        }
    },
    thief: {
        intro: 'Uma figura encapuzada bloqueia o caminho. Ladrão: "Oi, viajante. Aqui a passagem tem taxa. Moedas ou sangue — ou os dois. O que você escolhe?"',
        amigavel: {
            player: 'Você: "Não quero briga. Fica com isso e vamos cada um pro seu lado."',
            npcGold: 'Você entrega {{offer}} moedas. Ladrão: "Justo. Até a próxima." Ele some nas sombras.',
            npcNoGold: 'Ladrão: "Nada? Que azar." Ele some nas sombras.'
        },
        rude: {
            player: 'Você: "Sai da frente ou te parto ao meio."',
            npc: 'Ladrão: "Era isso que eu queria ouvir." A luta começa!'
        },
        neutro: {
            player: 'Você: "Pega o que quiser e deixa eu ir."'
        },
        ignorar: {
            player: 'Você tenta passar sem responder.',
            npc: 'Ladrão: "Não respondendo? Tudo bem, eu escolho."'
        },
        robberyGold: 'O ladrão levou {{loss}} moedas e sumiu na penumbra!',
        robberyItem: 'O ladrão agarrou sua {{itemName}} e fugiu!',
        robberyNone: 'Ladrão: "Nada? Que azar." Ele some.',
        leave: 'Você deixa o ladrão ir. Melhor não arriscar.',
        contest: 'Você persegue o ladrão! A luta começa.'
    },
    archer: {
        intro: 'Uma arqueira está à beira do caminho, inspecionando a corda do arco. Arqueira: "Ei, você. Também vai pra frente? Ando há dias — dá pra sentir quando a estrada vai esquentar. Quer um conselho de quem já viu muita coisa?"',
        tips: [
            'Dica: Vitalidade aumenta sua vida máxima consideravelmente.',
            'Dica: A inteligência faz você recuperar mais mana ao descansar.',
            'Dica: O Golpe Supremo carrega 20% cada vez que você apanha.',
            'Dica: Baús agora exigem uma CHAVE para abrir.',
            'Dica: Monstros podem deixar cair chaves ao serem derrotados!'
        ],
        amigavel: {
            player: 'Você: "Sempre aceito conselhos de quem conhece a estrada."',
            npcSuffix: 'Ela sorri. "Cuide-se. A estrada é dura."'
        },
        neutro: {
            player: 'Você: "Pode falar. Estou ouvindo."'
        },
        rude: {
            player: 'Você: "Não preciso de conselhos de estranhos."',
            npc: 'Arqueira: "Como quiser. Boa sorte." Ela segue em frente.'
        },
        ignorar: {
            player: 'Você ignora a arqueira e segue.',
            npc: 'Arqueira: "Tudo bem. Siga em frente."'
        }
    }
};

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
    for (const k of Object.keys(source)) {
        if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k] && typeof target[k] === 'object')
            deepMerge(target[k], source[k]);
        else
            target[k] = source[k];
    }
}

let _data = deepCopy(DEFAULT_DIALOGUE);

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            _data = deepCopy(DEFAULT_DIALOGUE);
            deepMerge(_data, saved);
        }
    } catch (_) {}
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (_) {}
}

/** Retorna cópia do DialogueData atual. */
export function getDialogue() {
    return deepCopy(_data);
}

/** Obtém texto por path. Ex: get('healer.introFullHp'), get('healer.amigavel.player'). */
export function get(path) {
    const parts = path.split('.');
    let o = _data;
    for (const p of parts) {
        if (o == null || typeof o !== 'object') return '';
        o = o[p];
    }
    return typeof o === 'string' ? o : (Array.isArray(o) ? o : '');
}

/** Substitui {{var}} em str por values. Ex: apply('O baú tem {{gold}} moedas!', { gold: 50 }) */
export function apply(str, values = {}) {
    let s = String(str);
    for (const [k, v] of Object.entries(values)) {
        s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
    return s;
}

/** Atualiza um valor por path. Persiste. */
export function set(path, value) {
    const parts = path.split('.');
    let o = _data;
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (!(k in o)) o[k] = {};
        o = o[k];
    }
    o[parts[parts.length - 1]] = value;
    save();
}

/** Restaura defaults e limpa persistência. */
export function resetDialogue() {
    _data = deepCopy(DEFAULT_DIALOGUE);
    localStorage.removeItem(STORAGE_KEY);
}

load();
