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
    createCharacterSheet
} from '../src/app.js';

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
