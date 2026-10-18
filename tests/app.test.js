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
    resolveSpellData
} from '../src/app.js';

test('String & Key Normalization Helpers', () => {
    assert.equal(normalizeKey('College of Swords'), 'collegeofswords');
    assert.equal(normalizeKey('Genie (Djinni)'), 'geniedjinni');
    assert.equal(normalizeKey('Canción de Descanso'), 'canciondedescanso');
    assert.equal(normalizeKey(null), '');

    assert.equal(capitalizeWord('bard'), 'Bard');
    assert.equal(capitalizeWord('college of swords'), 'College Of Swords');
    assert.equal(capitalizeWord(''), '');
});

test('Attribute Modifiers & Resource Uses', () => {
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

    assert.equal(getResourceMaxUses({ uses: 4 }, attrs, 3), 4);
    assert.equal(getResourceMaxUses({ usesKey: 'CHA' }, attrs, 3), 5);
    assert.equal(getResourceMaxUses({ usesKey: 'PB' }, attrs, 3), 3);
    assert.equal(getResourceMaxUses({ usesKey: 'STR' }, attrs, 3), 1); // Minimum 1 use
});

test('Class & Subclass Compendium Resolution', () => {
    const bard = findCompendiumClass('Bard');
    assert.ok(bard);
    assert.equal(bard.key, 'bard');
    assert.equal(resolveClassHitDie({ name: 'Bard' }), 'd8');
    assert.equal(resolveClassHitDie({ name: 'Barbarian' }), 'd12');

    const swords = resolveSubclassInfo('Bard', 'Swords');
    assert.ok(swords);
    assert.equal(swords.key, 'swords');

    const djinni = resolveSubclassInfo('Warlock', 'Djinni');
    assert.ok(djinni);
    assert.equal(djinni.key, 'genie');
    assert.equal(djinni.specialization, 'djinni');
    assert.equal(djinni.specInfo?.damageType, 'Thunder');

    const subComp = findCompendiumSubclass(bard.obj, 'College of Swords', 'Bard');
    assert.ok(subComp);
    assert.equal(subComp.key, 'swords');

    const tree = generateProgressionTree('Bard', 'Swords');
    assert.ok(Array.isArray(tree));
    assert.ok(tree.length > 0);
});

test('Spell Slots Progression (Single, Multiclass, and Warlock Pact)', () => {
    // Level 5 Bard (Full Caster) -> 4x 1st, 3x 2nd, 2x 3rd
    const bardSlots = calculateExpectedSlots([{ name: 'Bard', level: 5 }]);
    assert.equal(bardSlots.length, 3);
    assert.deepEqual(bardSlots.map(s => ({ id: s.id, max: s.max, reset: s.reset })), [
        { id: 'lvl1', max: 4, reset: 'long' },
        { id: 'lvl2', max: 3, reset: 'long' },
        { id: 'lvl3', max: 2, reset: 'long' }
    ]);

    // Multiclass: Bard 4 (Full) + Paladin 2 (Half = 1) -> Combined Level 5 + Warlock 2 (Pact)
    const multiSlots = calculateExpectedSlots([
        { name: 'Bard', level: 4 },
        { name: 'Paladin', level: 2 },
        { name: 'Warlock', level: 2 }
    ]);
    const pactSlot = multiSlots.find(s => s.id === 'pact');
    assert.ok(pactSlot);
    assert.equal(pactSlot.max, 2);
    assert.equal(pactSlot.reset, 'short');

    const lvl3Slot = multiSlots.find(s => s.id === 'lvl3');
    assert.ok(lvl3Slot);
    assert.equal(lvl3Slot.max, 2);

    // Sync preserves spent state
    const charObj = {
        identity: { classes: [{ name: 'Bard', level: 3 }] },
        magic: {
            slots: [{ id: 'lvl1', max: 4, spent: [true, false, true, false] }]
        }
    };
    syncCharacterSpellSlots(charObj);
    assert.equal(charObj.magic.slots.length, 2);
    assert.deepEqual(charObj.magic.slots[0].spent, [true, false, true, false]);
    assert.deepEqual(charObj.magic.slots[1].spent, [false, false]);
});

test('Dice Scaling (Bardic Inspiration & Song of Rest)', () => {
    assert.equal(resolveDiceScale('bard', 'bardicDie', 1), '1d6');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 5), '1d8');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 10), '1d10');
    assert.equal(resolveDiceScale('bard', 'bardicDie', 15), '1d12');

    const charLvl5 = { identity: { classes: [{ name: 'Bard', level: 5 }] } };
    assert.equal(resolveBardicDie(charLvl5), '1d8');
    assert.equal(resolveSongOfRestDie(charLvl5), '1d6');
    assert.equal(resolveSongOfRestDie({ identity: { classes: [{ name: 'Bard', level: 9 }] } }), '1d8');
});

test('Core Stats Computation (AC, PB, Saves, Skills, Spell DC, Resistances)', () => {
    const character = sanitizeTracking({
        identity: {
            classes: [
                { name: 'Bard', subclass: 'College of Swords', level: 4, hitDie: 'd8' },
                { name: 'Warlock', subclass: 'Djinni', level: 1, hitDie: 'd8' }
            ]
        },
        attributes: {
            STR: { score: 10, profSave: false },
            DEX: { score: 16, profSave: true },
            CON: { score: 14, profSave: false },
            INT: { score: 12, profSave: false },
            WIS: { score: 10, profSave: false },
            CHA: { score: 18, profSave: true }
        },
        skills: [
            { id: 'perception', name: 'Perception', attr: 'WIS', profType: 'C' },
            { id: 'persuasion', name: 'Persuasion', attr: 'CHA', profType: 'P' },
            { id: 'stealth', name: 'Stealth', attr: 'DEX', profType: '' }
        ],
        combat: {
            traits: [
                { name: 'Jack of All Trades', desc: 'Half proficiency to non-proficient checks.' }
            ],
            resources: []
        },
        inventory: {
            armors: [
                {
                    name: 'Studded Leather',
                    type: 'light',
                    baseAc: 12,
                    equipped: true
                },
                {
                    name: 'Cloak of Protection',
                    type: 'accessory',
                    baseAc: 1,
                    equipped: true,
                    resistances: ['thunder'],
                    statBonuses: { saveType: 'ALL', saveVal: 1 },
                    advantageSkills: ['stealth']
                }
            ],
            weapons: [
                {
                    name: 'Rapier +1',
                    attrMode: 'finesse',
                    dice: '1d8',
                    damageType: 'Piercing',
                    proficient: true,
                    equipped: true
                }
            ],
            story: []
        }
    });

    const stats = computeStats(character);

    // Total Level 5 -> PB +3
    assert.equal(stats.totalLevel, 5);
    assert.equal(stats.pb, 3);
    assert.equal(stats.hasJackOfAllTrades, true);
    assert.equal(stats.jackOfAllTrades, 1);

    // AC = 12 (Studded Leather) + 3 (DEX) + 1 (Cloak of Protection) = 16
    assert.equal(stats.ac, 16);

    // Spell DC = 8 + 3 (PB) + 4 (CHA) = 15, Spell Attack = +7
    assert.equal(stats.spellDC, 15);
    assert.equal(stats.spellAtkStr, '+7');

    // Saves: DEX (+3 mod + 3 prof + 1 Cloak = +7), WIS (+0 mod + 1 Cloak = +1)
    assert.equal(stats.computedAttrs.DEX.save, 7);
    assert.equal(stats.computedAttrs.WIS.save, 1);

    // Skills: Persuasion (expertise: +4 CHA + 6 = +10), Stealth (non-prof with JOAT: +3 DEX + 1 JOAT = +4, with advantage)
    const persuasion = stats.computedSkills.find(s => s.id === 'persuasion');
    const stealth = stats.computedSkills.find(s => s.id === 'stealth');
    assert.equal(persuasion.valNum, 10);
    assert.equal(stealth.valNum, 4);
    assert.equal(stealth.hasAdvantage, true);

    // Weapon: Rapier +1 -> Finesse uses DEX (+3) + PB (+3) + Magic (+1) = +7 attack, 1d8 +4 Piercing
    assert.equal(stats.computedWeapons[0].atkStr, '+7');
    assert.equal(stats.computedWeapons[0].dmgStr, '1d8 +4 Piercing');

    // Genie's Wrath (Djinni) -> +3 Thunder damage
    assert.equal(stats.genieDamage, '+3 Thunder damage');

    // Resistance from equipped Cloak
    assert.ok(stats.resistances.some(r => r.id === 'thunder' && r.source.includes('Cloak of Protection')));
});

test('Class Feature Synchronization Detection', () => {
    const d = {
        identity: {
            classes: [{ name: 'Warlock', subclass: 'Genie (Djinni)', level: 1 }]
        },
        combat: { traits: [], resources: [] }
    };
    const sync = detectClassFeaturesToSync(d);
    assert.ok(sync.newTraits.some(t => normalizeKey(t.name).includes('genieswrath')));
    assert.ok(sync.newResources.some(r => r.id === 'bottled_respite'));
});

test('Spell Parser, Compendium & Scaling', () => {
    assert.equal(clean5eToolsText('Deals {@damage 2d6} fire damage.'), 'Deals 2d6 fire damage.');

    const count = buildSpellsCompendium();
    assert.ok(count > 0);

    const parsed = parse5eToolsSpell({
        name: 'Test Bolt',
        level: 1,
        school: 'V',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'feet', amount: 60 } },
        duration: [{ type: 'instant' }],
        damageInflict: ['radiant'],
        entries: ['Deals {@damage 2d8} radiant damage.'],
        entriesHigherLevel: [{ entries: ['Increases by {@scaledamage 2d8|1-9|1d8} per slot.'] }]
    });
    assert.ok(parsed);
    assert.equal(parsed.damage, '2d8');
    assert.equal(parsed.higherLevelScale, '1d8');

    assert.equal(calculateSlotDamage('2d8', '1d8', 1, 3), '4d8');
    assert.deepEqual(getCantripScalingTier(1), { tier: '1', multiplier: 1 });
    assert.deepEqual(getCantripScalingTier(5), { tier: '5', multiplier: 2 });
    assert.deepEqual(getCantripScalingTier(11), { tier: '11', multiplier: 3 });
    assert.deepEqual(getCantripScalingTier(17), { tier: '17', multiplier: 4 });

    const resolved = resolveSpellData({
        name: 'Custom Heal',
        level: 1,
        isHealing: true,
        damage: '1d8+MOD',
        higherLevelScale: '1d8'
    }, 5, 3, 4);
    assert.equal(resolved.damage, '1d8+4');
    assert.equal(resolved.slotScaling.length, 2);
    assert.equal(resolved.slotScaling[0].damage, '2d8+4');
    assert.equal(resolved.slotScaling[1].damage, '3d8+4');
});

test('Data Constants & File Content Parsing', () => {
    assert.ok(Array.isArray(DND_CONDITIONS) && DND_CONDITIONS.length > 0);
    assert.ok(Array.isArray(DAMAGE_TYPES) && DAMAGE_TYPES.length > 0);
    assert.equal(DND_5E_SKILLS.length, 18);

    const parsed = parseCharacterFileContent('{"identity":{"name":"Dorian"}}');
    assert.equal(parsed.identity.name, 'Dorian');
    assert.throws(() => parseCharacterFileContent(''), /Empty file/);
});
