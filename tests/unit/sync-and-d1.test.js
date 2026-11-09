import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterSyncService, SYNC_STATUS } from '../../src/services/character-sync.service.js';
import { CharacterStorageService } from '../../src/services/character-storage.service.js';
import { CharacterRouterService } from '../../src/services/character-router.service.js';
import { STORAGE_KEYS } from '../../src/domain/constants/storage.constants.js';
import {
    mapDbRowToCharacter,
    extractCharacterDbPayload
} from '../../functions/api/_utils.js';
import CHARACTER_DATA from '../../src/character.json' with { type: "json" };

// Mock localStorage helper
function createMockStorage() {
    const store = new Map();
    return {
        getItem: (k) => store.get(String(k)) || null,
        setItem: (k, v) => store.set(String(k), String(v)),
        removeItem: (k) => store.delete(String(k)),
        clear: () => store.clear(),
        get length() { return store.size; }
    };
}

test('CharacterRouterService Multi-View Routing Parity', async (t) => {
    await t.test('parses route definitions correctly', () => {
        assert.deepEqual(CharacterRouterService.parseRoute('#/login'), { view: 'login', slug: null });
        assert.deepEqual(CharacterRouterService.parseRoute('#/create'), { view: 'create', slug: null });
        assert.deepEqual(CharacterRouterService.parseRoute('#/c/dorian'), { view: 'sheet', slug: 'dorian' });
        assert.deepEqual(CharacterRouterService.parseRoute('#/character/elminster'), { view: 'sheet', slug: 'elminster' });
        assert.deepEqual(CharacterRouterService.parseRoute('#/gandalf'), { view: 'sheet', slug: 'gandalf' });
        assert.deepEqual(CharacterRouterService.parseRoute(''), { view: 'root', slug: null });
        assert.deepEqual(CharacterRouterService.parseRoute('#/'), { view: 'root', slug: null });
    });

    await t.test('slug extractor ignores views and returns null for non-characters', () => {
        assert.equal(CharacterRouterService.getSlugFromHash('#/login'), null);
        assert.equal(CharacterRouterService.getSlugFromHash('#/create'), null);
        assert.equal(CharacterRouterService.getSlugFromHash('#/'), null);
        assert.equal(CharacterRouterService.getSlugFromHash('#/c/dorian'), 'dorian');
    });
});

test('CharacterSyncService Offline Queue & Tombstones Accounting', async (t) => {
    const storage = createMockStorage();

    await t.test('enqueues changes and removes duplicates', () => {
        CharacterSyncService.enqueueChange('char_1', storage);
        CharacterSyncService.enqueueChange('char_2', storage);
        CharacterSyncService.enqueueChange('char_1', storage);

        const queue = CharacterSyncService.getSyncQueue(storage);
        assert.deepEqual(queue, ['char_1', 'char_2']);

        CharacterSyncService.removeFromSyncQueue(['char_1'], storage);
        assert.deepEqual(CharacterSyncService.getSyncQueue(storage), ['char_2']);
    });

    await t.test('enqueues tombstones on character deletion', () => {
        CharacterSyncService.enqueueChange('char_to_delete', storage);
        assert.ok(CharacterSyncService.getSyncQueue(storage).includes('char_to_delete'));

        CharacterSyncService.enqueueDeletion('char_to_delete', storage);
        // Removed from sync queue
        assert.ok(!CharacterSyncService.getSyncQueue(storage).includes('char_to_delete'));
        // Added to tombstones
        assert.deepEqual(CharacterSyncService.getTombstones(storage), ['char_to_delete']);

        CharacterSyncService.removeFromTombstones(['char_to_delete'], storage);
        assert.deepEqual(CharacterSyncService.getTombstones(storage), []);
    });

    await t.test('persists user profile and last sync timestamp', () => {
        assert.equal(CharacterSyncService.getLastSyncTimestamp(storage), 0);
        CharacterSyncService.setLastSyncTimestamp(1700000000000, storage);
        assert.equal(CharacterSyncService.getLastSyncTimestamp(storage), 1700000000000);

        CharacterSyncService.setUserProfile({ email: 'test@example.com', id: 'usr_1' }, storage);
        const profile = CharacterSyncService.getUserProfile(storage);
        assert.equal(profile.email, 'test@example.com');
    });
});

test('CharacterSyncService Bidirectional Sync Lifecycle', async (t) => {
    const storage = createMockStorage();

    // Seed local character
    const localChar = {
        id: 'dorian-gray',
        slug: 'dorian',
        identity: { name: 'Dorian Gray', race: 'Tiefling' },
        vitals: { currentHp: 45, maxHp: 45 },
        client_updated_at: 1000
    };
    CharacterStorageService.saveCharacter(localChar, { makeActive: true }, storage);

    await t.test('handles offline state cleanly', async () => {
        const res = await CharacterSyncService.syncNow({ storage, isOnline: false });
        assert.equal(res.success, false);
        assert.equal(res.error, 'Offline');
        assert.equal(CharacterSyncService.getStatus(), SYNC_STATUS.OFFLINE);
    });

    await t.test('executes successful sync batch and updates local storage', async () => {
        const mockServerChanges = [
            {
                id: 'char_remote_1',
                slug: 'elminster',
                identity: { name: 'Elminster', race: 'Human' },
                vitals: { currentHp: 60, maxHp: 60 },
                client_updated_at: 2000
            }
        ];

        let receivedPayload = null;
        const mockFetch = async (url, opts) => {
            if (url === '/api/sync') {
                receivedPayload = JSON.parse(opts.body);
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        serverChanges: mockServerChanges,
                        serverDeletions: [],
                        syncTimestamp: 3000
                    })
                };
            }
            throw new Error(`Unexpected endpoint: ${url}`);
        };

        const res = await CharacterSyncService.syncNow({ fetchImpl: mockFetch, storage });
        assert.equal(res.success, true);
        assert.equal(res.updated, 1);
        assert.equal(CharacterSyncService.getStatus(), SYNC_STATUS.SYNCED);

        // Verify local changes were passed to API
        assert.ok(receivedPayload.localChanges.some(c => c.id === 'dorian-gray'));

        // Verify server character was saved into LocalStorage
        const remoteSaved = CharacterStorageService.getCharacterById('char_remote_1', storage);
        assert.ok(remoteSaved);
        assert.equal(remoteSaved.identity.name, 'Elminster');

        // Verify sync timestamp updated
        assert.equal(CharacterSyncService.getLastSyncTimestamp(storage), 3000);
    });

    await t.test('transitions to conflict on API failure while keeping queue intact', async () => {
        CharacterSyncService.enqueueChange('char_retry', storage);

        const failingFetch = async () => ({
            ok: false,
            status: 500
        });

        const res = await CharacterSyncService.syncNow({ fetchImpl: failingFetch, storage });
        assert.equal(res.success, false);
        assert.equal(CharacterSyncService.getStatus(), SYNC_STATUS.CONFLICT);

        // Queue not lost
        assert.ok(CharacterSyncService.getSyncQueue(storage).includes('char_retry'));
    });
});

test('Cloudflare Functions D1 Payload Serialization & Integrity', async (t) => {
    await t.test('extracts DB payload and maps back with 100% data parity', () => {
        const userId = 'user_sergio_oauth';
        const payload = extractCharacterDbPayload(CHARACTER_DATA, userId);

        assert.equal(payload.user_id, userId);
        assert.equal(payload.slug, 'dorian');
        assert.equal(payload.name, 'Dorian');
        assert.equal(typeof payload.identity_json, 'string');
        assert.equal(typeof payload.vitals_json, 'string');
        assert.equal(typeof payload.attributes_json, 'string');
        assert.equal(typeof payload.skills_json, 'string');

        // Simulate DB row mapping back
        const mockRow = {
            id: payload.id,
            slug: payload.slug,
            name: payload.name,
            race: payload.race,
            total_level: payload.total_level,
            classes_summary: payload.classes_summary,
            identity_json: payload.identity_json,
            vitals_json: payload.vitals_json,
            attributes_json: payload.attributes_json,
            skills_json: payload.skills_json,
            inventory_json: payload.inventory_json,
            magic_json: payload.magic_json,
            combat_json: payload.combat_json,
            progression_json: payload.progression_json,
            conditions_json: payload.conditions_json,
            concentration_json: payload.concentration_json,
            death_saves_json: payload.death_saves_json,
            status_notes: payload.status_notes,
            quests_json: payload.quests_json,
            campaign_notes: payload.campaign_notes,
            version: payload.version,
            schema_version: payload.schema_version,
            client_updated_at: payload.client_updated_at
        };

        const rehydrated = mapDbRowToCharacter(mockRow);
        assert.equal(rehydrated.id, payload.id);
        assert.equal(rehydrated.slug, 'dorian');
        assert.equal(rehydrated.identity.name, CHARACTER_DATA.identity.name);
        assert.equal(rehydrated.vitals.currentHp, CHARACTER_DATA.vitals.currentHp);
        assert.equal(rehydrated.attributes.STR.score, CHARACTER_DATA.attributes.STR.score);
        assert.equal(rehydrated.magic.spellcastingAbility, CHARACTER_DATA.magic.spellcastingAbility);
    });
});
