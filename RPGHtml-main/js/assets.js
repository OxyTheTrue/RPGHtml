/**
 * assets.js - Caminhos de imagens e fallback
 * Centraliza base path /imagens/ e placeholder para erros de carregamento.
 */

/** Base path para sprites (relativo à raiz do projeto). */
export const IMG_BASE = 'imagens/';

/** SVG placeholder em data-URI quando imagem não existe ou falha ao carregar. */
export const IMG_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
    '<rect fill="#1a1a2e" width="120" height="120"/>' +
    '<text x="50%" y="50%" fill="#666" font-size="48" text-anchor="middle" dy=".3em" font-family="sans-serif">?</text>' +
    '</svg>'
);

/**
 * Retorna URL final da imagem: usa caminho absoluto (http/https) como está,
 * caso contrário prepõe IMG_BASE.
 * @param {string} src - Nome do arquivo (ex: 'goblin.png') ou URL absoluta
 * @returns {string}
 */
export function resolveImagePath(src) {
    if (!src || typeof src !== 'string') return IMG_FALLBACK;
    if (/^https?:\/\//i.test(src)) return src;
    const base = IMG_BASE.endsWith('/') ? IMG_BASE : IMG_BASE + '/';
    return base + src.replace(/^\//, '');
}
