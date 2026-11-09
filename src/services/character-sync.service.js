import { STORAGE_KEYS } from '../domain/constants/storage.constants.js';
import { CharacterStorageService } from './character-storage.service.js';

export const SYNC_STATUS = Object.freeze({
    SYNCED: 'synced',
    SYNCING: 'syncing',
    OFFLINE: 'offline',
    CONFLICT: 'conflict'
});

/**
 * Service managing bidirectional offline-first synchronization between
 * LocalStorage and Cloudflare D1 via Pages Functions.
 */
export class CharacterSyncService {
    static status = SYNC_STATUS.SYNCED;
    static lastError = null;
    static listeners = new Set();
    static debounceTimer = null;
    static initialized = false;

    /**
     * Registers a listener callback for sync status changes.
     * @param {Function} callback - (status, error) => void
     * @returns {Function} Unsubscribe function.
     */
    static onStatusChange(callback) {
        if (typeof callback !== 'function') return () => {};
        this.listeners.add(callback);
        // Immediately notify of current status
        callback(this.status, this.lastError);
        return () => this.listeners.delete(callback);
    }

    /**
     * Updates sync status and informs subscribers.
     * @param {string} newStatus - Value from SYNC_STATUS
     * @param {string|null} [error=null]
     */
    static setStatus(newStatus, error = null) {
        this.status = newStatus;
        this.lastError = error;
        for (const listener of this.listeners) {
            try {
                listener(this.status, this.lastError);
            } catch (e) {
                console.error('Error in sync status listener', e);
            }
        }
    }

    /**
     * Returns the current sync status.
     * @returns {string}
     */
    static getStatus() {
        return this.status;
    }

    /**
     * Gets the local sync queue of modified character IDs.
     * @param {Storage} [storage=window.localStorage]
     * @returns {string[]}
     */
    static getSyncQueue(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return [];
        try {
            const raw = storage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Enqueues a character ID for synchronization.
     * @param {string} id
     * @param {Storage} [storage=window.localStorage]
     */
    static enqueueChange(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !id) return;
        const queue = this.getSyncQueue(storage);
        if (!queue.includes(id)) {
            queue.push(id);
            try {
                storage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
            } catch (e) {
                console.error('Failed to update sync queue', e);
            }
        }
    }

    /**
     * Removes IDs from the local sync queue.
     * @param {string[]} ids
     * @param {Storage} [storage=window.localStorage]
     */
    static removeFromSyncQueue(ids, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !Array.isArray(ids) || ids.length === 0) return;
        const set = new Set(ids);
        const queue = this.getSyncQueue(storage).filter(id => !set.has(id));
        try {
            storage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (e) {
            console.error('Failed to remove from sync queue', e);
        }
    }

    /**
     * Gets local deleted character tombstones awaiting server sync.
     * @param {Storage} [storage=window.localStorage]
     * @returns {string[]}
     */
    static getTombstones(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return [];
        try {
            const raw = storage.getItem(STORAGE_KEYS.SYNC_TOMBSTONES);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Enqueues a deleted character ID to tombstones.
     * @param {string} id
     * @param {Storage} [storage=window.localStorage]
     */
    static enqueueDeletion(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !id) return;
        this.removeFromSyncQueue([id], storage);
        const tombstones = this.getTombstones(storage);
        if (!tombstones.includes(id)) {
            tombstones.push(id);
            try {
                storage.setItem(STORAGE_KEYS.SYNC_TOMBSTONES, JSON.stringify(tombstones));
            } catch (e) {
                console.error('Failed to update sync tombstones', e);
            }
        }
    }

    /**
     * Removes IDs from local tombstones.
     * @param {string[]} ids
     * @param {Storage} [storage=window.localStorage]
     */
    static removeFromTombstones(ids, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage || !Array.isArray(ids) || ids.length === 0) return;
        const set = new Set(ids);
        const tombstones = this.getTombstones(storage).filter(id => !set.has(id));
        try {
            storage.setItem(STORAGE_KEYS.SYNC_TOMBSTONES, JSON.stringify(tombstones));
        } catch (e) {
            console.error('Failed to remove from sync tombstones', e);
        }
    }

    /**
     * Gets the last sync timestamp.
     * @param {Storage} [storage=window.localStorage]
     * @returns {number}
     */
    static getLastSyncTimestamp(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return 0;
        try {
            return Number(storage.getItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP)) || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Sets the last sync timestamp.
     * @param {number} ts
     * @param {Storage} [storage=window.localStorage]
     */
    static setLastSyncTimestamp(ts, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;
        try {
            storage.setItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP, String(ts));
        } catch (e) {
            console.error('Failed to set last sync timestamp', e);
        }
    }

    /**
     * Retrieves stored user profile information.
     * @param {Storage} [storage=window.localStorage]
     * @returns {Object|null}
     */
    static getUserProfile(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return null;
        try {
            const raw = storage.getItem(STORAGE_KEYS.USER_PROFILE);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Saves user profile information.
     * @param {Object} profile
     * @param {Storage} [storage=window.localStorage]
     */
    static setUserProfile(profile, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!storage) return;
        try {
            if (profile) {
                storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
            } else {
                storage.removeItem(STORAGE_KEYS.USER_PROFILE);
            }
        } catch (e) {
            console.error('Failed to save user profile', e);
        }
    }

    /**
     * Checks current user authentication with backend API.
     * @param {Function} [fetchImpl=fetch]
     * @param {Storage} [storage=window.localStorage]
     * @returns {Promise<Object>}
     */
    static async checkAuth(fetchImpl = typeof fetch !== 'undefined' ? fetch : null, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
        if (!fetchImpl) {
            return { authenticated: false, user: null, mode: 'offline' };
        }
        try {
            const res = await fetchImpl('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    this.setUserProfile(data.user, storage);
                    return data;
                }
            }
        } catch (e) {
            // Offline or network error - continue with local profile
        }
        const cached = this.getUserProfile(storage);
        return {
            authenticated: Boolean(cached?.email),
            user: cached,
            mode: 'cached'
        };
    }

    /**
     * Performs a bidirectional synchronization batch with Cloudflare D1.
     * 
     * @param {Object} [options={}]
     * @param {Function} [options.fetchImpl=fetch]
     * @param {Storage} [options.storage=window.localStorage]
     * @returns {Promise<{ success: boolean, updated: number, deleted: number, error?: string }>}
     */
    static async syncNow({
        fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
        storage = typeof localStorage !== 'undefined' ? localStorage : null,
        isOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true
    } = {}) {
        if (!isOnline) {
            this.setStatus(SYNC_STATUS.OFFLINE);
            return { success: false, updated: 0, deleted: 0, error: 'Offline' };
        }

        if (!fetchImpl || !storage) {
            return { success: false, updated: 0, deleted: 0, error: 'Environment unavailable' };
        }

        if (this.status === SYNC_STATUS.SYNCING) {
            return { success: true, updated: 0, deleted: 0 };
        }

        this.setStatus(SYNC_STATUS.SYNCING);

        try {
            const queueIds = this.getSyncQueue(storage);
            const localTombstones = this.getTombstones(storage);
            const lastSyncTimestamp = this.getLastSyncTimestamp(storage);

            // Collect local changes
            const localChanges = [];
            for (const id of queueIds) {
                const char = CharacterStorageService.getCharacterById(id, storage);
                if (char) {
                    localChanges.push(char);
                }
            }

            const response = await fetchImpl('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lastSyncTimestamp,
                    localChanges,
                    localDeletions: localTombstones
                })
            });

            let responseData = null;
            if (!response.ok) {
                try {
                    responseData = await response.json();
                } catch {
                    try {
                        responseData = { error: await response.text() };
                    } catch {
                        responseData = null;
                    }
                }
                const detailMsg = responseData?.details || responseData?.error;
                const errorMsg = detailMsg
                    ? `Sync API error (${response.status}): ${detailMsg}`
                    : `Sync API responded with HTTP ${response.status}`;
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Sync request failed');
            }

            // 1. Process server deletions in LocalStorage
            if (Array.isArray(data.serverDeletions) && data.serverDeletions.length > 0) {
                for (const item of data.serverDeletions) {
                    const idToDelete = typeof item === 'string' ? item : item.id;
                    if (idToDelete) {
                        CharacterStorageService.deleteCharacter(idToDelete, storage, { skipSyncQueue: true });
                    }
                }
            }

            // 2. Process server changes in LocalStorage
            if (Array.isArray(data.serverChanges) && data.serverChanges.length > 0) {
                for (const char of data.serverChanges) {
                    if (char && char.id) {
                        // Save without re-marking as active unless none is active
                        CharacterStorageService.saveCharacter(char, { makeActive: false, skipSyncQueue: true }, storage);
                    }
                }
            }

            // 3. Clear successfully synced local queues
            this.removeFromSyncQueue(queueIds, storage);
            this.removeFromTombstones(localTombstones, storage);

            // 4. Update sync timestamp and status
            const syncTime = Number(data.syncTimestamp) || Date.now();
            this.setLastSyncTimestamp(syncTime, storage);
            this.setStatus(SYNC_STATUS.SYNCED);

            return {
                success: true,
                updated: (data.serverChanges || []).length,
                deleted: (data.serverDeletions || []).length
            };
        } catch (err) {
            const isOffline = !isOnline || (typeof navigator !== 'undefined' && navigator.onLine === false);
            this.setStatus(isOffline ? SYNC_STATUS.OFFLINE : SYNC_STATUS.CONFLICT, err.message);
            return {
                success: false,
                updated: 0,
                deleted: 0,
                error: err.message
            };
        }
    }

    /**
     * Schedules a debounced sync operation (e.g. after user actions).
     * @param {number} [delayMs=1500]
     * @param {Object} [options={}]
     */
    static scheduleSync(delayMs = 1500, options = {}) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.syncNow(options);
        }, delayMs);
    }

    /**
     * Initializes window event listeners for online/offline status changes.
     */
    static initListeners() {
        if (this.initialized || typeof window === 'undefined') return;
        this.initialized = true;

        window.addEventListener('online', () => {
            this.syncNow();
        });

        window.addEventListener('offline', () => {
            this.setStatus(SYNC_STATUS.OFFLINE);
        });
    }
}
