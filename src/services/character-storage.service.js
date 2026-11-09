import { normalizeKey } from '../helpers/string.helper.js';
import { STORAGE_KEYS } from '../domain/constants/storage.constants.js';

export const REGISTRY_STORAGE_KEY = STORAGE_KEYS.REGISTRY;
export const ACTIVE_CHAR_STORAGE_KEY = STORAGE_KEYS.ACTIVE_CHARACTER_ID;
export const CHAR_DATA_PREFIX = STORAGE_KEYS.CHAR_DATA_PREFIX;
export const LEGACY_STORAGE_KEY = STORAGE_KEYS.LEGACY_CHARACTER;

/**
 * Pure helper to convert a character name into a URL-friendly canonical slug.
 * Removes accents/diacritics, spaces, and punctuation.
 * e.g., "Dorian Gray" -> "dorian-gray", "Drizzt Do'Urden" -> "drizzt-dourden"
 * 
 * @param {string} name - Raw character name.
 * @returns {string} URL slug.
 */
export function slugifyCharacterName(name = '') {
    const clean = String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Strip diacritics / accents
        .replace(/[^a-z0-9]+/g, '-')    // Convert non-alphanumeric chars to hyphens
        .replace(/^-+|-+$/g, '');       // Trim leading and trailing hyphens
    return clean || 'character';
}

/**
 * Multi-character storage and registry service.
 * Manages an index of character summaries in localStorage alongside individual character documents.
 */
export class CharacterStorageService {
    /**
     * Retrieves the character registry index.
     * @param {Storage} [storage=window.localStorage] - Storage implementation.
     * @returns {Array<Object>} List of character registry summaries.
     */
    static getRegistry(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return [];
        try {
            const raw = storage.getItem(REGISTRY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Saves the character registry index.
     * @param {Array<Object>} registry - Registry array.
     * @param {Storage} [storage=window.localStorage]
     */
    static saveRegistry(registry, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;
        try {
            storage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
        } catch (e) {
            console.error('Failed to save character registry index', e);
        }
    }

    /**
     * Gets the active character ID.
     * @param {Storage} [storage=window.localStorage]
     * @returns {string|null}
     */
    static getActiveCharacterId(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return null;
        return storage.getItem(ACTIVE_CHAR_STORAGE_KEY) || null;
    }

    /**
     * Sets the active character ID.
     * @param {string} id
     * @param {Storage} [storage=window.localStorage]
     */
    static setActiveCharacterId(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !id) return;
        storage.setItem(ACTIVE_CHAR_STORAGE_KEY, id);
    }

    /**
     * Generates a unique ID for a character.
     * @returns {string} Unique character identifier.
     */
    static generateUniqueId() {
        return 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    /**
     * Generates a unique slug within the current registry.
     * If "dorian" already exists for a different character, appends a short suffix (e.g. "dorian-2").
     * 
     * @param {string} name - Character name.
     * @param {string} [characterId=null] - Current character ID (to allow keeping existing slug).
     * @param {Storage} [storage=window.localStorage]
     * @returns {string} Unique slug.
     */
    static generateUniqueSlug(name, characterId = null, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        const baseSlug = slugifyCharacterName(name);
        const registry = this.getRegistry(storage);

        let candidate = baseSlug;
        let counter = 1;

        while (registry.some(entry => entry.slug === candidate && entry.id !== characterId)) {
            counter++;
            candidate = `${baseSlug}-${counter}`;
        }

        return candidate;
    }

    /**
     * Loads full character data by character ID.
     * @param {string} id - Character unique ID.
     * @param {Storage} [storage=window.localStorage]
     * @returns {Object|null}
     */
    static getCharacterById(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !id) return null;
        try {
            const raw = storage.getItem(CHAR_DATA_PREFIX + id);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Loads the active character document.
     * @param {Storage} [storage=window.localStorage]
     * @returns {Object|null}
     */
    static getActiveCharacter(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        const id = this.getActiveCharacterId(storage);
        return id ? this.getCharacterById(id, storage) : null;
    }

    /**
     * Loads full character data by character slug.
     * @param {string} slug - Character URL slug.
     * @param {Storage} [storage=window.localStorage]
     * @returns {Object|null}
     */
    static getCharacterBySlug(slug, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !slug) return null;
        const normSlug = slugifyCharacterName(slug);
        const registry = this.getRegistry(storage);
        const entry = registry.find(r => r.slug === normSlug);
        if (!entry) return null;
        return this.getCharacterById(entry.id, storage);
    }

    /**
     * Saves a full character document, ensuring unique ID and slug, and updates the registry index.
     * 
     * @param {Object} characterData - Character sheet document.
     * @param {Object} [options={}] - Options { makeActive: boolean }.
     * @param {Storage} [storage=window.localStorage]
     * @returns {{ id: string, slug: string, characterData: Object }} Saved character metadata.
     */
    static saveCharacter(characterData, options = { makeActive: true }, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !characterData) {
            return { id: null, slug: null, characterData };
        }

        // Ensure persistent ID
        const id = characterData.id || this.generateUniqueId();
        characterData.id = id;

        const charName = characterData.identity?.name || 'Character';
        const slug = this.generateUniqueSlug(charName, id, storage);
        characterData.slug = slug;

        const classes = characterData.identity?.classes || [];
        const totalLevel = classes.reduce((sum, c) => sum + (c.level || 0), 0) || 1;
        const classesSummary = classes.map(c => `${c.name || 'Class'}${c.subclass ? ` (${c.subclass})` : ''} ${c.level || 1}`).join(' / ') || 'Level 1';
        const race = characterData.identity?.race || 'Unknown';

        // 1. Save character JSON document
        try {
            storage.setItem(CHAR_DATA_PREFIX + id, JSON.stringify(characterData));
        } catch (e) {
            console.error(`Failed to save character data for ${id}`, e);
        }

        // 2. Update registry index
        const registry = this.getRegistry(storage);
        const existingIdx = registry.findIndex(r => r.id === id);

        const summary = {
            id,
            slug,
            name: charName,
            race,
            level: totalLevel,
            classesSummary,
            updatedAt: Date.now()
        };

        if (existingIdx >= 0) {
            registry[existingIdx] = summary;
        } else {
            registry.push(summary);
        }

        this.saveRegistry(registry, storage);

        if (options.makeActive !== false) {
            this.setActiveCharacterId(id, storage);
        }

        return { id, slug, characterData };
    }

    /**
     * Deletes a character document and removes it from the registry index.
     * 
     * @param {string} id - Character ID.
     * @param {Storage} [storage=window.localStorage]
     * @returns {boolean} True if successfully deleted.
     */
    static deleteCharacter(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !id) return false;
        try {
            storage.removeItem(CHAR_DATA_PREFIX + id);
            const registry = this.getRegistry(storage).filter(r => r.id !== id);
            this.saveRegistry(registry, storage);

            if (this.getActiveCharacterId(storage) === id) {
                const nextActive = registry[0]?.id || null;
                if (nextActive) {
                    this.setActiveCharacterId(nextActive, storage);
                } else {
                    storage.removeItem(ACTIVE_CHAR_STORAGE_KEY);
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Migrates legacy single-character storage (`character_dnd_v21`) into the multi-character registry.
     * If no characters exist in registry, seeds initial character (e.g. Dorian) seamlessly.
     * 
     * @param {Object} defaultCharacter - Default bundled character data (character.json).
     * @param {Storage} [storage=window.localStorage]
     * @returns {{ activeId: string, activeSlug: string }}
     */
    static migrateLegacyStorage(defaultCharacter, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) {
            return { activeId: 'default', activeSlug: 'dorian' };
        }

        const registry = this.getRegistry(storage);

        // 1. If registry is already populated, return active character
        if (registry.length > 0) {
            let activeId = this.getActiveCharacterId(storage);
            let activeEntry = registry.find(r => r.id === activeId);
            if (!activeEntry) {
                activeEntry = registry[0];
                activeId = activeEntry.id;
                this.setActiveCharacterId(activeId, storage);
            }
            return { activeId, activeSlug: activeEntry.slug };
        }

        // 2. Check if legacy single-character data exists
        let initialData = null;
        try {
            const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
            if (legacyRaw) {
                initialData = JSON.parse(legacyRaw);
            }
        } catch {
            initialData = null;
        }

        // Fallback to bundled character data if no legacy storage
        if (!initialData) {
            initialData = JSON.parse(JSON.stringify(defaultCharacter || { identity: { name: 'Dorian' } }));
        }

        // Save as first character in new registry
        const saved = this.saveCharacter(initialData, { makeActive: true }, storage);
        return { activeId: saved.id, activeSlug: saved.slug };
    }
}
