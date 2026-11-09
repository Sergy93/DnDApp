import test from 'node:test';
import assert from 'node:assert/strict';

import {
    slugifyCharacterName,
    CharacterStorageService
} from '../../src/services/character-storage.service.js';
import { CharacterRouterService } from '../../src/services/character-router.service.js';

test('Character Slugification & URL Normalization', () => {
    assert.equal(slugifyCharacterName('Dorian'), 'dorian');
    assert.equal(slugifyCharacterName('Dorian Gray'), 'dorian-gray');
    assert.equal(slugifyCharacterName("Drizzt Do'Urden"), 'drizzt-do-urden');
    assert.equal(slugifyCharacterName('Valeros Peña'), 'valeros-pena');
    assert.equal(slugifyCharacterName('Thorin ⚔️ Oakenshield'), 'thorin-oakenshield');
    assert.equal(slugifyCharacterName('  Bob "The Rock"  '), 'bob-the-rock');
    assert.equal(slugifyCharacterName(''), 'character');
    assert.equal(slugifyCharacterName(null), 'character');
});

test('Character Router Hash Parsing & Formatting', () => {
    assert.equal(CharacterRouterService.getSlugFromHash('#/c/dorian'), 'dorian');
    assert.equal(CharacterRouterService.getSlugFromHash('#/character/dorian-gray'), 'dorian-gray');
    assert.equal(CharacterRouterService.getSlugFromHash('#/elminster'), 'elminster');
    assert.equal(CharacterRouterService.getSlugFromHash('#/'), null);
    assert.equal(CharacterRouterService.getSlugFromHash(''), null);
    assert.equal(CharacterRouterService.getSlugFromHash(null), null);

    assert.equal(CharacterRouterService.formatHash('Dorian Gray'), '#/c/dorian-gray');
});

test('CharacterStorageService CRUD & Collision Management', () => {
    let memoryStore = {};
    const mockStorage = {
        getItem: (k) => memoryStore[k] || null,
        setItem: (k, v) => { memoryStore[k] = String(v); },
        removeItem: (k) => { delete memoryStore[k]; }
    };

    // 1. Initial registry is empty
    assert.deepEqual(CharacterStorageService.getRegistry(mockStorage), []);

    // 2. Save first character
    const char1 = {
        identity: { name: 'Dorian', race: 'Tiefling', classes: [{ name: 'Bard', level: 5 }] }
    };
    const saved1 = CharacterStorageService.saveCharacter(char1, { makeActive: true }, mockStorage);
    assert.ok(saved1.id);
    assert.equal(saved1.slug, 'dorian');
    assert.equal(CharacterStorageService.getActiveCharacterId(mockStorage), saved1.id);

    // 3. Save second character with identical name (Collision Handling!)
    const char2 = {
        identity: { name: 'Dorian', race: 'Human', classes: [{ name: 'Fighter', level: 1 }] }
    };
    const saved2 = CharacterStorageService.saveCharacter(char2, { makeActive: false }, mockStorage);
    assert.notEqual(saved2.id, saved1.id);
    assert.equal(saved2.slug, 'dorian-2', 'Duplicate names must receive unique numbered slugs');

    // 4. Registry contains both characters
    const registry = CharacterStorageService.getRegistry(mockStorage);
    assert.equal(registry.length, 2);
    assert.equal(registry[0].slug, 'dorian');
    assert.equal(registry[1].slug, 'dorian-2');

    // 5. Retrieve character by slug and ID
    const retrievedBySlug = CharacterStorageService.getCharacterBySlug('dorian-2', mockStorage);
    assert.ok(retrievedBySlug);
    assert.equal(retrievedBySlug.identity.race, 'Human');

    const retrievedById = CharacterStorageService.getCharacterById(saved1.id, mockStorage);
    assert.ok(retrievedById);
    assert.equal(retrievedById.identity.race, 'Tiefling');

    // 6. Delete character
    const deleted = CharacterStorageService.deleteCharacter(saved1.id, mockStorage);
    assert.equal(deleted, true);
    assert.equal(CharacterStorageService.getRegistry(mockStorage).length, 1);
    assert.equal(CharacterStorageService.getActiveCharacterId(mockStorage), saved2.id, 'Active character should switch to remaining character');
});

test('CharacterStorageService Legacy Storage Migration', () => {
    let memoryStore = {
        character_dnd_v21: JSON.stringify({
            identity: { name: 'Legacy Dorian', classes: [{ name: 'Bard', level: 6 }] }
        })
    };
    const mockStorage = {
        getItem: (k) => memoryStore[k] || null,
        setItem: (k, v) => { memoryStore[k] = String(v); },
        removeItem: (k) => { delete memoryStore[k]; }
    };

    const migrationResult = CharacterStorageService.migrateLegacyStorage(null, mockStorage);
    assert.ok(migrationResult.activeId);
    assert.equal(migrationResult.activeSlug, 'legacy-dorian');

    const registry = CharacterStorageService.getRegistry(mockStorage);
    assert.equal(registry.length, 1);
    assert.equal(registry[0].name, 'Legacy Dorian');
});
