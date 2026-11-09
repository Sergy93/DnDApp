import test from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateInitiative,
    calculateMovementAndSenses,
    calculateSpellPreparation,
    getArmorMinStr,
    createCharacterSheet
} from '../../src/app.js';
import { RaceProvider } from '../../src/domain/providers/race.provider.js';

test('D&D 5e Advanced Playable Mechanics (Features 3, 4, 5, 6)', async (t) => {

    await t.test('Feature 3: Spell Preparation Limits & Known Spells (5e RAW)', () => {
        const attrs = {
            INT: { mod: 4 },
            WIS: { mod: 3 },
            CHA: { mod: 2 }
        };

        // 1. Wizard: Level 5 + INT mod 4 = 9 prepared spells
        const wizardChar = {
            identity: { classes: [{ name: 'Wizard', level: 5 }] }
        };
        const prepWizard = calculateSpellPreparation(wizardChar, attrs, [
            { name: 'Fire Bolt', level: 0 },
            { name: 'Mage Armor', level: 1, prepared: true },
            { name: 'Shield', level: 1, prepared: true },
            { name: 'Misty Step', level: 2, prepared: false }
        ]);
        assert.equal(prepWizard.isPreparedCaster, true);
        assert.equal(prepWizard.maxPrepared, 9);
        assert.equal(prepWizard.preparedCount, 2); // Only Mage Armor & Shield prepared; Fire Bolt is cantrip, Misty Step unprepared
        assert.equal(prepWizard.isOverPrepared, false);

        // 2. Paladin: floor(Level 5 / 2) = 2 + CHA mod 2 = 4 prepared spells
        const pallyChar = {
            identity: { classes: [{ name: 'Paladin', level: 5 }] }
        };
        const prepPally = calculateSpellPreparation(pallyChar, attrs, [
            { name: 'Bless', level: 1, prepared: true },
            { name: 'Heroism', level: 1, prepared: true, alwaysPrepared: true } // Domain/Oath spell doesn't count
        ]);
        assert.equal(prepPally.maxPrepared, 4);
        assert.equal(prepPally.preparedCount, 1); // Bless counts, Heroism is oath/domain so does not count

        // 3. Known casters: Bard 5 knows 8 spells
        const bardChar = {
            identity: { classes: [{ name: 'Bard', level: 5 }] }
        };
        const prepBard = calculateSpellPreparation(bardChar, attrs, [
            { name: 'Vicious Mockery', level: 0 },
            { name: 'Dissonant Whispers', level: 1 },
            { name: 'Healing Word', level: 1 }
        ]);
        assert.equal(prepBard.isKnownCaster, true);
        assert.equal(prepBard.maxKnown, 8);
        assert.equal(prepBard.knownCount, 2); // Excludes cantrip
    });

    await t.test('Feature 4: Heavy Armor Strength Requirement & Speed Penalty (5e RAW)', () => {
        const normalAttrs = { STR: { score: 10 } };
        const strongAttrs = { STR: { score: 16 } };

        assert.equal(getArmorMinStr({ type: 'heavy', name: 'Plate' }), 15);
        assert.equal(getArmorMinStr({ type: 'heavy', name: 'Chain Mail' }), 13);
        assert.equal(getArmorMinStr({ type: 'light', name: 'Leather' }), 0);

        // Character with 10 STR wearing Plate (15 STR req) loses 10 ft speed
        const weakHuman = {
            identity: { race: 'Human', classes: [{ name: 'Fighter', level: 1 }] }
        };
        const raceHuman = RaceProvider.resolveRace('Human');
        const plateArmor = [{ name: 'Plate', type: 'heavy', baseAc: 18, equipped: true }];

        const encumbered = calculateMovementAndSenses(weakHuman, normalAttrs, raceHuman, plateArmor, plateArmor);
        assert.equal(encumbered.heavyArmorPenalty, 10);
        assert.equal(encumbered.finalWalkSpeed, 20); // 30 - 10 = 20
        assert.ok(encumbered.heavyArmorWarning.includes('requires STR 15'));

        // Character with 16 STR wearing Plate has no penalty
        const strongHuman = calculateMovementAndSenses(weakHuman, strongAttrs, raceHuman, plateArmor, plateArmor);
        assert.equal(strongHuman.heavyArmorPenalty, 0);
        assert.equal(strongHuman.finalWalkSpeed, 30);

        // Dwarf wearing Plate with 10 STR ignores penalty (Dwarven Combat Training / Racial trait)
        const weakDwarf = {
            identity: { race: 'Hill Dwarf', classes: [{ name: 'Fighter', level: 1 }] }
        };
        const raceDwarf = RaceProvider.resolveRace('Hill Dwarf');
        const dwarfMove = calculateMovementAndSenses(weakDwarf, normalAttrs, raceDwarf, plateArmor, plateArmor);
        assert.equal(dwarfMove.heavyArmorPenalty, 0);
        assert.equal(dwarfMove.finalWalkSpeed, 25); // Dwarf base speed is 25, no penalty
    });

    await t.test('Feature 5: Advanced Initiative Modifiers (Jack of all Trades, Swashbuckler, Alert, Items)', () => {
        const baseAttrs = {
            DEX: { mod: 3, modStr: '+3' },
            CHA: { mod: 4, modStr: '+4' },
            INT: { mod: 2, modStr: '+2' },
            WIS: { mod: 1, modStr: '+1' }
        };

        // 1. Bard Level 5 adds Jack of All Trades (floor(3/2) = +1)
        const bardChar = {
            identity: { classes: [{ name: 'Bard', level: 5 }] }
        };
        const bardInit = calculateInitiative(baseAttrs, 3, bardChar, []);
        assert.equal(bardInit.initNum, 4); // DEX 3 + Jack of all Trades 1 = 4
        assert.equal(bardInit.initStr, '+4');
        assert.ok(bardInit.initDesc.includes('Jack of All Trades (+1)'));

        // 2. Swashbuckler Rogue adds CHA to initiative
        const swashChar = {
            identity: { classes: [{ name: 'Rogue', subclass: 'Swashbuckler', level: 3 }] }
        };
        const swashInit = calculateInitiative(baseAttrs, 2, swashChar, []);
        assert.equal(swashInit.initNum, 7); // DEX 3 + CHA 4 = 7
        assert.ok(swashInit.initDesc.includes('Rakish Audacity (CHA)'));

        // 3. Alert Feat adds +5 to initiative
        const alertChar = {
            combat: { traits: [{ name: 'Alert', desc: '+5 to initiative rolls and cannot be surprised' }] }
        };
        const alertInit = calculateInitiative(baseAttrs, 2, alertChar, []);
        assert.equal(alertInit.initNum, 8); // DEX 3 + Alert 5 = 8

        // 4. Item with initiative bonus
        const magicItem = [{ name: 'Sword of Quickness', statBonuses: { initiative: 2 } }];
        const itemInit = calculateInitiative(baseAttrs, 2, null, magicItem);
        assert.equal(itemInit.initNum, 5); // DEX 3 + Item 2 = 5
    });

    await t.test('Feature 6: Movement Modes & Special Senses (Fly, Darkvision, Monk, Genie)', () => {
        const attrs = { STR: { score: 14 } };

        // 1. Tiefling character has Darkvision 60 ft
        const tieflingChar = {
            identity: { race: 'Tiefling', classes: [{ name: 'Bard', level: 5 }] }
        };
        const raceTiefling = RaceProvider.resolveRace('Tiefling');
        const tieflingMove = calculateMovementAndSenses(tieflingChar, attrs, raceTiefling, [], []);
        assert.equal(tieflingMove.finalWalkSpeed, 30);
        const darkvision = tieflingMove.senses.find(s => s.name === 'Darkvision');
        assert.ok(darkvision);
        assert.equal(darkvision.range, '60 ft.');

        // 2. Genie Warlock Level 6 unlocks Elemental Gift (Hover Fly Speed)
        const genieChar = {
            identity: { classes: [{ name: 'Warlock', subclass: 'Genie (Djinni)', level: 6 }] }
        };
        const genieMove = calculateMovementAndSenses(genieChar, attrs, raceTiefling, [], []);
        const flyMode = genieMove.movementModes.find(m => m.type === 'fly');
        assert.ok(flyMode, 'Genie Level 6 should have flying speed');
        assert.equal(flyMode.speed, '30 ft.');
        assert.ok(flyMode.source.includes('Genie'));

        // 3. Monk Level 6 with no armor gets +15 ft Unarmored Movement
        const monkChar = {
            identity: { classes: [{ name: 'Monk', level: 6 }] }
        };
        const monkMove = calculateMovementAndSenses(monkChar, attrs, raceTiefling, [], []);
        assert.equal(monkMove.finalWalkSpeed, 45); // 30 base + 15 monk = 45 ft.
    });

    await t.test('Alpine Component Integration: toggleSpellPrepared in sheet instance', () => {
        const sheet = createCharacterSheet();
        assert.equal(typeof sheet.getArmorMinStr, 'function');
        assert.equal(typeof sheet.toggleSpellPrepared, 'function');
        assert.equal(typeof sheet.isSpellPrepared, 'function');

        // Toggle a leveled spell preparation
        const leveledSpell = (sheet.data.magic?.spells || []).find(s => s.level > 0 && !s.alwaysPrepared && !s.isItemGranted);
        if (leveledSpell) {
            const initialPrep = sheet.isSpellPrepared(leveledSpell.name);
            sheet.toggleSpellPrepared(leveledSpell.name);
            assert.equal(sheet.isSpellPrepared(leveledSpell.name), !initialPrep);
            sheet.toggleSpellPrepared(leveledSpell.name);
            assert.equal(sheet.isSpellPrepared(leveledSpell.name), initialPrep);
        }
    });
});
