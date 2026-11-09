import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DND_CONDITIONS,
    DAMAGE_TYPES,
    DND_5E_SKILLS,
    normalizeKey,
    capitalizeWord,
    findCompendiumClass,
    resolveSubclassInfo,
    findCompendiumSubclass,
    generateProgressionTree,
    resolveAttributeMod,
    calculateExpectedSlots,
    syncCharacterSpellSlots,
    resolveDiceScale,
    resolveBardicDie,
    detectClassFeaturesToSync,
    getResourceMaxUses,
    sanitizeTracking,
    parseCharacterFileContent,
    hasCharacterFeature,
    resolveGenieDamage,
    getAllEquippedItems,
    resolveCharacterResistances,
    resolveClassHitDie,
    resolveSpellcastingAttrKey,
    resolveSongOfRestDie,
    computeStats,
    clean5eToolsText,
    parse5eToolsSpell,
    buildSpellsCompendium,
    findSpellInCompendium,
    getCantripScalingTier,
    resolveScaledSpellDamage,
    calculateSlotDamage,
    resolveSpellData,
    loadInitialData,
    createCharacterSheet,
    TemplateHelper,
    ItemBonusHelper,
    StorageService,
    applyClassFeaturesSync,
    ClassFeatureProvider,
    RaceProvider
} from '../src/app.js';
import { calculateSkills } from '../src/domain/calculators/skills.calculator.js';
import { SpellService } from '../src/domain/spells/spell.service.js';
import SPELL_COMPENDIUM from '../src/dnd-data/spell-compendium.json' with { type: 'json' };

// Synchronously seed SpellService in headless test runner
SpellService.buildSpellsCompendium([SPELL_COMPENDIUM]);

test('String & Key Normalization Helpers', () => {
    assert.equal(normalizeKey('College of Swords'), 'collegeofswords');
    assert.equal(normalizeKey('Genie (Djinni)'), 'geniedjinni');
    assert.equal(normalizeKey('Canción de Descanso'), 'canciondedescanso');
    assert.equal(normalizeKey(null), '');
    assert.equal(normalizeKey(undefined), '');

    assert.equal(capitalizeWord('bard'), 'Bard');
    assert.equal(capitalizeWord('college of swords'), 'College Of Swords');
    assert.equal(capitalizeWord('   '), '');
    assert.equal(capitalizeWord(null), '');
});

test('Attribute Modifiers & Resource Max Uses', () => {
    const attrs = {
        STR: { score: 8 },
        DEX: { score: 16 },
        CON: { score: 14 },
        INT: { score: 10 },
        WIS: { score: 12 },
        CHA: { score: 20 }
    };
    assert.equal(resolveAttributeMod(attrs, 'STR'), -1);
    assert.equal(resolveAttributeMod(attrs, 'DEX'), 3);
    assert.equal(resolveAttributeMod(attrs, 'INT'), 0);
    assert.equal(resolveAttributeMod(attrs, 'CHA'), 5);
    assert.equal(resolveAttributeMod(null, 'STR'), 0);
    assert.equal(resolveAttributeMod(attrs, ''), 0);

    assert.equal(getResourceMaxUses({ uses: 4 }, attrs, 3), 4);
    assert.equal(getResourceMaxUses({ usesKey: 'CHA' }, attrs, 3), 5);
    assert.equal(getResourceMaxUses({ usesKey: 'PB' }, attrs, 3), 3);
    assert.equal(getResourceMaxUses({ usesKey: 'STR' }, attrs, 3), 1);
    assert.equal(getResourceMaxUses({ spent: [false, true, false] }, attrs, 2), 3);
    assert.equal(getResourceMaxUses({}, attrs, 2), 1);
});

test('Class & Subclass Compendium Resolution & Progression Trees', () => {
    assert.equal(findCompendiumClass(''), null);
    assert.equal(findCompendiumClass('NonExistentClass'), null);

    const bard = findCompendiumClass('Bard');
    assert.ok(bard);
    assert.equal(bard.key, 'bard');
    assert.equal(resolveClassHitDie({ name: 'Bard' }), 'd8');
    assert.equal(resolveClassHitDie({ name: 'Barbarian' }), 'd12');
    assert.equal(resolveClassHitDie({ hitDie: 'd10' }), 'd10');
    assert.equal(resolveClassHitDie({ name: 'Unknown' }), 'd8');

    assert.equal(resolveSubclassInfo('Bard', ''), null);
    assert.equal(resolveSubclassInfo('Bard', 'UnknownSubclassXYZ'), null);

    const swords = resolveSubclassInfo('Bard', 'Swords');
    assert.ok(swords);
    assert.equal(swords.key, 'swords');

    // Global fallback search when className is omitted or mismatched
    const globalSwords = resolveSubclassInfo('', 'College of Swords');
    assert.ok(globalSwords);
    assert.equal(globalSwords.key, 'swords');

    const djinni = resolveSubclassInfo('Warlock', 'Djinni');
    assert.ok(djinni);
    assert.equal(djinni.key, 'genie');
    assert.equal(djinni.specialization, 'djinni');
    assert.equal(djinni.specInfo?.damageType, 'Thunder');

    const globalDao = resolveSubclassInfo('', 'Dao');
    assert.ok(globalDao);
    assert.equal(globalDao.specialization, 'dao');

    assert.equal(findCompendiumSubclass(null, 'Swords'), null);
    const subComp = findCompendiumSubclass(bard.obj, 'College of Swords', 'Bard');
    assert.ok(subComp);
    assert.equal(subComp.key, 'swords');

    const tree = generateProgressionTree('Bard', 'Swords', {
        bard: [{ level: 1, title: 'Custom Level 1', feats: ['Custom Bard Feat'] }]
    });
    assert.ok(Array.isArray(tree));
    assert.equal(tree[0].title, 'Custom Level 1');
    assert.deepEqual(tree[0].feats, ['Custom Bard Feat']);
});

test('Spell Slots Progression: Single, Half, Artificer, Third, Multiclass & Warlock Pact', () => {
    // Single Full Caster (Bard 5)
    const bardSlots = calculateExpectedSlots([{ name: 'Bard', level: 5 }]);
    assert.deepEqual(bardSlots.map(s => ({ id: s.id, max: s.max, reset: s.reset })), [
        { id: 'lvl1', max: 4, reset: 'long' },
        { id: 'lvl2', max: 3, reset: 'long' },
        { id: 'lvl3', max: 2, reset: 'long' }
    ]);

    // Single Artificer (Level 3 -> 3x 1st)
    const artSlots = calculateExpectedSlots([{ name: 'Artificer', level: 3 }]);
    assert.equal(artSlots.length, 1);
    assert.equal(artSlots[0].max, 3);

    // Subclass Third Caster (Fighter Eldritch Knight 3 -> 2x 1st)
    const ekSlots = calculateExpectedSlots([{ name: 'Fighter', subclass: 'Eldritch Knight', level: 3 }]);
    assert.equal(ekSlots.length, 1);
    assert.equal(ekSlots[0].max, 2);

    // Multiclass combining Full + Half + Artificer + Third + Warlock Pact
    const multiSlots = calculateExpectedSlots([
        { name: 'Bard', level: 2 }, // +2
        { name: 'Paladin', level: 2 }, // +1 (floor 2/2)
        { name: 'Artificer', level: 1 }, // +1 (ceil 1/2)
        { name: 'Fighter', subclass: 'Eldritch Knight', level: 3 }, // +1 (floor 3/3) -> total 5
        { name: 'Warlock', level: 2 } // Pact
    ]);
    const pactSlot = multiSlots.find(s => s.id === 'pact');
    assert.ok(pactSlot);
    assert.equal(pactSlot.max, 2);
    assert.equal(pactSlot.reset, 'short');
    assert.equal(multiSlots.find(s => s.id === 'lvl3')?.max, 2);

    // Sync preserves spent state and custom user slots
    const charObj = {
        identity: { classes: [{ name: 'Bard', level: 3 }] },
        magic: {
            slots: [
                { id: 'lvl1', max: 4, spent: [true, false, true, false] },
                { id: 'custom_ring', level: 'Ring of Spell Storing', max: 1, spent: [true] }
            ]
        }
    };
    syncCharacterSpellSlots(charObj);
    assert.equal(charObj.magic.slots.length, 3);
    assert.deepEqual(charObj.magic.slots[0].spent, [true, false, true, false]);
    assert.deepEqual(charObj.magic.slots[1].spent, [false, false]);
    assert.ok(charObj.magic.slots.some(s => s.id === 'custom_ring'));
});

test('Dice Scaling & Feature Detection (Unlock & Stale on Level Down)', () => {
    assert.equal(resolveDiceScale('bard', 'bardicDie', 0), null);
    assert.equal(resolveDiceScale('bard', 'bardicDie', 1), '1d6');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 5), '1d8');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 10), '1d10');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 15), '1d12');

    assert.equal(resolveSongOfRestDie({ identity: { classes: [{ name: 'Bard', level: 1 }] } }), null);
    assert.equal(resolveSongOfRestDie({ identity: { classes: [{ name: 'Bard', level: 2 }] } }), '1d6');
    assert.equal(resolveSongOfRestDie({ combat: { traits: [{ name: 'Song of Rest' }] } }), '1d6');

    // Unlock at level 6 Genie Warlock
    const dLvl6 = {
        identity: { classes: [{ name: 'Warlock', subclass: 'Genie (Djinni)', level: 6 }] },
        combat: { traits: [], resources: [] }
    };
    const sync6 = detectClassFeaturesToSync(dLvl6);
    assert.ok(sync6.newResources.some(r => r.id === 'genie_vessel'));
    assert.ok(sync6.newResources.some(r => r.id === 'genie_elemental_gift'));

    // Stale detection when leveled down from 6 to 1
    const dLvl1WithStale = {
        identity: { classes: [{ name: 'Warlock', subclass: 'Genie (Djinni)', level: 1 }, { name: 'Bard', level: 1 }] },
        combat: {
            traits: [{ name: 'Font of Inspiration (Bard 5)' }],
            resources: [{ id: 'genie_elemental_gift' }, { id: 'countercharm' }]
        }
    };
    const syncStale = detectClassFeaturesToSync(dLvl1WithStale);
    assert.ok(syncStale.staleResourceIds.has('genie_elemental_gift'));
});

test('Armor Class (AC) Formulas: Unarmored, Light, Medium, Heavy, Custom & Shield', () => {
    const baseAttrs = {
        STR: { score: 14 }, DEX: { score: 18 }, CON: { score: 12 },
        INT: { score: 10 }, WIS: { score: 10 }, CHA: { score: 14 }
    }; // DEX mod = +4

    // 1. Unarmored: 10 + 4 = 14
    const unarmored = computeStats({ attributes: baseAttrs, inventory: { armors: [] } });
    assert.equal(unarmored.ac, 14);

    // 2. Medium armor caps DEX at +2: Breastplate (14) + 2 + Shield (2) = 18
    const mediumWithShield = computeStats({
        attributes: baseAttrs,
        inventory: {
            armors: [
                { name: 'Breastplate', type: 'medium', baseAc: 14, equipped: true },
                { name: 'Shield', type: 'shield', baseAc: 2, equipped: true }
            ]
        }
    });
    assert.equal(mediumWithShield.ac, 18);

    // 3. Heavy armor ignores DEX: Plate (18) = 18
    const heavy = computeStats({
        attributes: baseAttrs,
        inventory: {
            armors: [{ name: 'Plate', type: 'heavy', baseAc: 18, equipped: true }]
        }
    });
    assert.equal(heavy.ac, 18);

    // 4. Custom armor type with baseAc >= 10 adds DEX: Mage Armor (13 + 4 = 17)
    const customArmor = computeStats({
        attributes: baseAttrs,
        inventory: {
            armors: [{ name: 'Mage Armor', type: 'custom', baseAc: 13, equipped: true }]
        }
    });
    assert.equal(customArmor.ac, 17);
});

test('Skills, Silver Tongue, Reliable Talent, Item Advantages & Resistances', () => {
    const eloquenceRogue = sanitizeTracking({
        identity: {
            classes: [
                { name: 'Bard', subclass: 'College of Eloquence', level: 4 },
                { name: 'Rogue', subclass: 'Swashbuckler', level: 11 }
            ]
        },
        attributes: {
            STR: { score: 10, profSave: false },
            DEX: { score: 16, profSave: true },
            CON: { score: 14, profSave: false },
            INT: { score: 12, profSave: false },
            WIS: { score: 12, profSave: false },
            CHA: { score: 18, profSave: true }
        },
        vitals: {
            damageResistances: ['fire']
        },
        skills: [
            { id: 'persuasion', name: 'Persuasion', attr: 'CHA', profType: 'P', note: 'Advantage on diplomatic checks' },
            { id: 'stealth', name: 'Stealth', attr: 'DEX', profType: 'C' },
            { id: 'athletics', name: 'Athletics', attr: 'STR', profType: '', minTen: true, minTenSource: 'Boon' }
        ],
        combat: {
            traits: [
                { name: 'Silver Tongue', desc: 'Min 10 on Persuasion and Deception.' },
                { name: 'Reliable Talent', desc: 'Min 10 on proficient ability checks.' },
                { name: 'Infernal Legacy', desc: 'You have resistance to cold and poison damage.' },
                { name: "Genie's Wrath", badge: '+{{PB}} Thunder', desc: 'Extra thunder damage.' }
            ]
        },
        inventory: {
            armors: [
                {
                    name: 'Gloves of Dexterity',
                    type: 'accessory',
                    equipped: true,
                    resistances: ['fire', 'lightning'],
                    advantageAttrs: ['DEX'],
                    advantageSaves: ['WIS'],
                    statBonuses: {
                        attr: 'CHA',
                        attrMode: 'advantage',
                        saveType: 'DEX',
                        saveMode: 'advantage',
                        spellDC: 1,
                        spellAtk: 1
                    }
                }
            ]
        }
    });

    const stats = computeStats(eloquenceRogue);
    const persuasion = stats.computedSkills.find(s => s.id === 'persuasion');
    const stealth = stats.computedSkills.find(s => s.id === 'stealth');
    const athletics = stats.computedSkills.find(s => s.id === 'athletics');

    assert.ok(persuasion.minVal >= 10);
    assert.ok(persuasion.minTenSource.includes('Silver Tongue'));
    assert.equal(persuasion.hasAdvantage, true);

    assert.ok(stealth.minVal >= 10);
    assert.ok(stealth.minTenSource.includes('Reliable Talent'));
    assert.equal(stealth.hasAdvantage, true); // Inherited from DEX advantageAttrs

    assert.ok(athletics.minVal >= 10);
    assert.equal(athletics.minTenSource, 'Boon');

    assert.equal(stats.computedAttrs.DEX.hasSaveAdvantage, true);
    assert.equal(stats.computedAttrs.WIS.hasSaveAdvantage, true);

    // Resistances from vitals ('fire'), trait ('cold', 'poison'), and item ('fire', 'lightning')
    const resIds = stats.resistances.map(r => r.id);
    assert.ok(resIds.includes('fire'));
    assert.ok(resIds.includes('cold'));
    assert.ok(resIds.includes('poison'));
    assert.ok(resIds.includes('lightning'));
});

test('Spell Parser, Cantrip Scaling & Higher-Level Slot Scaling', () => {
    assert.equal(clean5eToolsText(['Line 1', { name: 'Sub', entries: ['{@dice 1d6}'] }]), 'Line 1\n\nSub:\n1d6');

    const count = buildSpellsCompendium();
    assert.ok(count > 0);
    assert.ok(findSpellInCompendium('Eldritch Blast'));
    assert.equal(findSpellInCompendium('NonExistentSpell12345'), null);

    // 1. scalingLevelDice cantrip
    const viciousComp = {
        damage: '1d4',
        scalingLevelDice: { scaling: { '1': '1d4', '5': '2d4', '11': '3d4', '17': '4d4' } }
    };
    assert.equal(resolveScaledSpellDamage(viciousComp, {}, 5, 0), '2d4');
    assert.equal(resolveScaledSpellDamage(viciousComp, {}, 11, 0), '3d4');

    // 2. multiBeamCantrip (Eldritch Blast)
    const ebComp = { damage: '1d10', multiBeamCantrip: true };
    assert.equal(resolveScaledSpellDamage(ebComp, {}, 1, 0), '1d10');
    assert.equal(resolveScaledSpellDamage(ebComp, {}, 5, 0), '2×1d10');
    assert.equal(resolveScaledSpellDamage(ebComp, {}, 17, 0), '4×1d10');

    // 3. Standard cantrip scaling mentioning "5th level"
    const fireBoltComp = { damage: '1d10', desc: 'This spell damage increases at 5th level.' };
    assert.equal(resolveScaledSpellDamage(fireBoltComp, {}, 11, 0), '3d10');

    // 4. calculateSlotDamage with mismatched dice faces falls back to (+N×scaleDice)
    assert.equal(calculateSlotDamage('2d8', '1d6', 1, 3), '2d8 (+2×1d6)');
});

test('Alpine Component State & Lifecycle Actions (createCharacterSheet)', async () => {
    const sheet = createCharacterSheet();
    sheet.init();

    // Test built-in dialog promise lifecycle before stubbing
    const pAlert = sheet.uiAlert('Test msg', 'Title');
    assert.equal(sheet.modalDialog.open, true);
    sheet.resolveDialog(true);
    await pAlert;

    const pPrompt = sheet.uiPrompt('Prompt msg', 'Title', 'DefaultVal');
    sheet.resolveDialog(true);
    assert.equal(await pPrompt, 'DefaultVal');

    // Auto-resolve dialogs in headless unit test mode
    sheet.uiAlert = async () => true;
    sheet.uiConfirm = async () => true;
    sheet.uiPrompt = async () => 'Goblin Ambush';

    assert.ok(sheet.compendiumCount > 0);
    assert.ok(sheet.stats.totalLevel >= 1);
    assert.ok(sheet.allCompendiumSpellsList.length > 0);
    assert.ok(sheet.allDamageTypesList.length > 0);
    assert.equal(sheet.allSkillsList.length, 18);
    assert.ok(sheet.availableCompendiumClasses.length > 0);
    assert.ok(Array.isArray(sheet.computedCombatResources));
    assert.ok(Array.isArray(sheet.computedTraits));
    assert.ok(Array.isArray(sheet.progressionTrees));
    assert.ok(Array.isArray(sheet.filteredBackgrounds));
    assert.ok(Array.isArray(sheet.filteredSpells));
    assert.ok(Array.isArray(sheet.filteredCompendiumSpells));
    assert.ok(Array.isArray(sheet.actionCantrips));
    assert.ok(Array.isArray(sheet.bonusSpells));
    assert.ok(Array.isArray(sheet.reactionSpells));
    assert.ok(Array.isArray(sheet.dynamicBonusActions));
    const bardicBonus = sheet.dynamicBonusActions.find(a => normalizeKey(a.name).includes('bardicinspiration'));
    assert.ok(bardicBonus, 'Bardic Inspiration should be present in dynamicBonusActions');
    assert.ok(!bardicBonus.name.includes('{{'), 'Bardic Inspiration name should interpolate {{bardicDie}}');
    assert.ok(!bardicBonus.desc.includes('{{'), 'Bardic Inspiration desc should not contain {{');
    assert.ok(bardicBonus.desc.includes('Short/Long Rest reset'), 'Bard level 5 should have Short/Long Rest reset');

    assert.ok(Array.isArray(sheet.dynamicReactionActions));
    assert.ok(Array.isArray(sheet.bonusResourcesAndTraits));
    assert.ok(sheet.shortRestHealingBonus !== undefined);
    assert.ok(sheet.primaryHitDie);

    // Filter tabs
    ['action', 'bonus', 'reaction', 'conc', 'all'].forEach(f => {
        sheet.currentSpellFilter = f;
        assert.ok(Array.isArray(sheet.filteredSpells));
    });

    // Background compendium search & detail
    sheet.backgroundSearchQuery = 'entertainer';
    assert.ok(Array.isArray(sheet.filteredBackgrounds));
    sheet.showCurrentBackgroundDetail();
    assert.equal(sheet.modalBackgroundsOpen, true);

    // Verify template placeholders are interpolated in computedTraits
    sheet.data.combat.traits.push({
        name: 'Test Interpolation',
        desc: 'PB {{PB}}, DC {{DC}}, Atk {{spellAtk}}, Bardic {{bardicDie}}, Song {{songOfRestDie}}, Vessel {{vesselHours}}h'
    });
    const interpTrait = sheet.computedTraits.find(t => t.name === 'Test Interpolation');
    assert.ok(!interpTrait.displayDesc.includes('{{'));

    // Resource, Spell Slot & Hit Die toggles + Log actions
    sheet.onToggleResourceSlot(0, 0);
    sheet.onToggleSpellSlot(0, 0);
    sheet.onToggleHitDie(0);
    const logId = sheet.data.sessionLog[0]?.id;
    await sheet.editLogComment(logId);
    sheet.removeLogEntry(logId);
    await sheet.clearSessionLog();
    assert.equal(sheet.data.sessionLog.length, 0);

    // Concentration override modal flow
    sheet.requestCastConcentration('Hex');
    assert.equal(sheet.isConcentratingOn('Hex'), true);
    sheet.requestCastConcentration('Faerie Fire');
    assert.equal(sheet.modalConcOverrideOpen, true);
    sheet.closeConcentrationModal(true);
    assert.equal(sheet.isConcentratingOn('Faerie Fire'), true);

    // HP Manager: Temp HP, Resisted Damage, Concentration & Healing
    sheet.applyTempHp(5);
    assert.equal(sheet.data.vitals.tempHp, 5);

    sheet.openHpManager('damage');
    sheet.hpManagerAmount = 10;
    sheet.hpManagerResistedAmount = 6; // 4 normal + floor(6/2)=3 = 7 total damage
    assert.equal(sheet.damageCalculation.finalDamage, 7);

    const hpBefore = sheet.data.vitals.currentHp;
    sheet.applyHpManagerAction();
    // 5 absorbed by tempHp, 2 applied to currentHp
    assert.equal(sheet.data.vitals.tempHp, 0);
    assert.equal(sheet.data.vitals.currentHp, Math.max(0, hpBefore - 2));

    sheet.openHpManager('heal');
    sheet.hpManagerAmount = 2;
    sheet.applyHpManagerAction();
    assert.equal(sheet.data.vitals.currentHp, hpBefore);

    // Dropping to 0 HP breaks concentration
    sheet.applyDamage(999);
    assert.equal(sheet.data.vitals.currentHp, 0);
    assert.equal(sheet.data.concentration.active, false);

    // Death saves & healing from 0 resets death saves
    sheet.data.deathSaves.successes = [true, true, true];
    sheet.onDeathSaveChange('success', 2);
    sheet.data.deathSaves.failures = [true, true, true];
    sheet.onDeathSaveChange('failure', 2);
    sheet.applyHeal(10);
    assert.deepEqual(sheet.data.deathSaves.failures, [false, false, false]);

    // Conditions & incapacitation breaking concentration
    sheet.setConcentration('Faerie Fire');
    await sheet.toggleCondition('paralyzed');
    assert.equal(sheet.hasCondition('paralyzed'), true);
    assert.equal(sheet.getConditionSource('paralyzed'), 'Goblin Ambush');
    assert.equal(sheet.data.concentration.active, false);
    assert.equal(sheet.activeConditionsList.length, 1);
    sheet.showConditionDetail(sheet.activeConditionsList[0]);
    sheet.clearCondition('paralyzed');
    assert.equal(sheet.hasCondition('paralyzed'), false);
    sheet.clearAllConditions();

    // Wealth management (add & spend)
    sheet.openWealthModal('add');
    sheet.wealthForm = { gp: 50, sp: 10, ep: 0, cp: 5, reason: 'Quest reward' };
    const gpBefore = sheet.data.inventory.wealth.gp || 0;
    await sheet.applyWealthChange();
    assert.equal(sheet.data.inventory.wealth.gp, gpBefore + 50);

    sheet.openWealthModal('spend');
    sheet.wealthForm = { gp: 20, sp: 0, ep: 0, cp: 0, reason: 'Potion' };
    await sheet.applyWealthChange();
    assert.equal(sheet.data.inventory.wealth.gp, gpBefore + 30);

    // Weapons, Armors, Story Items, Consumables & Tools CRUD (Add, Edit & Remove)
    sheet.openWeaponModal();
    sheet.weaponForm = { name: 'Sunblade', attrMode: 'finesse', dice: '1d8', damageType: 'Radiant', propsRaw: 'Finesse, Versatile' };
    sheet.handleSaveWeapon();
    const wIdx = sheet.data.inventory.weapons.length - 1;
    sheet.openWeaponModal(wIdx);
    sheet.weaponForm.name = 'Sunblade +2';
    sheet.handleSaveWeapon();
    assert.ok(sheet.data.inventory.weapons.some(w => w.name === 'Sunblade +2'));
    await sheet.removeWeapon(wIdx);

    sheet.openArmorModal();
    sheet.armorForm.name = 'Staff of Fire';
    sheet.armorForm.type = 'accessory';
    sheet.armorForm.baseAc = 1;
    sheet.armorForm.bonusAttr = 'CHA';
    sheet.armorForm.attrMode = 'bonus';
    sheet.armorForm.bonusAttrVal = 2;
    sheet.armorForm.saveType = 'ALL';
    sheet.armorForm.saveMode = 'bonus';
    sheet.armorForm.saveVal = 1;
    sheet.armorForm.equipped = true;
    sheet.selectedSpellToAdd = 'Fireball';
    sheet.addSpellToArmorForm();
    sheet.selectedResToAdd = 'psychic';
    sheet.addResToArmorForm();
    sheet.selectedSkillAdvToAdd = 'acrobatics';
    sheet.addSkillAdvToArmorForm();
    sheet.handleSaveArmor();
    const aIdx = sheet.data.inventory.armors.length - 1;
    assert.ok(sheet.allResolvedSpells.some(s => s.name === 'Fireball' && s.isItemGranted));
    sheet.openArmorModal(aIdx);
    sheet.removeSpellFromArmorForm(0);
    sheet.removeResFromArmorForm(0);
    sheet.removeSkillAdvFromArmorForm(0);
    sheet.handleSaveArmor();
    await sheet.removeArmor(aIdx);

    sheet.openConsumableModal();
    sheet.consumableForm = { name: 'Healing Potion', qty: '2' };
    sheet.handleSaveConsumable();
    const consIdx = sheet.data.inventory.consumables.length - 1;
    sheet.openConsumableModal(consIdx);
    sheet.handleSaveConsumable();
    sheet.adjustConsumableQty(consIdx, -1);
    assert.equal(sheet.data.inventory.consumables[consIdx].qty, '1');
    sheet.adjustConsumableQty(consIdx, 2);
    assert.equal(sheet.data.inventory.consumables[consIdx].qty, '3');
    await sheet.removeConsumable(consIdx);

    sheet.openStoryItemModal();
    sheet.storyItemForm.name = 'Ancient Signet';
    sheet.storyItemForm.equipped = true;
    sheet.storyItemForm.bonusAttr = 'DEX';
    sheet.storyItemForm.attrMode = 'bonus';
    sheet.storyItemForm.bonusAttrVal = 1;
    sheet.storyItemForm.saveType = 'WIS';
    sheet.storyItemForm.saveMode = 'bonus';
    sheet.storyItemForm.saveVal = 1;
    sheet.storySpellToAdd = 'Fly';
    sheet.addSpellToStoryForm();
    sheet.storyResToAdd = 'force';
    sheet.addResToStoryForm();
    sheet.storySkillAdvToAdd = 'history';
    sheet.addSkillAdvToStoryForm();
    sheet.handleSaveStoryItem();
    const stIdx = sheet.data.inventory.story.length - 1;
    sheet.openStoryItemModal(stIdx);
    sheet.removeSpellFromStoryForm(0);
    sheet.removeResFromStoryForm(0);
    sheet.removeSkillAdvFromStoryForm(0);
    sheet.handleSaveStoryItem();
    sheet.toggleEquipItem(sheet.data.inventory.story[stIdx]);
    await sheet.removeStoryItem(stIdx);

    sheet.openToolModal();
    sheet.toolForm = { name: 'Lute of Illusions', desc: 'Magical instrument', icon: '🎵', isInstrument: true };
    sheet.handleSaveTool();
    const tIdx = sheet.data.inventory.tools.length - 1;
    sheet.openToolModal(tIdx);
    sheet.handleSaveTool();
    await sheet.removeTool(tIdx);

    // Spell Management & Casting
    sheet.openAddSpellModal();
    sheet.addSpellFromCompendium({ name: 'Counterspell' });
    sheet.spellManualForm = {
        name: 'Arcane Surge',
        level: 1,
        actionType: 'bonus',
        range: '30 ft',
        duration: '1 min',
        damage: '2d6',
        conc: true,
        desc: 'Test bonus spell',
        source: 'Bard'
    };
    sheet.handleSaveManualSpell();
    sheet.toggleSpellFavorite('Arcane Surge');
    assert.equal(sheet.isSpellFavorite('Arcane Surge'), true);
    assert.ok(sheet.favoriteSpells.some(s => s.name === 'Arcane Surge'));
    sheet.openSpellDetail(sheet.favoriteSpells[0]);

    sheet.openCastSpellModal('Arcane Surge');
    await sheet.executeCastSpell();
    assert.equal(sheet.isConcentratingOn('Arcane Surge'), true);
    await sheet.removeSpell('Arcane Surge');

    // Level Up, Multiclass Form, Sync & Short / Long Rest / Reset
    sheet.openLevelUpModal();
    const prevTotalLvl = sheet.stats.totalLevel;
    sheet.levelUpClass(0, 1);
    sheet.levelUpForm.newClassName = 'Paladin';
    sheet.onNewClassSelected();
    sheet.addNewClassToLevelUpForm();
    sheet.removeClassFromLevelUpForm(sheet.levelUpForm.classes.length - 1);
    sheet.handleSaveLevelUp();
    assert.equal(sheet.stats.totalLevel, prevTotalLvl + 1);

    sheet.syncClassFeatures();
    sheet.openShortRestModal();
    await sheet.applyShortRest(1);
    assert.equal(sheet.data.vitals.hitDiceSpent.filter(Boolean).length, 1);

    await sheet.executeLongRest();
    assert.equal(sheet.data.vitals.currentHp, sheet.data.vitals.maxHp);
    assert.equal(sheet.data.vitals.hitDiceSpent.filter(Boolean).length, 0);

    await sheet.resetDefaults();
});

test('Data Constants & File Content Parsing', () => {
    assert.ok(Array.isArray(DND_CONDITIONS) && DND_CONDITIONS.length > 0);
    assert.ok(Array.isArray(DAMAGE_TYPES) && DAMAGE_TYPES.length > 0);
    assert.equal(DND_5E_SKILLS.length, 18);

    const parsed = parseCharacterFileContent('{"identity":{"name":"Dorian"}}');
    assert.equal(parsed.identity.name, 'Dorian');
    assert.throws(() => parseCharacterFileContent(''), /Empty file/);
});

test('Refactored Domain Helpers: TemplateHelper, ItemBonusHelper, StorageService & applyClassFeaturesSync', () => {
    // 1. TemplateHelper
    const template = 'DC {{DC}}, Atk {{spellAtk}}, PB {{PB}}, Die {{bardicDie}}, Song {{songOfRestDie}}, Vessel {{vesselHours}}h';
    const interpolated = TemplateHelper.interpolate(template, {
        pb: 3,
        spellDC: 15,
        spellAtk: '+7',
        bardicDie: '1d8',
        songOfRestDie: '1d6',
        vesselHours: 6
    });
    assert.equal(interpolated, 'DC 15, Atk +7, PB +3, Die 1d8, Song 1d6, Vessel 6h');
    assert.equal(TemplateHelper.interpolate(null), '');

    // 2. ItemBonusHelper
    const form = {
        bonusAttr: 'STR',
        attrMode: 'bonus',
        bonusAttrVal: 2,
        saveType: 'DEX',
        saveMode: 'bonus',
        saveVal: 1
    };
    const parsedBonuses = ItemBonusHelper.parseStatBonuses(form);
    assert.deepEqual(parsedBonuses, {
        attr: 'STR',
        attrMode: 'bonus',
        STR: 2,
        attrVal: 2,
        saveType: 'DEX',
        saveMode: 'bonus',
        saveVal: 1
    });

    const list = [];
    ItemBonusHelper.addUniqueItem(list, 'Shield');
    ItemBonusHelper.addUniqueItem(list, 'Shield'); // duplicate, should be ignored
    ItemBonusHelper.addUniqueItem(list, 'Misty Step');
    assert.deepEqual(list, ['Shield', 'Misty Step']);
    ItemBonusHelper.removeIndex(list, 0);
    assert.deepEqual(list, ['Misty Step']);

    // 3. StorageService fallback
    const fallback = { fallback: true };
    assert.deepEqual(StorageService.load('non_existent_key_xyz', fallback), fallback);

    // 4. applyClassFeaturesSync
    const mockChar = {
        identity: { classes: [{ name: 'Bard', level: 1 }] },
        magic: { slots: [] },
        combat: { resources: [], traits: [] },
        vitals: {}
    };
    const syncRes = applyClassFeaturesSync(mockChar);
    assert.ok(syncRes);
    assert.ok(Array.isArray(syncRes.newResources));
});

test('Inspiration, Custom Log Entry, Quests & Story, and Upcast Spell Deduction', async () => {
    const sheet = createCharacterSheet();
    sheet.init();

    // Headless test stubs
    sheet.uiAlert = async () => true;
    sheet.uiConfirm = async () => true;

    // 1. Inspiration points tracking & bounds
    sheet.data.vitals.inspiration = 0;
    sheet.adjustInspiration(1);
    assert.equal(sheet.data.vitals.inspiration, 1);
    assert.ok(sheet.data.sessionLog.some(l => l.title?.includes('Inspiration') || l.text?.includes('Inspiration')));

    sheet.adjustInspiration(2);
    assert.equal(sheet.data.vitals.inspiration, 3);

    sheet.adjustInspiration(-1);
    assert.equal(sheet.data.vitals.inspiration, 2);

    sheet.adjustInspiration(-5); // Clamps to 0
    assert.equal(sheet.data.vitals.inspiration, 0);

    // 2. Custom log entry (Story & notes in log)
    sheet.uiPrompt = async () => 'Found a hidden map behind the altar.';
    await sheet.addCustomLogEntry();
    assert.ok(sheet.data.sessionLog.some(l => l.text === 'Found a hidden map behind the altar.'));

    // Cancel prompt should not create log entry
    const logCountBefore = sheet.data.sessionLog.length;
    sheet.uiPrompt = async () => null;
    await sheet.addCustomLogEntry();
    assert.equal(sheet.data.sessionLog.length, logCountBefore);

    // 3. Quests & Campaign Story
    sheet.openQuestModal();
    assert.equal(sheet.modalQuestOpen, true);
    assert.equal(sheet.editingQuestId, null);

    sheet.questForm = {
        title: 'Find the Sunblade',
        desc: 'Hidden in the crypts beneath Ravenloft',
        location: 'Barovia',
        reward: '500 GP',
        status: 'active'
    };
    sheet.handleSaveQuest();
    assert.equal(sheet.modalQuestOpen, false);
    assert.equal(sheet.data.quests.length, 1);

    const q = sheet.data.quests[0];
    assert.equal(q.title, 'Find the Sunblade');
    assert.equal(q.status, 'active');
    assert.equal(sheet.activeQuestsCount, 1);
    assert.equal(sheet.completedQuestsCount, 0);

    // Filter testing
    sheet.questFilter = 'active';
    assert.equal(sheet.filteredQuests.length, 1);
    sheet.questFilter = 'completed';
    assert.equal(sheet.filteredQuests.length, 0);

    // Toggle status
    sheet.toggleQuestStatus(q.id);
    assert.equal(q.status, 'completed');
    assert.equal(sheet.activeQuestsCount, 0);
    assert.equal(sheet.completedQuestsCount, 1);
    assert.equal(sheet.filteredQuests.length, 1);

    // Edit quest
    sheet.openQuestModal(q);
    assert.equal(sheet.editingQuestId, q.id);
    assert.equal(sheet.questForm.title, 'Find the Sunblade');
    sheet.questForm.title = 'Find the Sunblade & Destroy Strahd';
    sheet.handleSaveQuest();
    assert.equal(sheet.data.quests[0].title, 'Find the Sunblade & Destroy Strahd');

    // Campaign notes
    sheet.data.campaignNotes = 'Session 1: The party met at the Blood on the Vine tavern.';
    sheet.saveCampaignNotes();
    assert.equal(sheet.data.campaignNotes, 'Session 1: The party met at the Blood on the Vine tavern.');

    // Remove quest
    await sheet.removeQuest(q.id);
    assert.equal(sheet.data.quests.length, 0);

    // 4. Upcast spell slot deduction
    sheet.data.magic = {
        slots: [
            { level: '1st Level', spent: [false, false, false, false], max: 4 },
            { level: '2nd Level', spent: [false, false, false], max: 3 }
        ],
        spells: [
            {
                name: 'Dissonant Whispers',
                level: 1,
                damage: '3d6',
                higherLevelScale: '+1d6',
                actionType: 'action'
            }
        ]
    };

    sheet.openCastSpellModal('Dissonant Whispers');
    assert.equal(sheet.modalCastSpellOpen, true);
    assert.ok(sheet.castSpellSlotOptions.length >= 2);

    const lvl1Opt = sheet.castSpellSlotOptions.find(o => o.slotLevel === 1);
    const lvl2Opt = sheet.castSpellSlotOptions.find(o => o.slotLevel === 2);
    assert.ok(lvl1Opt);
    assert.ok(lvl2Opt);
    assert.ok(lvl2Opt.scaledDamage.includes('+1d6')); // 3d6 scaled with +1d6 upcast

    // Select upcast 2nd level slot option
    sheet.castSpellForm.selectedSlotKey = lvl2Opt.key;
    sheet.castSpellForm.slotKey = lvl2Opt.key;
    assert.equal(sheet.selectedCastSlotOption.slotIndex, 1);

    const lvl1SpentBefore = sheet.data.magic.slots[0].spent.filter(Boolean).length;
    const lvl2SpentBefore = sheet.data.magic.slots[1].spent.filter(Boolean).length;

    await sheet.executeCastSpell();

    const lvl1SpentAfter = sheet.data.magic.slots[0].spent.filter(Boolean).length;
    const lvl2SpentAfter = sheet.data.magic.slots[1].spent.filter(Boolean).length;

    // Must deduct from 2nd Level slot (slotIndex 1), NOT 1st Level slot (slotIndex 0)
    assert.equal(lvl1SpentAfter, lvl1SpentBefore, '1st level slots should not be deducted');
    assert.equal(lvl2SpentAfter, lvl2SpentBefore + 1, '2nd level slot must be deducted for upcast');
});

test('Decoupled Feature Architecture: ClassFeatureProvider, Generic calculateSkills & RaceProvider', () => {
    // 1. ClassFeatureProvider: Pure resolution of skill modifier rules
    const bardChar = {
        identity: { classes: [{ name: 'Bard', level: 3, subclass: 'Eloquence' }] },
        combat: { traits: [{ name: 'Silver Tongue' }, { name: 'Jack of All Trades' }] }
    };
    const bardRules = ClassFeatureProvider.resolveSkillRules(bardChar, 3);
    assert.equal(bardRules.hasJackOfAllTrades, true);
    assert.equal(bardRules.jackOfAllTrades, 1); // floor(3 / 2)
    assert.equal(bardRules.minRollRules.length, 1);
    assert.ok(bardRules.minRollRules[0].applies({ id: 'persuasion' }));
    assert.ok(bardRules.minRollRules[0].applies({ id: 'deception' }));
    assert.ok(!bardRules.minRollRules[0].applies({ id: 'stealth' }));

    const rogueChar = {
        identity: { classes: [{ name: 'Rogue', level: 11 }] },
        combat: { traits: [{ name: 'Reliable Talent' }] }
    };
    const rogueRules = ClassFeatureProvider.resolveSkillRules(rogueChar, 4);
    assert.equal(rogueRules.hasJackOfAllTrades, false);
    assert.equal(rogueRules.jackOfAllTrades, 0);
    assert.equal(rogueRules.minRollRules.length, 1);
    assert.ok(rogueRules.minRollRules[0].applies({ id: 'stealth', profType: 'C' }));
    assert.ok(rogueRules.minRollRules[0].applies({ id: 'acrobatics', profType: 'P' }));
    assert.ok(!rogueRules.minRollRules[0].applies({ id: 'athletics', profType: '' }));

    // 2. Generic calculateSkills: Decoupled from hardcoded classes
    const mockSkills = [
        { id: 'arcana', name: 'Arcana', attr: 'INT', profType: '' },
        { id: 'history', name: 'History', attr: 'INT', profType: 'C' }
    ];
    const mockAttrs = { INT: { mod: 3, modStr: '+3', hasAttrAdvantage: false } };
    const customRule = {
        minRoll: 10,
        source: 'Chronomancy Boon',
        desc: 'Minimum 10 on Arcana checks',
        applies: s => s.id === 'arcana'
    };
    const computed = calculateSkills(
        mockSkills,
        mockAttrs,
        2,
        { jackOfAllTrades: 1, minRollRules: [customRule] },
        []
    );
    const arcana = computed.find(s => s.id === 'arcana');
    const history = computed.find(s => s.id === 'history');

    // Arcana: non-proficient + Jack of all trades (+1) + INT (+3) = +4. MinVal = 10 + 4 = 14
    assert.equal(arcana.valNum, 4);
    assert.equal(arcana.minVal, 14);
    assert.equal(arcana.minTenSource, 'Chronomancy Boon');

    // History: proficient (C) + INT (+3) + PB (+2) = +5. No minVal
    assert.equal(history.valNum, 5);
    assert.equal(history.minVal, null);

    // 3. RaceProvider: Compendium lookup, subraces, traits & resistances
    const tiefling = RaceProvider.resolveRace('Tiefling (Glasya)');
    assert.equal(tiefling.baseKey, 'tiefling');
    assert.equal(tiefling.subraceKey, 'glasya');
    assert.equal(tiefling.speed, '30 ft.');
    assert.equal(tiefling.darkvision, 60);
    assert.deepEqual(tiefling.resistances, ['fire']);
    assert.ok(tiefling.traits.some(t => t.name.includes('Legacy of Malbolge') || t.name === 'Darkvision'));
    assert.ok(tiefling.innateSpells.some(s => s.name === 'Minor Illusion'));

    const highElf = RaceProvider.resolveRace('High Elf');
    assert.equal(highElf.baseKey, 'elf');
    assert.equal(highElf.subraceKey, 'high');
    assert.ok(highElf.traits.some(t => t.name === 'Elf Weapon Training' || t.name === 'Cantrip'));

    const elf = RaceProvider.resolveRace('Wood Elf');
    assert.equal(elf.baseKey, 'elf');
    assert.equal(elf.subraceKey, 'wood');
    assert.equal(elf.speed, '35 ft.'); // Wood elf racial speed
    assert.ok(elf.traits.some(t => t.name === 'Fleet of Foot'));

    const dwarf = RaceProvider.resolveRace('Hill Dwarf');
    assert.equal(dwarf.baseKey, 'dwarf');
    assert.equal(dwarf.subraceKey, 'hill');
    assert.deepEqual(dwarf.resistances, ['poison']);
    assert.equal(dwarf.speed, '25 ft.');

    const unknownRace = RaceProvider.resolveRace('Homebrew Golem');
    assert.equal(unknownRace.baseKey, null);
    assert.equal(unknownRace.speed, '30 ft.');
    assert.deepEqual(unknownRace.resistances, []);

    // 4. Resistance resolution driven by RaceProvider
    const raceChar = {
        identity: { race: 'Hill Dwarf' },
        combat: { traits: [] },
        vitals: {},
        inventory: {}
    };
    const resList = resolveCharacterResistances(raceChar);
    assert.ok(resList.some(r => r.id === 'poison' && r.source.includes('Race: Hill Dwarf')));

    // 5. computeStats integration: stats.raceInfo is populated
    const stats = computeStats({
        identity: {
            race: 'Tiefling (Glasya)',
            classes: [{ name: 'Bard', level: 1 }]
        },
        attributes: {},
        vitals: {},
        combat: {},
        skills: [],
        inventory: {}
    });
    assert.ok(stats.raceInfo);
    assert.equal(stats.raceInfo.baseKey, 'tiefling');
    assert.equal(stats.raceInfo.subraceKey, 'glasya');
    assert.ok(stats.resistances.some(r => r.id === 'fire' && r.source.includes('Tiefling')));
});

test('Modular Architecture: UI Slices Composition & HTML Template Build', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Verify composeSlices helper preserves dynamic getter reactivity
    const { composeSlices } = await import('../src/helpers/slice.helper.js');
    const target = { baseVal: 10 };
    const sliceA = {
        multiplier: 2,
        get computedVal() {
            return this.baseVal * this.multiplier;
        }
    };
    const sliceB = {
        action() {
            return this.computedVal + 5;
        }
    };
    composeSlices(target, sliceA, sliceB);
    assert.equal(target.computedVal, 20);
    target.baseVal = 20;
    assert.equal(target.computedVal, 40); // Dynamic getter evaluation preserved!
    assert.equal(target.action(), 45);

    // 2. Verify all 5 UI state slice factories exist and return valid slices
    const { createQuestsSlice } = await import('../src/ui/slices/quests.slice.js');
    const { createProgressionSlice } = await import('../src/ui/slices/progression.slice.js');
    const { createVitalsSlice } = await import('../src/ui/slices/vitals.slice.js');
    const { createInventorySlice } = await import('../src/ui/slices/inventory.slice.js');
    const { createSpellsSlice } = await import('../src/ui/slices/spells.slice.js');

    assert.equal(typeof createQuestsSlice, 'function');
    assert.equal(typeof createProgressionSlice, 'function');
    assert.equal(typeof createVitalsSlice, 'function');
    assert.equal(typeof createInventorySlice, 'function');
    assert.equal(typeof createSpellsSlice, 'function');

    // 3. Verify HTML template modular files (5 tabs + 17 modals + index.template.html)
    const templatesDir = path.resolve('src/templates');
    const requiredTabs = ['tab-profile.html', 'tab-combat.html', 'tab-inventory.html', 'tab-progression.html', 'tab-quests.html'];
    for (const tab of requiredTabs) {
        const tabPath = path.join(templatesDir, 'tabs', tab);
        assert.ok(fs.existsSync(tabPath), `Missing tab template: ${tab}`);
        const content = fs.readFileSync(tabPath, 'utf8');
        assert.ok(content.length > 50, `Tab template empty: ${tab}`);
    }

    const requiredModals = [
        'modal-dialog.html', 'modal-conc-override.html', 'modal-short-rest.html',
        'modal-weapon.html', 'modal-armor.html', 'modal-hp.html',
        'modal-conditions.html', 'modal-log.html', 'modal-backgrounds.html',
        'modal-consumable.html', 'modal-story-item.html', 'modal-tool.html',
        'modal-spell-add.html', 'modal-level-up.html', 'modal-cast-spell.html',
        'modal-wealth.html', 'modal-quest.html'
    ];
    for (const modal of requiredModals) {
        const modalPath = path.join(templatesDir, 'modals', modal);
        assert.ok(fs.existsSync(modalPath), `Missing modal template: ${modal}`);
        const content = fs.readFileSync(modalPath, 'utf8');
        assert.ok(content.length > 20, `Modal template empty: ${modal}`);
    }

    const indexTemplatePath = path.join(templatesDir, 'index.template.html');
    assert.ok(fs.existsSync(indexTemplatePath), 'Missing index.template.html');
    const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');
    assert.ok(indexTemplate.includes('<!-- @include "tabs/tab-profile.html" -->'));
    assert.ok(indexTemplate.includes('<!-- @include "modals/modal-quest.html" -->'));

    // 4. Verify compiled index.html
    const compiledIndexPath = path.resolve('src/index.html');
    assert.ok(fs.existsSync(compiledIndexPath), 'Compiled src/index.html should exist');
    const compiledHtml = fs.readFileSync(compiledIndexPath, 'utf8');
    assert.ok(compiledHtml.includes('x-show="activeTab === \'profile\'"'));
    assert.ok(compiledHtml.includes('x-show="activeTab === \'quests\'"'));
    assert.ok(compiledHtml.includes('x-show="modalQuestOpen"'));
});

test('Phase B Calculations (PHB/XGE/TCE/MTF) & Centralized DND_CONSTANTS', async () => {
    const {
        DND_CONSTANTS,
        resolveSneakAttackDie,
        resolveMartialArtsDie,
        resolveSuperiorityDie,
        resolveRageDamage,
        resolvePsionicEnergyDie
    } = await import('../src/app.js');
    const { calculateArmorClass } = await import('../src/domain/calculators/ac.calculator.js');
    const { calculateWeapons } = await import('../src/domain/calculators/weapons.calculator.js');

    // 1. Centralized constants verification
    assert.equal(DND_CONSTANTS.BASE_UNARMORED_AC, 10);
    assert.equal(DND_CONSTANTS.DRACONIC_RESILIENCE_BASE_AC, 13);
    assert.equal(DND_CONSTANTS.BASE_SPELL_SAVE_DC, 8);
    assert.equal(DND_CONSTANTS.LAY_ON_HANDS_HP_PER_LEVEL, 5);
    assert.equal(DND_CONSTANTS.MEDIUM_ARMOR_MAX_DEX_BONUS, 2);

    // 2. Scaling Dice (Sneak Attack, Martial Arts, Superiority, Rage, Psionic)
    assert.equal(resolveSneakAttackDie({ identity: { classes: [{ name: 'Rogue', level: 1 }] } }), '1d6');
    assert.equal(resolveSneakAttackDie({ identity: { classes: [{ name: 'Rogue', level: 5 }] } }), '3d6');
    assert.equal(resolveSneakAttackDie({ identity: { classes: [{ name: 'Rogue', level: 19 }] } }), '10d6');

    assert.equal(resolveMartialArtsDie({ identity: { classes: [{ name: 'Monk', level: 1 }] } }), '1d4');
    assert.equal(resolveMartialArtsDie({ identity: { classes: [{ name: 'Monk', level: 5 }] } }), '1d6');
    assert.equal(resolveMartialArtsDie({ identity: { classes: [{ name: 'Monk', level: 11 }] } }), '1d8');
    assert.equal(resolveMartialArtsDie({ identity: { classes: [{ name: 'Monk', level: 17 }] } }), '1d10');

    assert.equal(resolveSuperiorityDie({ identity: { classes: [{ name: 'Fighter', level: 3 }] } }), '1d8');
    assert.equal(resolveSuperiorityDie({ identity: { classes: [{ name: 'Fighter', level: 10 }] } }), '1d10');
    assert.equal(resolveSuperiorityDie({ identity: { classes: [{ name: 'Fighter', level: 18 }] } }), '1d12');

    assert.equal(resolveRageDamage({ identity: { classes: [{ name: 'Barbarian', level: 1 }] } }), '+2');
    assert.equal(resolveRageDamage({ identity: { classes: [{ name: 'Barbarian', level: 9 }] } }), '+3');
    assert.equal(resolveRageDamage({ identity: { classes: [{ name: 'Barbarian', level: 16 }] } }), '+4');

    assert.equal(resolvePsionicEnergyDie({ identity: { classes: [{ name: 'Rogue', level: 5 }] } }), '1d8');

    // 3. Tactical Resource Pools (Ki, Sorcery, Lay on Hands, Rages, Channel Divinity, Superiority, Psionic)
    assert.equal(getResourceMaxUses({ usesKey: 'MONK_LEVEL' }, {}, 3, { identity: { classes: [{ name: 'Monk', level: 6 }] } }), 6);
    assert.equal(getResourceMaxUses({ usesKey: 'SORCERER_LEVEL' }, {}, 3, { identity: { classes: [{ name: 'Sorcerer', level: 8 }] } }), 8);
    assert.equal(getResourceMaxUses({ usesKey: 'PALADIN_LAY_ON_HANDS' }, {}, 3, { identity: { classes: [{ name: 'Paladin', level: 5 }] } }), 25);
    assert.equal(getResourceMaxUses({ usesKey: 'BARBARIAN_RAGES' }, {}, 2, { identity: { classes: [{ name: 'Barbarian', level: 6 }] } }), 4);
    assert.equal(getResourceMaxUses({ usesKey: 'CHANNEL_DIVINITY' }, {}, 3, { identity: { classes: [{ name: 'Cleric', level: 6 }] } }), 2);
    assert.equal(getResourceMaxUses({ usesKey: 'SUPERIORITY_DICE' }, {}, 3, { identity: { classes: [{ name: 'Fighter', level: 7 }] } }), 5);
    assert.equal(getResourceMaxUses({ usesKey: 'PB_X2' }, {}, 3), 6);

    // 4. Alternative Weapon Attack Attributes (Hex Warrior CHA, Battle Ready INT, Monk DEX)
    const sampleAttrs = {
        STR: { mod: 0 },
        DEX: { mod: 3 },
        INT: { mod: 4 },
        CHA: { mod: 5 }
    };

    // Hexblade Warlock uses CHA (+5) + PB (2) = +7 on Longsword
    const hexChar = { identity: { classes: [{ name: 'Warlock', subclass: 'Hexblade', level: 3 }] } };
    const hexWpns = calculateWeapons([{ name: 'Longsword', dice: '1d8', damageType: 'slashing' }], sampleAttrs, 2, hexChar);
    assert.equal(hexWpns[0].usedAttr, 'CHA');
    assert.equal(hexWpns[0].atkStr, '+7');

    // Battle Smith Artificer uses INT (+4) + PB (2) + Magic (1) = +7 on +1 Warhammer
    const bsChar = { identity: { classes: [{ name: 'Artificer', subclass: 'Battle Smith', level: 3 }] } };
    const bsWpns = calculateWeapons([{ name: 'Warhammer +1', dice: '1d8', damageType: 'bludgeoning' }], sampleAttrs, 2, bsChar);
    assert.equal(bsWpns[0].usedAttr, 'INT');
    assert.equal(bsWpns[0].atkStr, '+7');

    // Monk uses DEX (+3) + PB (2) = +5 on Quarterstaff
    const monkChar = { identity: { classes: [{ name: 'Monk', level: 2 }] } };
    const monkWpns = calculateWeapons([{ name: 'Quarterstaff', dice: '1d6', damageType: 'bludgeoning' }], sampleAttrs, 2, monkChar);
    assert.equal(monkWpns[0].usedAttr, 'DEX');
    assert.equal(monkWpns[0].atkStr, '+5');

    // 5. Expanded AC Formulas (Draconic Resilience, Barbarian, Monk, Bladesong) & Racial Extras
    const acAttrs = {
        DEX: { mod: 2, modStr: '+2' },
        CON: { mod: 3, modStr: '+3' },
        WIS: { mod: 4, modStr: '+4' },
        INT: { mod: 3, modStr: '+3' }
    };

    // Draconic Sorcerer: 13 + DEX (2) = 15
    const draconicChar = { identity: { classes: [{ name: 'Sorcerer', subclass: 'Draconic', level: 1 }] } };
    const draconicAc = calculateArmorClass([], [], acAttrs, draconicChar);
    assert.equal(draconicAc.ac, 15);

    // Barbarian Unarmored Defense: 10 + DEX (2) + CON (3) + Shield (2) = 17
    const barbChar = { identity: { classes: [{ name: 'Barbarian', level: 1 }] } };
    const barbAc = calculateArmorClass([{ name: 'Shield', type: 'shield', baseAc: 2, equipped: true }], [], acAttrs, barbChar);
    assert.equal(barbAc.ac, 17);

    // Monk Unarmored Defense: 10 + DEX (2) + WIS (4) = 16 (no shield)
    const monkAc = calculateArmorClass([], [], acAttrs, monkChar);
    assert.equal(monkAc.ac, 16);

    // Bladesinging Wizard: Light armor (12 + DEX 2) + Bladesong (INT 3) = 17
    const bladesingerChar = {
        identity: { classes: [{ name: 'Wizard', subclass: 'Bladesinging', level: 2 }] },
        combat: { bladesongActive: true }
    };
    const bladesongAc = calculateArmorClass([{ name: 'Studded Leather', type: 'light', baseAc: 12, equipped: true }], [], acAttrs, bladesingerChar);
    assert.equal(bladesongAc.ac, 17);

    // Dragonborn ancestry resistance & Hill Dwarf HP bonus
    const redDragonborn = RaceProvider.resolveRace('Dragonborn (Red)');
    assert.ok(redDragonborn.resistances.includes('fire'));

    const hillDwarf = RaceProvider.resolveRace('Hill Dwarf');
    assert.equal(hillDwarf.bonusHpPerLevel, 1);
});

test('Clean Architecture Refactoring & D&D 5e Rules Parity (Phase 1-4)', async () => {
    const { ABILITY_KEYS, DND_5E_SKILLS, MAX_ATTUNEMENT_SLOTS } = await import('../src/domain/constants/dnd.constants.js');
    const { CharacterSanitizerService } = await import('../src/domain/character/character-sanitizer.service.js');
    const { resolveCharacterResistances } = await import('../src/domain/calculators/resistances.calculator.js');

    // 1. Constants verification
    assert.deepEqual(ABILITY_KEYS, ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
    assert.equal(DND_5E_SKILLS.length, 18);
    assert.equal(MAX_ATTUNEMENT_SLOTS, 3);

    // 2. CharacterSanitizerService standalone purity
    const sanitized = CharacterSanitizerService.sanitize({
        identity: { classes: [{ name: 'bard', level: 6 }] },
        inventory: { wealth: { gp: 50 } }
    });
    assert.ok(sanitized.inventory.wealth.pp !== undefined, 'Sanitizer should initialize PP');
    assert.equal(sanitized.identity.classes[0].name, 'Bard');
    assert.equal(sanitized.vitals.hitDiceSpent.length, 6);

    // 3. Decoupled Resistances Calculator
    const charWithRes = {
        identity: { race: 'Tiefling' },
        vitals: { damageResistances: ['cold'] },
        combat: { traits: [] },
        inventory: { armors: [], story: [], weapons: [] }
    };
    const resList = resolveCharacterResistances(charWithRes);
    const ids = resList.map(r => r.id);
    assert.ok(ids.includes('fire'), 'Tiefling should grant Fire resistance');
    assert.ok(ids.includes('cold'), 'Vitals should grant Cold resistance');

    // 4. Component Attunement & Wealth Platinum Management
    const sheet = createCharacterSheet();
    assert.equal(sheet.maxAttunementSlots, 3);
    assert.equal(sheet.attunedCount, 0);

    // Wealth change with Platinum
    sheet.wealthManagerMode = 'add';
    sheet.wealthForm = { pp: 5, gp: 10, sp: 0, ep: 0, cp: 0, reason: 'Treasure' };
    sheet.applyWealthChange();
    assert.equal(sheet.data.inventory.wealth.pp, 5);
    assert.equal(sheet.data.inventory.wealth.gp, 440);

    // 5. D&D 5e RAW Long Rest: regains up to half of total Hit Dice (min 1)
    // Spend 4 out of 6 Hit Dice
    sheet.data.vitals.hitDiceSpent = [true, true, true, true, false, false];
    // Mock uiConfirm to always return true
    sheet.uiConfirm = async () => true;
    sheet.uiAlert = async () => {};
    await sheet.executeLongRest();

    // Out of 6 total HD, 50% is 3 HD regained. So 4 spent - 3 = 1 remaining spent
    const remainingSpent = sheet.data.vitals.hitDiceSpent.filter(Boolean).length;
    assert.equal(remainingSpent, 1, 'Long rest should restore half of 6 HD (3 dice), leaving 1 die spent');
    assert.equal(sheet.data.vitals.currentHp, sheet.data.vitals.maxHp);
});



