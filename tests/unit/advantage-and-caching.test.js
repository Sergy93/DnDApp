import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttributes } from '../../src/domain/calculators/attributes.calculator.js';
import { calculateSkills } from '../../src/domain/calculators/skills.calculator.js';
import { createCharacterSheet } from '../../src/app.js';
import { CharacterStorageService } from '../../src/services/character-storage.service.js';

test('Advantage Calculation on Attributes, Saves, and Skills', async (t) => {
    await t.test('Item with attribute advantage flags attribute and derived skills', () => {
        const sampleAttrs = {
            STR: { score: 10, profSave: false },
            DEX: { score: 14, profSave: true },
            CON: { score: 12, profSave: false },
            INT: { score: 10, profSave: false },
            WIS: { score: 12, profSave: false },
            CHA: { score: 16, profSave: true }
        };

        const equipped = [
            {
                name: 'Talisman of Pure Charisma',
                equipped: true,
                statBonuses: {
                    attr: 'cha', // test case-insensitivity
                    attrMode: 'advantage'
                }
            }
        ];

        const computedAttrs = calculateAttributes(sampleAttrs, equipped, 2);
        assert.equal(computedAttrs.CHA.hasAttrAdvantage, true);
        assert.ok(computedAttrs.CHA.attrAdvantageSources.includes('Talisman of Pure Charisma'));
        assert.equal(computedAttrs.STR.hasAttrAdvantage, false);

        // Derived skills (Persuasion, Deception, etc.) must inherit advantage
        const rawSkills = [
            { id: 'persuasion', name: 'Persuasion', attr: 'CHA', profType: 'C' },
            { id: 'athletics', name: 'Athletics', attr: 'STR', profType: '' }
        ];

        const computedSkills = calculateSkills(rawSkills, computedAttrs, 2, {}, equipped);
        const persuasion = computedSkills.find(s => s.id === 'persuasion');
        const athletics = computedSkills.find(s => s.id === 'athletics');

        assert.equal(persuasion.hasAdvantage, true);
        assert.equal(athletics.hasAdvantage, false);
    });

    await t.test('Item with save advantage flags target saving throw', () => {
        const sampleAttrs = {
            STR: { score: 10, profSave: false },
            DEX: { score: 14, profSave: true },
            CON: { score: 12, profSave: false },
            INT: { score: 10, profSave: false },
            WIS: { score: 12, profSave: false },
            CHA: { score: 16, profSave: true }
        };

        const equipped = [
            {
                name: 'Boots of Agility',
                equipped: true,
                statBonuses: {
                    saveType: 'DEX',
                    saveMode: 'advantage'
                }
            }
        ];

        const computedAttrs = calculateAttributes(sampleAttrs, equipped, 2);
        assert.equal(computedAttrs.DEX.hasSaveAdvantage, true);
        assert.ok(computedAttrs.DEX.saveAdvantageSources.includes('Boots of Agility'));
        assert.equal(computedAttrs.WIS.hasSaveAdvantage, false);
    });

    await t.test('Traits grant saving throw advantage (Gnome Cunning, Dwarven Resilience, Fey Ancestry)', () => {
        const sampleAttrs = {
            STR: { score: 10, profSave: false },
            DEX: { score: 10, profSave: false },
            CON: { score: 14, profSave: false },
            INT: { score: 15, profSave: true },
            WIS: { score: 14, profSave: false },
            CHA: { score: 12, profSave: false }
        };

        const gnomeChar = {
            combat: {
                traits: [
                    { name: 'Gnome Cunning', desc: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.' }
                ]
            }
        };

        const computedAttrs = calculateAttributes(sampleAttrs, [], 2, gnomeChar);
        assert.equal(computedAttrs.INT.hasSaveAdvantage, true);
        assert.equal(computedAttrs.WIS.hasSaveAdvantage, true);
        assert.equal(computedAttrs.CHA.hasSaveAdvantage, true);
        assert.equal(computedAttrs.STR.hasSaveAdvantage, false);
    });
});

test('Cache Invalidation Across Character Switching and Equipment Changes', async (t) => {
    const storageMock = {};
    globalThis.window = {
        location: { hash: '' },
        history: { replaceState: () => {} }
    };
    globalThis.localStorage = {
        getItem: (k) => storageMock[k] || null,
        setItem: (k, v) => { storageMock[k] = String(v); },
        removeItem: (k) => { delete storageMock[k]; },
        clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
    };

    const sheet = createCharacterSheet();
    const dorianId = sheet.data.id;

    await t.test('Dorian has persuasion and deception advantage from Ring of Consilium Dubium', () => {
        const persuasion = sheet.stats.computedSkills.find(s => s.id === 'persuasion');
        const deception = sheet.stats.computedSkills.find(s => s.id === 'deception');
        assert.equal(persuasion.hasAdvantage, true);
        assert.equal(deception.hasAdvantage, true);
    });

    await t.test('Switching to another character without advantage does not retain stale advantage', () => {
        // Create clean hero without the ring
        sheet.openNewHeroWizard();
        sheet.wizardData.name = 'Boran';
        sheet.wizardData.race = 'human';
        sheet.wizardData.class = 'fighter';
        sheet.wizardData.level = 1;
        sheet.wizardData.baseAttributes = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
        sheet.finalizeAndCreateHero();

        const boranPersuasion = sheet.stats.computedSkills.find(s => s.id === 'persuasion');
        assert.equal(boranPersuasion.hasAdvantage, false);

        // Switch back to Dorian: advantage should re-appear immediately
        sheet.switchCharacter(dorianId);
        const dorianPersuasionAfterSwitch = sheet.stats.computedSkills.find(s => s.id === 'persuasion');
        assert.equal(dorianPersuasionAfterSwitch.hasAdvantage, true);
    });
});
