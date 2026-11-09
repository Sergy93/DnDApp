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

    await t.test('Item with skill-specific advantage flags parent attribute and specific skills only', () => {
        const sampleAttrs = {
            STR: { score: 10, profSave: false },
            DEX: { score: 14, profSave: true },
            CON: { score: 12, profSave: false },
            INT: { score: 10, profSave: false },
            WIS: { score: 12, profSave: false },
            CHA: { score: 16, profSave: true }
        };

        const ringEquipped = [
            {
                name: 'Ring of Consilium Dubium',
                equipped: true,
                advantageSkills: ['Persuasion', 'Deception']
            }
        ];

        const computedAttrs = calculateAttributes(sampleAttrs, ringEquipped, 2);
        // Parent attribute CHA must show advantage badge with descriptive source
        assert.equal(computedAttrs.CHA.hasAttrAdvantage, true);
        assert.ok(computedAttrs.CHA.attrAdvantageSources.some(s => s.includes('Ring of Consilium Dubium')));
        assert.equal(computedAttrs.STR.hasAttrAdvantage, false);

        const rawSkills = [
            { id: 'persuasion', name: 'Persuasion', attr: 'CHA', profType: 'P' },
            { id: 'deception', name: 'Deception', attr: 'CHA', profType: 'P' },
            { id: 'intimidation', name: 'Intimidation', attr: 'CHA', profType: 'C' }
        ];

        const computedSkills = calculateSkills(rawSkills, computedAttrs, 2, {}, ringEquipped);
        const persuasion = computedSkills.find(s => s.id === 'persuasion');
        const deception = computedSkills.find(s => s.id === 'deception');
        const intimidation = computedSkills.find(s => s.id === 'intimidation');

        assert.equal(persuasion.hasAdvantage, true);
        assert.equal(deception.hasAdvantage, true);
        // Intimidation must NOT inherit false advantage because the ring is skill-specific
        assert.equal(intimidation.hasAdvantage, false);
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

    await t.test('Skill Advantage dropdown and Granted Spells in Armor / Story modals', () => {
        // Verify allSkillsList has 18 skills and all can provide string name
        assert.equal(sheet.allSkillsList.length, 18);
        sheet.allSkillsList.forEach(sk => {
            const skillName = sk.name || sk;
            assert.ok(typeof skillName === 'string');
            assert.notEqual(skillName, '[object Object]');
            assert.ok(skillName.length > 0);
        });

        // Verify allCompendiumSpellsList is populated with spells
        assert.ok(sheet.allCompendiumSpellsList.length > 0);
        const sampleSpell = sheet.allCompendiumSpellsList[0];
        assert.ok(sampleSpell.name && typeof sampleSpell.name === 'string');
        assert.ok(typeof sampleSpell.level === 'number');

        // Test Armor modal adding skill advantage with string
        sheet.openArmorModal();
        sheet.selectedSkillAdvToAdd = 'Athletics';
        sheet.addSkillAdvToArmorForm();
        assert.deepEqual(sheet.armorForm.advantageSkills, ['Athletics']);

        // Adding an object should extract name rather than [object Object]
        sheet.selectedSkillAdvToAdd = { id: 'acrobatics', name: 'Acrobatics', attr: 'DEX' };
        sheet.addSkillAdvToArmorForm();
        assert.deepEqual(sheet.armorForm.advantageSkills, ['Athletics', 'Acrobatics']);

        // Adding [object Object] string directly should be ignored
        sheet.selectedSkillAdvToAdd = '[object Object]';
        sheet.addSkillAdvToArmorForm();
        assert.deepEqual(sheet.armorForm.advantageSkills, ['Athletics', 'Acrobatics']);

        // Adding Granted Spell to Armor
        sheet.selectedSpellToAdd = 'Misty Step';
        sheet.addSpellToArmorForm();
        assert.deepEqual(sheet.armorForm.grantedSpells, ['Misty Step']);

        // Save Armor
        sheet.armorForm.name = 'Boots of Elvenkind';
        sheet.armorForm.equipped = true;
        sheet.handleSaveArmor();

        const savedArmor = sheet.data.inventory.armors.find(a => a.name === 'Boots of Elvenkind');
        assert.ok(savedArmor);
        assert.deepEqual(savedArmor.advantageSkills, ['Athletics', 'Acrobatics']);
        assert.deepEqual(savedArmor.grantedSpells, ['Misty Step']);

        // Verify Athletics now has advantage from equipped armor
        const athletics = sheet.stats.computedSkills.find(s => s.id === 'athletics');
        assert.equal(athletics.hasAdvantage, true);
    });
});
