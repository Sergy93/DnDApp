import test from 'node:test';
import assert from 'node:assert/strict';
import { CompendiumStorageService, COMPENDIUM_STORES } from '../../src/services/compendium-storage.service.js';
import worker from '../../src/worker.js';

test('CompendiumStorageService - Offline-First IndexedDB Store', async (t) => {
    await t.test('Seeds all compendium categories into storage', async () => {
        const payload = {
            version: 1,
            classes: [
                { id: 'bard', name: 'Bard', hitDie: 'd8' },
                { id: 'warlock', name: 'Warlock', hitDie: 'd8' }
            ],
            races: [
                { id: 'tiefling', name: 'Tiefling', speed: '30 ft.' }
            ],
            backgrounds: [
                { id: 'charlatan', name: 'Charlatan', skillProficiencies: ['Deception', 'Sleight of Hand'] }
            ],
            spells: [
                { id: 'dissonant-whispers', name: 'Dissonant Whispers', level: 1, school: 'Enchantment', classes: ['Bard'] },
                { id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation', classes: ['Sorcerer', 'Wizard'] },
                { id: 'vicious-mockery', name: 'Vicious Mockery', level: 0, school: 'Enchantment', classes: ['Bard'] }
            ]
        };

        const summary = await CompendiumStorageService.seedPayload(payload);
        assert.equal(summary.classes, 2);
        assert.equal(summary.races, 1);
        assert.equal(summary.backgrounds, 1);
        assert.equal(summary.spells, 3);

        const isPopulated = await CompendiumStorageService.isPopulated();
        assert.equal(isPopulated, true);

        const version = await CompendiumStorageService.getMetadata('version');
        assert.equal(version, 1);
    });

    await t.test('Retrieves stored items by key and in bulk', async () => {
        const classes = await CompendiumStorageService.getAll(COMPENDIUM_STORES.CLASSES);
        assert.equal(classes.length, 2);
        assert.equal(classes.some(c => c.name === 'Bard'), true);

        const tiefling = await CompendiumStorageService.get(COMPENDIUM_STORES.RACES, 'tiefling');
        assert.ok(tiefling);
        assert.equal(tiefling.speed, '30 ft.');
    });

    await t.test('Searches spells by level, class, school, and name query', async () => {
        // Query Bard 1st-level spells
        const bardLevel1 = await CompendiumStorageService.searchSpells({ class: 'bard', level: 1 });
        assert.equal(bardLevel1.length, 1);
        assert.equal(bardLevel1[0].name, 'Dissonant Whispers');

        // Query Cantrips (level 0)
        const cantrips = await CompendiumStorageService.searchSpells({ level: 0 });
        assert.equal(cantrips.length, 1);
        assert.equal(cantrips[0].name, 'Vicious Mockery');

        // Query by substring search
        const fire = await CompendiumStorageService.searchSpells({ search: 'fire' });
        assert.equal(fire.length, 1);
        assert.equal(fire[0].name, 'Fireball');

        // Query unmatched
        const unmatched = await CompendiumStorageService.searchSpells({ search: 'nonexistent-spell-xyz' });
        assert.equal(unmatched.length, 0);
    });
});

test('Cloudflare Worker Compendium Endpoint (/api/compendium/all)', async () => {
    const req = new Request('https://dorian-dnd.workers.dev/api/compendium/all', {
        method: 'GET'
    });

    const env = {
        DB: {
            prepare: (query) => ({
                all: async () => ({ results: [] })
            })
        }
    };

    const res = await worker.fetch(req, env, {});
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.compendium);
    assert.ok(body.compendium.classes);
    assert.ok(body.compendium.races);
    assert.ok(body.compendium.backgrounds);
    assert.ok(body.compendium.spells);
});
