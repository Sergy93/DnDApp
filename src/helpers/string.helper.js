/**
 * String manipulation and key normalization utilities.
 * Canonical Single Source of Truth for text normalization and URL slug generation.
 */

export function normalizeKey(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export function slugify(str) {
    if (!str) return 'character';
    const s = String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s || 'character';
}

export function capitalizeWord(str) {
    if (!str) return '';
    const s = String(str).trim();
    if (!s) return '';
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

