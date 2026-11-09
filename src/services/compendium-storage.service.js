/**
 * CompendiumStorageService - Offline-First IndexedDB Compendium Catalog.
 * 
 * Provides client-side local caching and instant indexing for D&D 5e:
 * - Spells (with filtering by level, class, school, search query)
 * - Classes & Subclasses
 * - Races & Subraces
 * - Backgrounds
 * 
 * Works 100% offline with zero network latency (0ms).
 * Includes an in-memory fallback store for Node.js unit testing.
 */

import { ErrorHandler } from './error-handler.service.js';
import {
    CANONICAL_CREATION_CLASSES,
    CANONICAL_CREATION_RACES,
    CANONICAL_CREATION_BACKGROUNDS
} from '../domain/constants/creation-rules.constants.js';

const DB_NAME = 'DorianDndCompendiumDB';
const DB_VERSION = 1;

export const COMPENDIUM_STORES = Object.freeze({
    SPELLS: 'spells',
    CLASSES: 'classes',
    RACES: 'races',
    BACKGROUNDS: 'backgrounds',
    METADATA: 'metadata'
});

export class CompendiumStorageService {
    static _db = null;
    static _memoryFallback = {
        spells: new Map(),
        classes: new Map(),
        races: new Map(),
        backgrounds: new Map(),
        metadata: new Map()
    };
    static _cache = {
        classes: {},
        races: {},
        backgrounds: {},
        spells: []
    };
    static isLoaded = false;

    static getClasses() {
        if (this._cache.classes && Object.keys(this._cache.classes).length > 0) {
            return this._cache.classes;
        }
        return CANONICAL_CREATION_CLASSES;
    }

    static getRaces() {
        if (this._cache.races && Object.keys(this._cache.races).length > 0) {
            return this._cache.races;
        }
        return CANONICAL_CREATION_RACES;
    }

    static getBackgrounds() {
        if (this._cache.backgrounds && Object.keys(this._cache.backgrounds).length > 0) {
            return this._cache.backgrounds;
        }
        return CANONICAL_CREATION_BACKGROUNDS;
    }

    static getSpells() {
        return this._cache.spells || [];
    }

    /**
     * Checks if browser IndexedDB is supported.
     * @returns {boolean}
     */
    static isSupported() {
        return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
    }

    /**
     * Opens or initializes the IndexedDB database.
     * @returns {Promise<IDBDatabase|null>}
     */
    static async open() {
        if (this._db) return this._db;
        if (!this.isSupported()) {
            return null; // Uses in-memory fallback
        }

        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains(COMPENDIUM_STORES.SPELLS)) {
                    const spellStore = db.createObjectStore(COMPENDIUM_STORES.SPELLS, { keyPath: 'id' });
                    spellStore.createIndex('name', 'name', { unique: false });
                    spellStore.createIndex('level', 'level', { unique: false });
                    spellStore.createIndex('school', 'school', { unique: false });
                }

                if (!db.objectStoreNames.contains(COMPENDIUM_STORES.CLASSES)) {
                    const classStore = db.createObjectStore(COMPENDIUM_STORES.CLASSES, { keyPath: 'id' });
                    classStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains(COMPENDIUM_STORES.RACES)) {
                    const raceStore = db.createObjectStore(COMPENDIUM_STORES.RACES, { keyPath: 'id' });
                    raceStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains(COMPENDIUM_STORES.BACKGROUNDS)) {
                    const bgStore = db.createObjectStore(COMPENDIUM_STORES.BACKGROUNDS, { keyPath: 'id' });
                    bgStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains(COMPENDIUM_STORES.METADATA)) {
                    db.createObjectStore(COMPENDIUM_STORES.METADATA, { keyPath: 'key' });
                }
            };

            req.onsuccess = () => {
                this._db = req.result;
                resolve(this._db);
            };

            req.onerror = () => {
                console.warn('[CompendiumStorage] IndexedDB open error, falling back to in-memory store:', req.error);
                resolve(null);
            };
        });
    }

    /**
     * Checks if the IndexedDB database has already been populated with compendium data.
     * @returns {Promise<boolean>}
     */
    static async isPopulated() {
        const db = await this.open();
        if (!db) {
            return this._memoryFallback.classes.size > 0;
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([COMPENDIUM_STORES.CLASSES], 'readonly');
                const store = tx.objectStore(COMPENDIUM_STORES.CLASSES);
                const countReq = store.count();
                countReq.onsuccess = () => resolve(countReq.result > 0);
                countReq.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }

    /**
     * Saves a list of items into an object store in a single transaction.
     * @param {string} storeName - Store name (spells, classes, races, backgrounds).
     * @param {Array<Object>} items - Array of items to store.
     * @returns {Promise<number>} Number of saved items.
     */
    static async saveItems(storeName, items = []) {
        if (!Array.isArray(items) || items.length === 0) return 0;

        const db = await this.open();
        if (!db) {
            const memStore = this._memoryFallback[storeName];
            if (memStore) {
                items.forEach(item => {
                    const key = item.id || item.key || item.name;
                    memStore.set(key, item);
                });
            }
            return items.length;
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);

            items.forEach(item => {
                const copy = { ...item };
                if (!copy.id) {
                    copy.id = copy.key || String(copy.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
                }
                store.put(copy);
            });

            tx.oncomplete = () => resolve(items.length);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    /**
     * Retrieves all items from a given object store.
     * @param {string} storeName
     * @returns {Promise<Array<Object>>}
     */
    static async getAll(storeName) {
        const db = await this.open();
        if (!db) {
            const memStore = this._memoryFallback[storeName];
            return memStore ? Array.from(memStore.values()) : [];
        }

        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Retrieves a single item by key from an object store.
     * @param {string} storeName
     * @param {string} key
     * @returns {Promise<Object|null>}
     */
    static async get(storeName, key) {
        const db = await this.open();
        if (!db) {
            const memStore = this._memoryFallback[storeName];
            return memStore ? memStore.get(key) || null : null;
        }

        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Sets a metadata key-value pair.
     * @param {string} key
     * @param {*} value
     * @returns {Promise<void>}
     */
    static async setMetadata(key, value) {
        const db = await this.open();
        if (!db) {
            this._memoryFallback.metadata.set(key, value);
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction([COMPENDIUM_STORES.METADATA], 'readwrite');
                const store = tx.objectStore(COMPENDIUM_STORES.METADATA);
                store.put({ key, value, updatedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Gets a metadata value by key.
     * @param {string} key
     * @returns {Promise<*>}
     */
    static async getMetadata(key) {
        const db = await this.open();
        if (!db) {
            const entry = this._memoryFallback.metadata.get(key);
            return entry !== undefined ? entry : null;
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction([COMPENDIUM_STORES.METADATA], 'readonly');
                const store = tx.objectStore(COMPENDIUM_STORES.METADATA);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ? req.result.value : null);
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    }

    /**
     * Populates all compendium tables in IndexedDB from an all-in-one dictionary payload.
     * @param {Object} payload - { classes, races, backgrounds, spells, version }
     * @returns {Promise<Object>} Summary counts of populated items.
     */
    static async seedPayload(payload = {}) {
        const summary = { classes: 0, races: 0, backgrounds: 0, spells: 0 };

        const classesList = Array.isArray(payload.classes)
            ? payload.classes
            : (payload.classes ? Object.entries(payload.classes).map(([k, v]) => ({ id: k, ...v })) : []);
        summary.classes = await this.saveItems(COMPENDIUM_STORES.CLASSES, classesList);

        const racesList = Array.isArray(payload.races)
            ? payload.races
            : (payload.races ? Object.entries(payload.races).map(([k, v]) => ({ id: k, ...v })) : []);
        summary.races = await this.saveItems(COMPENDIUM_STORES.RACES, racesList);

        const bgList = Array.isArray(payload.backgrounds)
            ? payload.backgrounds
            : (payload.backgrounds ? Object.entries(payload.backgrounds).map(([k, v]) => ({ id: k, ...v })) : []);
        summary.backgrounds = await this.saveItems(COMPENDIUM_STORES.BACKGROUNDS, bgList);

        const spellsList = Array.isArray(payload.spells)
            ? payload.spells
            : (payload.spells?.spell ? payload.spells.spell : []);
        summary.spells = await this.saveItems(COMPENDIUM_STORES.SPELLS, spellsList);

        this._cache.classes = Array.isArray(payload.classes)
            ? Object.fromEntries(payload.classes.map(c => [c.id || c.name?.toLowerCase() || '', c]))
            : (payload.classes || {});
        this._cache.races = Array.isArray(payload.races)
            ? Object.fromEntries(payload.races.map(r => [r.id || r.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '', r]))
            : (payload.races || {});
        this._cache.backgrounds = Array.isArray(payload.backgrounds)
            ? Object.fromEntries(payload.backgrounds.map(b => [b.id || b.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '', b]))
            : (payload.backgrounds || {});
        this._cache.spells = spellsList;
        this.isLoaded = true;

        await this.setMetadata('version', payload.version || 1);
        await this.setMetadata('seededAt', Date.now());

        return summary;
    }

    /**
     * Searches stored spells by query, level, and class filters.
     * @param {Object} [filter={}] - { search, level, school, class }
     * @returns {Promise<Array<Object>>}
     */
    static async searchSpells(filter = {}) {
        const allSpells = await this.getAll(COMPENDIUM_STORES.SPELLS);
        const search = String(filter.search || '').trim().toLowerCase();
        const level = filter.level !== undefined && filter.level !== null && filter.level !== ''
            ? parseInt(filter.level, 10)
            : null;
        const school = String(filter.school || '').trim().toLowerCase();
        const className = String(filter.class || '').trim().toLowerCase();

        return allSpells.filter(sp => {
            if (level !== null && sp.level !== level) return false;
            if (school && String(sp.school || '').toLowerCase() !== school) return false;

            if (className) {
                const classes = Array.isArray(sp.classes) ? sp.classes : (sp.classes?.fromClassList || []);
                const hasClass = classes.some(c => {
                    const cName = typeof c === 'string' ? c : (c.name || '');
                    return cName.toLowerCase() === className;
                });
                if (!hasClass) return false;
            }

            if (search) {
                const name = String(sp.name || '').toLowerCase();
                const desc = String(sp.desc || '').toLowerCase();
                return name.includes(search) || desc.includes(search);
            }

            return true;
        });
    }

    /**
     * Fetches compendium payload from remote API if available and saves to IndexedDB.
     * @param {string} [baseUrl='']
     * @returns {Promise<boolean>} True if remote sync succeeded.
     */
    static async syncFromRemote(baseUrl = '') {
        if (typeof fetch === 'undefined') return false;
        if (typeof window === 'undefined' && (!baseUrl || baseUrl.startsWith('/'))) {
            return false;
        }
        try {
            const url = `${baseUrl}/api/compendium/all`.replace(/([^:]\/)\/+/g, '$1');
            const res = await fetch(url);
            if (!res.ok) {
                ErrorHandler.warn(`Compendium sync returned status ${res.status}`, 'CompendiumStorageService.syncFromRemote');
                return false;
            }
            const data = await res.json();
            if (data && data.success && data.compendium) {
                await this.seedPayload(data.compendium);
                await this.setMetadata('lastSyncedAt', Date.now());
                return true;
            }
            return false;
        } catch (err) {
            ErrorHandler.warn(err, 'CompendiumStorageService.syncFromRemote');
            return false;
        }
    }

    /**
     * Initializes compendiums by ensuring IndexedDB is populated from D1/remote and populating in-memory _cache.
     * @param {string} [baseUrl='']
     * @returns {Promise<Object>} { classes, races, backgrounds, spells }
     */
    static async initCompendiums(baseUrl = '') {
        try {
            const populated = await this.isPopulated();
            if (!populated) {
                await this.syncFromRemote(baseUrl);
            }

            const [classesList, racesList, bgList, spellsList] = await Promise.all([
                this.getAll(COMPENDIUM_STORES.CLASSES),
                this.getAll(COMPENDIUM_STORES.RACES),
                this.getAll(COMPENDIUM_STORES.BACKGROUNDS),
                this.getAll(COMPENDIUM_STORES.SPELLS)
            ]);

            if (classesList.length > 0) {
                this._cache.classes = Object.fromEntries(
                    classesList.map(c => [c.id || (c.name ? c.name.toLowerCase() : ''), c])
                );
            }
            if (racesList.length > 0) {
                this._cache.races = Object.fromEntries(
                    racesList.map(r => [r.id || (r.name ? r.name.toLowerCase().replace(/[^a-z0-9]/g, '') : ''), r])
                );
            }
            if (bgList.length > 0) {
                this._cache.backgrounds = Object.fromEntries(
                    bgList.map(b => [b.id || (b.name ? b.name.toLowerCase().replace(/[^a-z0-9]/g, '') : ''), b])
                );
            }
            if (spellsList.length > 0) {
                this._cache.spells = spellsList;
            }
            this.isLoaded = true;

            return this._cache;
        } catch (err) {
            ErrorHandler.handle(err, 'CompendiumStorageService.initCompendiums');
            return this._cache;
        }
    }
}
