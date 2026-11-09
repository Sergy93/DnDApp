import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CharacterSanitizerService } from '../../src/domain/character/character-sanitizer.service.js';
import { ABILITY_KEYS, DND_5E_SKILLS, MAX_ATTUNEMENT_SLOTS } from '../../src/domain/constants/dnd.constants.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const CHAR_JSON_PATH = path.join(ROOT_DIR, 'src/character.json');

test('Character Data Schema & Sanitization Integrity', async (t) => {
    await t.test('character.json exists and is valid JSON', () => {
        assert.ok(fs.existsSync(CHAR_JSON_PATH), 'src/character.json must exist');
        const content = fs.readFileSync(CHAR_JSON_PATH, 'utf8');
        assert.doesNotThrow(() => JSON.parse(content), 'src/character.json must be valid JSON');
    });

    const rawData = JSON.parse(fs.readFileSync(CHAR_JSON_PATH, 'utf8'));

    await t.test('Sanitizer keeps character.json compliant with 5e rules and schema', () => {
        const sanitized = CharacterSanitizerService.sanitize(rawData);

        // Identity
        assert.ok(sanitized.identity.name, 'Character must have a name');
        assert.ok(Array.isArray(sanitized.identity.classes), 'Character must have classes array');
        assert.ok(sanitized.identity.classes.length > 0, 'Character must have at least one class');

        // Attributes
        for (const attr of ABILITY_KEYS) {
            assert.ok(sanitized.attributes[attr], `Attribute ${attr} must exist`);
            assert.equal(typeof sanitized.attributes[attr].score, 'number', `${attr} score must be a number`);
            assert.ok(sanitized.attributes[attr].score >= 1, `${attr} score must be >= 1`);
        }

        // Skills
        assert.ok(Array.isArray(sanitized.skills), 'Skills must be an array');
        assert.equal(sanitized.skills.length, DND_5E_SKILLS.length, 'Must have all 18 D&D 5e skills');

        // Wealth
        assert.ok(sanitized.inventory.wealth, 'Wealth object must exist');
        for (const coin of ['pp', 'gp', 'ep', 'sp', 'cp']) {
            assert.equal(typeof sanitized.inventory.wealth[coin], 'number', `Coin ${coin} must be numeric`);
            assert.ok(sanitized.inventory.wealth[coin] >= 0, `Coin ${coin} cannot be negative`);
        }

        // Attunement limit sanity
        const allArmors = sanitized.inventory.armors || [];
        const allWeapons = sanitized.inventory.weapons || [];
        const allStory = sanitized.inventory.story || [];
        const totalAttuned = [...allArmors, ...allWeapons, ...allStory].filter(item => item && (item.attuned || item.isAttuned)).length;
        assert.ok(totalAttuned <= MAX_ATTUNEMENT_SLOTS, `Attuned items (${totalAttuned}) exceeds max limit (${MAX_ATTUNEMENT_SLOTS})`);
    });
});
