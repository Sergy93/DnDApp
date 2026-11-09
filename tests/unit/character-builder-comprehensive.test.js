import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterBuilderService } from '../../src/domain/character/character-builder.service.js';
import { RACIAL_ASI_MAP, CLASS_CREATION_RULES } from '../../src/domain/constants/creation-rules.constants.js';
import RACE_COMPENDIUM from '../../src/dnd-data/race-compendium.json' with { type: 'json' };
import CLASS_COMPENDIUM from '../../src/dnd-data/class-compendium.json' with { type: 'json' };
import BACKGROUND_COMPENDIUM from '../../src/dnd-data/background-compendium.json' with { type: 'json' };
import { normalizeKey } from '../../src/helpers/string.helper.js';

test('Comprehensive D&D 5e Coverage - All 13 Classes', async (t) => {
    const classKeys = Object.keys(CLASS_COMPENDIUM);

    for (const classKey of classKeys) {
        const rules = CLASS_CREATION_RULES[classKey];
        assert.ok(rules, `Rules should exist for class: ${classKey}`);

        await t.test(`Class [${classKey.toUpperCase()}]: hit die, saving throws, subclass requirements & spell slots`, () => {
            const heroL1 = CharacterBuilderService.buildCharacter({
                name: `Hero ${classKey}`,
                race: 'human',
                class: classKey,
                level: 1,
                baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                chosenSkills: []
            });

            // 1. Hit Die & L1 HP (with 10 CON + 1 Human ASI = 11 CON => mod 0)
            const expectedMaxHp = rules.hitDieNum;
            assert.equal(heroL1.vitals.maxHp, expectedMaxHp, `${classKey} level 1 HP should match hit die ${rules.hitDie}`);

            // 2. Saving Throws
            const proficientSaves = Object.keys(heroL1.attributes).filter(a => heroL1.attributes[a].profSave);
            assert.deepEqual(proficientSaves.sort(), [...rules.savingThrows].sort(), `${classKey} saving throw proficiencies should match 5e RAW`);

            // 3. Spellcasting status & spell slots
            if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard', 'artificer'].includes(classKey)) {
                assert.ok(heroL1.magic.slots.length > 0, `${classKey} should have spell slots at level 1`);
                assert.equal(heroL1.magic.slots[0].max, 2, `${classKey} should have 2 1st-level spell slots at level 1`);
            } else if (classKey === 'warlock') {
                assert.ok(heroL1.magic.slots.length > 0, `Warlock should have pact slots at level 1`);
                assert.equal(heroL1.magic.slots[0].max, 1, `Warlock should have 1 pact slot at level 1`);
            } else {
                // Non-casters or half-casters at level 1 (Paladin, Ranger, Fighter, Barbarian, Rogue, Monk)
                assert.equal(heroL1.magic.slots.length, 0, `${classKey} should have no spell slots at level 1`);
            }

            // 4. Subclass unlock level check
            const heroBelowSubclass = CharacterBuilderService.buildCharacter({
                name: `Subclass Test`,
                race: 'human',
                class: classKey,
                subclass: 'TestSubclass',
                level: Math.max(1, rules.subclassLevel - 1),
                baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });

            if (rules.subclassLevel > 1) {
                assert.equal(heroBelowSubclass.identity.classes[0].subclass, '', `${classKey} should NOT have a subclass before level ${rules.subclassLevel}`);
            }

            const heroAtSubclass = CharacterBuilderService.buildCharacter({
                name: `Subclass Test`,
                race: 'human',
                class: classKey,
                subclass: 'Champion',
                level: rules.subclassLevel,
                baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            assert.equal(heroAtSubclass.identity.classes[0].subclass, 'Champion', `${classKey} should receive subclass at level ${rules.subclassLevel}`);
        });
    }
});

test('Comprehensive D&D 5e Coverage - All 30 Races and Subraces', async (t) => {
    for (const [raceKey, raceObj] of Object.entries(RACE_COMPENDIUM)) {
        const subraces = Object.keys(raceObj.subraces || {});

        const testTargets = subraces.length > 0
            ? subraces.map(s => ({ race: raceKey, subrace: s }))
            : [{ race: raceKey, subrace: null }];

        for (const target of testTargets) {
            const label = target.subrace ? `${raceKey} (${target.subrace})` : raceKey;

            await t.test(`Race [${label}]: traditional ASI, speed, and senses`, () => {
                const asi = CharacterBuilderService.resolveRacialAsi(target.race, target.subrace, 'traditional');

                // Validate that all ASI values are integers >= 0
                Object.values(asi).forEach(val => {
                    assert.ok(typeof val === 'number' && val >= 0 && Number.isInteger(val), `ASI values for ${label} must be valid integers`);
                });

                // Build hero to test composite properties
                const hero = CharacterBuilderService.buildCharacter({
                    name: `Hero ${label}`,
                    race: target.race,
                    subrace: target.subrace,
                    class: 'fighter',
                    level: 1,
                    baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });

                // Check speed
                assert.ok(hero.vitals.speed, `${label} must have a valid speed`);
                assert.ok(hero.vitals.speed.includes('ft.'), `${label} speed must include "ft."`);

                // Check darkvision for races that should have it
                if (['dwarf', 'elf', 'gnome', 'tiefling', 'halforc'].includes(target.race)) {
                    assert.ok(hero.vitals.darkvision, `${label} should have darkvision`);
                }

                // Check specific resistances
                if (target.race === 'tiefling') {
                    assert.ok(hero.vitals.damageResistances.includes('fire'), 'Tieflings must have fire resistance');
                } else if (target.race === 'dwarf') {
                    assert.ok(hero.vitals.damageResistances.includes('poison'), 'Dwarves must have poison resistance');
                }
            });
        }
    }
});

test('Comprehensive D&D 5e Coverage - All 20 Backgrounds', async (t) => {
    for (const [bgKey, bgObj] of Object.entries(BACKGROUND_COMPENDIUM)) {
        await t.test(`Background [${bgObj.name || bgKey}]: grants background skill proficiencies`, () => {
            const bgSkills = (bgObj.skillProficiencies || []).map(s => normalizeKey(s));

            const hero = CharacterBuilderService.buildCharacter({
                name: `Hero ${bgKey}`,
                race: 'human',
                class: 'fighter',
                background: bgObj.name || bgKey,
                backgroundSkills: bgSkills,
                chosenSkills: [],
                level: 1,
                baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });

            const proficientSkills = hero.skills.filter(s => s.profType === 'C').map(s => normalizeKey(s.id));

            bgSkills.forEach(skillId => {
                assert.ok(
                    proficientSkills.includes(skillId),
                    `Character with background ${bgKey} should be proficient in ${skillId}`
                );
            });
        });
    }
});
