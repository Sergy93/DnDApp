import { slugifyCharacterName } from './character-storage.service.js';

/**
 * Pure URL Router Service for Character navigation using Hash Routing.
 * Hash routing allows seamless offline PWA routing, static host compatibility (Cloudflare Pages),
 * and prevents 404 errors on browser page reloads without requiring server rewrite configuration.
 * 
 * URL pattern: `/#/c/<slug>` or `/#/character/<slug>`
 */
export class CharacterRouterService {
    /**
     * Extracts the character slug from a URL hash string.
     * Examples:
     * - `#/c/dorian` -> 'dorian'
     * - `#/character/dorian-gray` -> 'dorian-gray'
     * - `#/dorian` -> 'dorian'
     * - `` or `#/` -> null
     * 
     * @param {string} [hashStr=window.location.hash]
     * @returns {string|null} Canonical slug or null if no character in route.
     */
    static getSlugFromHash(hashStr = (typeof window !== 'undefined' && window.location ? window.location.hash : '')) {
        if (!hashStr || typeof hashStr !== 'string') return null;

        const clean = hashStr.replace(/^#\/?/, '').trim();
        if (!clean) return null;

        const parts = clean.split('/').filter(Boolean);
        if (parts.length === 0) return null;

        // Support `c/<slug>`, `character/<slug>`, or direct `<slug>`
        if (parts[0] === 'c' || parts[0] === 'character') {
            return parts[1] ? slugifyCharacterName(decodeURIComponent(parts[1])) : null;
        }

        // Direct single segment hash: e.g. `#/dorian`
        if (parts.length === 1 && parts[0] !== 'c' && parts[0] !== 'character') {
            return slugifyCharacterName(decodeURIComponent(parts[0]));
        }

        return null;
    }

    /**
     * Builds a hash URL for a character slug.
     * @param {string} slug - Character slug.
     * @returns {string} Formatted hash (e.g. `#/c/dorian`).
     */
    static formatHash(slug) {
        const cleanSlug = slugifyCharacterName(slug);
        return `#/c/${cleanSlug}`;
    }

    /**
     * Navigates to a character slug by updating window.location.hash.
     * @param {string} slug - Character slug.
     * @param {boolean} [replace=false] - If true, replaces current history state.
     */
    static navigateToSlug(slug, replace = false) {
        if (typeof window === 'undefined' || !window.location) return;
        const targetHash = this.formatHash(slug);

        if (window.location.hash === targetHash) return;

        if (replace && window.history && window.history.replaceState) {
            window.history.replaceState(null, '', targetHash);
        } else {
            window.location.hash = targetHash;
        }
    }

    /**
     * Listens for browser hash changes (back/forward navigation).
     * @param {Function} callback - Callback receiving the new slug.
     * @returns {Function} Unsubscribe function.
     */
    static onRouteChanged(callback) {
        if (typeof window === 'undefined' || typeof callback !== 'function') {
            return () => {};
        }

        const handler = () => {
            const slug = this.getSlugFromHash();
            callback(slug);
        };

        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }
}
