/**
 * Safe localStorage persistence service.
 */
export class StorageService {
    /**
     * Loads JSON data from localStorage, falling back to a default value if missing or invalid.
     * @param {string} key
     * @param {*} fallback
     * @returns {*}
     */
    static load(key, fallback = null) {
        let raw = null;
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
                raw = localStorage.getItem(key);
            }
        } catch (e) {
            console.warn("[Storage] Could not read localStorage:", e);
        }
        if (!raw) return fallback;

        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("[Storage] Error parsing stored data:", e);
            return fallback;
        }
    }

    /**
     * Serializes and writes data to localStorage.
     * @param {string} key
     * @param {*} data
     */
    static save(key, data) {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (e) {
            console.error("[Storage] Error saving state:", e);
        }
    }

    /**
     * Removes an item from localStorage.
     * @param {string} key
     */
    static remove(key) {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn("[Storage] Error removing item from localStorage:", e);
        }
    }
}
