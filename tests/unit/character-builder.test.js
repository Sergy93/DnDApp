import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterBuilderService } from '../../src/domain/character/character-builder.service.js';
import { createCharacterSheet } from '../../src/app.js';
import { CharacterStorageService } from '../../src/services/character-storage.service.js';
import { CharacterRouterService } from '../../src/services/character-router.service.js';

test('CharacterBuilderService - D&D 5e RAW Rules Parity', async (t) => {
    await t.test('Builds Level 1 Fighter with Standard Array and Traditional ASI', () => {
        const payload = {
            name: 'Valeros',
            alignment: 'Neutral Good',
            background: 'Soldier',
            race: 'human',
            subrace: '',
            asiMode: 'traditional',
            class: 'fighter',
            subclass: '',
            level: 1,
            baseAttributes: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
            chosenSkills: ['athletics', 'intimidation'],
            backgroundSkills: ['athletics', 'survival'],
            chosenSpells: []
        };

        const hero = CharacterBuilderService.buildCharacter(payload);

        assert.equal(hero.identity.name, 'Valeros');
        assert.equal(hero.identity.race, 'Human');
        assert.equal(hero.identity.classes[0].name, 'Fighter');
        assert.equal(hero.identity.classes[0].level, 1);

        // Human traditional ASI gives +1 to all attributes
        assert.equal(hero.attributes.STR.score, 16);
        assert.equal(hero.attributes.DEX.score, 15);
        assert.equal(hero.attributes.CON.score, 14);
        assert.equal(hero.attributes.INT.score, 13);
        assert.equal(hero.attributes.WIS.score, 11);
        assert.equal(hero.attributes.CHA.score, 9);

        // Fighter saving throws: STR and CON
        assert.equal(hero.attributes.STR.profSave, true);
        assert.equal(hero.attributes.CON.profSave, true);
        assert.equal(hero.attributes.DEX.profSave, false);

        // HP at level 1: d10 (10) + CON mod (+2) = 12
        assert.equal(hero.vitals.maxHp, 12);
        assert.equal(hero.vitals.currentHp, 12);
        assert.equal(hero.vitals.speed, '30 ft.');

        // Skills: athletics, intimidation, survival (athletics not duplicated)
        const profSkills = hero.skills.filter(s => s.profType === 'C').map(s => s.id);
        assert.ok(profSkills.includes('athletics'));
        assert.ok(profSkills.includes('intimidation'));
        assert.ok(profSkills.includes('survival'));
        assert.equal(profSkills.length, 3);
    });

    await t.test('Builds Level 3 Wizard with High Elf race, Cantrips and Spell Slots', () => {
        const payload = {
            name: 'Elendor',
            alignment: 'Chaotic Good',
            background: 'Sage',
            race: 'elf',
            subrace: 'high_elf',
            asiMode: 'traditional',
            class: 'wizard',
            subclass: 'Evocation',
            level: 3,
            baseAttributes: { STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 },
            chosenSkills: ['arcana', 'history'],
            backgroundSkills: ['arcana', 'investigation'],
            chosenSpells: ['Fire Bolt', 'Mage Armor', 'Shield', 'Misty Step']
        };

        const hero = CharacterBuilderService.buildCharacter(payload);

        // High Elf ASI: +2 DEX, +1 INT
        assert.equal(hero.attributes.DEX.score, 16); // 14 + 2
        assert.equal(hero.attributes.INT.score, 16); // 15 + 1
        assert.equal(hero.attributes.CON.score, 13); // +1 mod

        // Wizard saving throws: INT and WIS
        assert.equal(hero.attributes.INT.profSave, true);
        assert.equal(hero.attributes.WIS.profSave, true);
        assert.equal(hero.attributes.STR.profSave, false);

        // Level 3 Wizard HP: L1 = 6 + 1 (CON mod) = 7. L2 and L3: 2 * (4 + 1) = 10. Total = 17 HP
        assert.equal(hero.vitals.maxHp, 17);

        // Elf Darkvision & Keen Senses
        assert.equal(hero.vitals.darkvision, '60 ft.');
        const percSkill = hero.skills.find(s => s.id === 'perception');
        assert.equal(percSkill.profType, 'C'); // High Elf Keen Senses

        // Wizard Level 3 Spell Slots: 4 x 1st level, 2 x 2nd level
        assert.equal(hero.magic.slots[0].max, 4);
        assert.equal(hero.magic.slots[1].max, 2);
    });

    await t.test('Flexible Tasha ASI Mode assigns custom bonuses correctly', () => {
        const payload = {
            name: 'Grom',
            alignment: 'Neutral',
            background: 'Outlander',
            race: 'half_orc',
            subrace: '',
            asiMode: 'flexible',
            flexibleAsi: { STR: 2, CON: 1, DEX: 0, INT: 0, WIS: 0, CHA: 0 },
            class: 'barbarian',
            subclass: '',
            level: 1,
            baseAttributes: { STR: 15, DEX: 14, CON: 14, INT: 8, WIS: 12, CHA: 8 },
            chosenSkills: ['athletics', 'perception'],
            backgroundSkills: ['athletics', 'survival']
        };

        const hero = CharacterBuilderService.buildCharacter(payload);

        assert.equal(hero.attributes.STR.score, 17); // 15 + 2
        assert.equal(hero.attributes.CON.score, 15); // 14 + 1
        assert.equal(hero.attributes.DEX.score, 14); // unchanged
    });

    await t.test('Hill Dwarf provides Dwarven Toughness extra HP per level', () => {
        const payload = {
            name: 'Thrum',
            alignment: 'Lawful Good',
            background: 'Guild Artisan',
            race: 'dwarf',
            subrace: 'hill_dwarf',
            asiMode: 'traditional',
            class: 'cleric',
            subclass: 'Life',
            level: 2,
            baseAttributes: { STR: 14, DEX: 8, CON: 14, INT: 10, WIS: 15, CHA: 10 },
            chosenSkills: ['insight', 'religion'],
            backgroundSkills: ['insight', 'persuasion']
        };

        const hero = CharacterBuilderService.buildCharacter(payload);

        // Hill Dwarf: +2 CON, +1 WIS
        assert.equal(hero.attributes.CON.score, 16); // 14 + 2 => CON mod = +3
        assert.equal(hero.attributes.WIS.score, 16); // 15 + 1

        // Cleric d8. L1: 8 + 3 = 11. L2: 5 + 3 = 8. Base = 19. Hill Dwarf gives +1 per level (+2) => 21 HP
        assert.equal(hero.vitals.maxHp, 21);
    });
});

test('UI Wizard Slice - Creation Flow & Point Buy Accounting', async (t) => {
    // Setup clean mock local storage
    const storageMock = {};
    globalThis.localStorage = {
        getItem: (k) => storageMock[k] || null,
        setItem: (k, v) => { storageMock[k] = String(v); },
        removeItem: (k) => { delete storageMock[k]; },
        clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
    };

    const sheet = createCharacterSheet();

    await t.test('openNewHeroWizard initializes clean state', () => {
        sheet.openNewHeroWizard();
        assert.equal(sheet.wizardOpen, true);
        assert.equal(sheet.wizardStep, 1);
        assert.equal(sheet.wizardData.level, 1);
        assert.equal(sheet.wizardData.scoreMethod, 'standard');
    });

    await t.test('Wizard step navigation skips magic step for martial classes', () => {
        sheet.openNewHeroWizard();
        sheet.wizardData.name = 'Kallista';
        sheet.wizardData.class = 'fighter';

        // Step 1 -> 2
        sheet.wizardNextStep();
        assert.equal(sheet.wizardStep, 2);

        // Step 2 -> 3
        sheet.wizardNextStep();
        assert.equal(sheet.wizardStep, 3);

        // Step 3 -> 4
        sheet.wizardNextStep();
        assert.equal(sheet.wizardStep, 4);

        // Step 4 -> skips 5 (Magic) because Fighter is not a spellcaster -> jumps to Step 6
        sheet.wizardNextStep();
        assert.equal(sheet.wizardStep, 6);

        // Step 6 prevStep should jump back to 4
        sheet.wizardPrevStep();
        assert.equal(sheet.wizardStep, 4);
    });

    await t.test('Point Buy allows score adjustments within 27 point budget', () => {
        sheet.openNewHeroWizard();
        sheet.wizardData.scoreMethod = 'pointbuy';

        // Initial point buy is 8 for all stats (0 spent, 27 remaining)
        assert.equal(sheet.wizardPointBuyRemaining, 27);

        // Increment STR from 8 to 9 (cost 1 point)
        sheet.adjustPointBuy('STR', 1);
        assert.equal(sheet.wizardData.pointBuyScores.STR, 9);
        assert.equal(sheet.wizardPointBuyRemaining, 26);

        // Cannot decrease below 8
        sheet.adjustPointBuy('DEX', -1);
        assert.equal(sheet.wizardData.pointBuyScores.DEX, 8);
        assert.equal(sheet.wizardPointBuyRemaining, 26);

        // Raise STR to 15 (costs 9 points total: 27 - 9 = 18 remaining)
        for (let i = 0; i < 10; i++) {
            sheet.adjustPointBuy('STR', 1);
        }
        assert.equal(sheet.wizardData.pointBuyScores.STR, 15);
        assert.equal(sheet.wizardPointBuyRemaining, 18);

        // Cannot increase beyond 15
        sheet.adjustPointBuy('STR', 1);
        assert.equal(sheet.wizardData.pointBuyScores.STR, 15);
    });

    await t.test('roll4d6Attributes generates valid 3-18 scores for all attributes', () => {
        sheet.openNewHeroWizard();
        sheet.roll4d6Attributes();

        ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(attr => {
            const val = sheet.wizardData.rolledAttributes[attr];
            assert.ok(val >= 3 && val <= 18, `${attr} rolled score ${val} should be between 3 and 18`);
        });
    });

    await t.test('finalizeAndCreateHero persists hero and changes route', async () => {
        sheet.openNewHeroWizard();
        sheet.wizardData.name = 'Aric Thornwood';
        sheet.wizardData.race = 'dwarf';
        sheet.wizardData.class = 'cleric';
        sheet.wizardData.level = 1;

        // Mock uiAlert to avoid hanging
        sheet.uiAlert = async () => {};

        await sheet.finalizeAndCreateHero();

        assert.equal(sheet.wizardOpen, false);
        assert.equal(sheet.data.identity.name, 'Aric Thornwood');

        const currentActive = CharacterStorageService.getActiveCharacter();
        assert.equal(currentActive.identity.name, 'Aric Thornwood');
        assert.equal(currentActive.slug, 'aric-thornwood');
    });
});
