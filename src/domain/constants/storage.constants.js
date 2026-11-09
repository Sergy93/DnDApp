/**
 * Centralized Storage Keys and Prefixes for LocalStorage / Cache persistence.
 */

export const STORAGE_KEYS = Object.freeze({
    LEGACY_CHARACTER: 'character_dnd_v21',
    REGISTRY: 'dnd_characters_registry',
    ACTIVE_CHARACTER_ID: 'dnd_active_character_id',
    CHAR_DATA_PREFIX: 'dnd_char_data_',
    SYNC_QUEUE: 'dnd_sync_queue',
    LAST_SYNC_TIMESTAMP: 'dnd_last_sync_timestamp',
    SYNC_TOMBSTONES: 'dnd_sync_tombstones',
    USER_PROFILE: 'dnd_user_profile'
});
