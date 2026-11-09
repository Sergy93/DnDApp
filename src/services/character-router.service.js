import { slugifyCharacterName } from './character-storage.service.js';

/**
 * Pure URL Router Service for Multi-View Navigation using Hash Routing.
 * Supported views:
 * - `/#/login`: Landing & Google Authentication page.
 * - `/#/create`: Dedicated full-screen character creation wizard page.
 * - `/#/c/{slug}`: Main character sheet view.
 */
export class CharacterRouterService {
    /**
     * Parses a hash URL string into its view and parameter structure.
     * 
     * @param {string} [hashStr=window.location.hash]
     * @returns {{ view: 'login'|'create'|'sheet'|'root', slug: string|null }}
     */
    static parseRoute(hashStr = (typeof window !== 'undefined' && window.location ? window.location.hash : '')) {
        if (!hashStr || typeof hashStr !== 'string') {
            return { view: 'root', slug: null };
        }

        const clean = hashStr.replace(/^#\/?/, '').trim();
        if (!clean) {
            return { view: 'root', slug: null };
        }

        const parts = clean.split('/').filter(Boolean);
        if (parts.length === 0) {
            return { view: 'root', slug: null };
        }

        const first = parts[0].toLowerCase();
        if (first === 'login') {
            return { view: 'login', slug: null };
        }
        if (first === 'create') {
            return { view: 'create', slug: null };
        }
        if (first === 'c' || first === 'character') {
            const slug = parts[1] ? slugifyCharacterName(decodeURIComponent(parts[1])) : null;
            return { view: 'sheet', slug };
        }

        // Direct single segment hash: e.g. `#/dorian`
        return {
            view: 'sheet',
            slug: slugifyCharacterName(decodeURIComponent(first))
        };
    }

    /**
     * Extracts the character slug from a URL hash string.
     * Returns null if route is root, login, or create.
     * 
     * @param {string} [hashStr=window.location.hash]
     * @returns {string|null} Canonical slug or null.
     */
    static getSlugFromHash(hashStr = (typeof window !== 'undefined' && window.location ? window.location.hash : '')) {
        const route = this.parseRoute(hashStr);
        return route.view === 'sheet' ? route.slug : null;
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
     * Navigates to a specific hash.
     * @param {string} targetHash - Hash string.
     * @param {boolean} [replace=false]
     */
    static navigateToHash(targetHash, replace = false) {
        if (typeof window === 'undefined' || !window.location) return;
        if (window.location.hash === targetHash) return;

        if (replace && window.history && window.history.replaceState) {
            window.history.replaceState(null, '', targetHash);
        } else {
            window.location.hash = targetHash;
        }
    }

    /**
     * Navigates to a character slug.
     * @param {string} slug - Character slug.
     * @param {boolean} [replace=false]
     */
    static navigateToSlug(slug, replace = false) {
        this.navigateToHash(this.formatHash(slug), replace);
    }

    /**
     * Navigates to the Login page.
     * @param {boolean} [replace=false]
     */
    static navigateToLogin(replace = false) {
        this.navigateToHash('#/login', replace);
    }

    /**
     * Navigates to the Character Creation page.
     * @param {boolean} [replace=false]
     */
    static navigateToCreate(replace = false) {
        this.navigateToHash('#/create', replace);
    }

    /**
     * Listens for browser hash changes (back/forward navigation).
     * @param {Function} callback - Callback receiving (slug, route).
     * @returns {Function} Unsubscribe function.
     */
    static onRouteChanged(callback) {
        if (typeof window === 'undefined' || typeof callback !== 'function') {
            return () => {};
        }

        const handler = () => {
            const route = this.parseRoute();
            callback(route.slug, route);
        };

        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }
}
