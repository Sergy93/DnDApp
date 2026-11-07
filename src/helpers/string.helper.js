/**
 * String manipulation and key normalization utilities.
 */

export function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

export function capitalizeWord(str) {
    if (!str) return '';
    const s = String(str).trim();
    if (!s) return '';
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
