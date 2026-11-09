import test from 'node:test';
import assert from 'node:assert/strict';
import { DND_5E_FEATS, findFeat } from '../../src/domain/constants/feats.constants.js';
import { CLASS_STARTING_EQUIPMENT } from '../../src/domain/constants/equipment-packages.constants.js';
import { CharacterBuilderService } from '../../src/domain/character/character-builder.service.js';
import { createProgressionSlice } from '../../src/ui/slices/progression.slice.js';

test('5e Feats & Starting Equipment Packages Parity', async (t) => {
    await t.test('DND_5E_FEATS compendium has canonical feats and findFeat finds by ID or name', () => {
        assert.ok(DND_5E_FEATS.length >= 25, 'Expected at least 25 canonical 5e feats');
        const feyTouched = findFeat('fey_touched');
        assert.ok(feyTouched, 'Fey Touched feat should be present');
        assert.equal(feyTouched.name, 'Fey Touched');
        assert.ok(feyTouched.asi.attributes.includes('INT'));

        const warCaster = findFeat('War Caster');
        assert.ok(warCaster, 'War Caster feat should be found by name');
        assert.equal(warCaster.id, 'war-caster');
    });

    await t.test('CLASS_STARTING_EQUIPMENT contains packages for all canonical classes', () => {
        const classes = ['fighter', 'barbarian', 'wizard', 'rogue', 'cleric', 'paladin', 'ranger', 'bard', 'monk', 'warlock', 'druid', 'sorcerer', 'artificer'];
        for (const cls of classes) {
            assert.ok(CLASS_STARTING_EQUIPMENT[cls], `Starting equipment for ${cls} should exist`);
            assert.ok(CLASS_STARTING_EQUIPMENT[cls].choices.length > 0, `${cls} should have selectable choices`);
        }
    });

    await t.test('CharacterBuilderService equips chosen starting equipment packages', () => {
        const char = CharacterBuilderService.buildCharacter({
            name: 'Aiden',
            class: 'fighter',
            level: 1,
            selectedEquipment: { 0: 0, 1: 0, 2: 0 } // Martial + Shield, Light Crossbow, Dungeoneer's Pack
        });

        assert.ok(char.inventory.weapons.some(w => w.name.includes('Martial') || w.name.includes('Longsword')), 'Expected primary weapon');
        assert.ok(char.inventory.armors.some(a => a.name.includes('Chain Mail')), 'Expected Fighter default chain mail armor');
        assert.ok(char.inventory.tools.some(t => t.name.includes("Dungeoneer's Pack")), 'Expected pack');
    });

    await t.test('CharacterBuilderService applies Feat and half-feat stat bonus at character creation', () => {
        const baseAttrs = { STR: 14, DEX: 14, CON: 14, INT: 15, WIS: 10, CHA: 8 };
        const char = CharacterBuilderService.buildCharacter({
            name: 'Elminster Clone',
            race: 'human',
            subrace: 'variant',
            class: 'wizard',
            level: 1,
            baseAttributes: baseAttrs,
            chosenFeat: 'fey_touched',
            chosenFeatAsi: 'INT'
        });

        // Base 15 INT + 1 racial (variant human) + 1 Fey Touched = 17 INT
        assert.equal(char.attributes.INT.score, 17, 'Expected INT score 17 after half-feat bonus');
        assert.ok(char.combat.traits.some(t => t.name.includes('Feat: Fey Touched')), 'Trait list must contain Feat');
    });

    await t.test('CharacterBuilderService applies Tough feat HP bonus (+2 per level)', () => {
        const charWithoutTough = CharacterBuilderService.buildCharacter({
            name: 'Brute',
            class: 'fighter',
            level: 5,
            baseAttributes: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 }
        });

        const charWithTough = CharacterBuilderService.buildCharacter({
            name: 'Brute Tough',
            class: 'fighter',
            level: 5,
            baseAttributes: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
            chosenFeat: 'tough'
        });

        // 5 levels * 2 HP = 10 extra HP
        assert.equal(charWithTough.vitals.maxHp, charWithoutTough.vitals.maxHp + 10, 'Expected Tough feat to grant +10 HP at level 5');
    });

    await t.test('ProgressionSlice supports choosing Feat on Level Up', () => {
        const progressionSlice = createProgressionSlice();
        const mockHost = {
            data: {
                identity: { classes: [{ name: 'Fighter', level: 3, hitDie: 'd10' }] },
                vitals: { maxHp: 28, currentHp: 28 },
                attributes: {
                    STR: { score: 16 }, DEX: { score: 14 }, CON: { score: 14 },
                    INT: { score: 10 }, WIS: { score: 12 }, CHA: { score: 8 }
                },
                combat: { traits: [] }
            },
            logEvent() {},
            uiAlert() {},
            saveState() {}
        };

        // Bind progressionSlice methods to mockHost
        Object.assign(mockHost, progressionSlice);

        mockHost.openLevelUpModal();
        assert.equal(mockHost.levelUpForm.asiOrFeatMode, 'asi');

        // Level up Fighter from 3 to 4
        mockHost.levelUpClass(0, 1);
        assert.equal(mockHost.levelUpForm.classes[0].level, 4);

        // Switch to Feat mode and choose Fey Touched (+1 WIS)
        mockHost.levelUpForm.asiOrFeatMode = 'feat';
        mockHost.levelUpForm.selectedFeatId = 'fey_touched';
        mockHost.levelUpForm.selectedFeatAsi = 'WIS';

        mockHost.handleSaveLevelUp();

        assert.equal(mockHost.data.attributes.WIS.score, 13, 'Expected WIS to increase from 12 to 13 from Fey Touched half-feat');
        assert.ok(mockHost.data.combat.traits.some(t => t.name.includes('Feat: Fey Touched')), 'Feat must be recorded in traits');
    });
});
