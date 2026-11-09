import { normalizeKey } from '../../helpers/string.helper.js';

/**
 * Pure calculator for D&D 5e Character Initiative.
 * Supports:
 * - Base Dexterity modifier
 * - Bard Jack of All Trades (half proficiency bonus rounded down)
 * - Swashbuckler Rogue Rakish Audacity (+CHA mod)
 * - War Magic Wizard Tactical Wit (+INT mod)
 * - Chronurgy Magic Wizard Temporal Awareness (+INT mod)
 * - Gloom Stalker Ranger Dread Ambusher (+WIS mod)
 * - Alert Feat (+5)
 * - Equipment stat bonuses (sb.initiative or sb.init)
 * 
 * @param {Object} computedAttrs - Attributes map with modifiers.
 * @param {number} pb - Proficiency bonus.
 * @param {Object} [character=null] - Character data object.
 * @param {Array} [allEquipped=[]] - List of equipped items.
 * @returns {{ initNum: number, initStr: string, initBreakdown: Array<{ source: string, val: number, valStr: string }>, initDesc: string }}
 */
export function calculateInitiative(
    computedAttrs = {},
    pb = 2,
    character = null,
    allEquipped = []
) {
    const dexMod = computedAttrs.DEX?.mod ?? 0;
    const dexModStr = computedAttrs.DEX?.modStr ?? '+0';

    const breakdown = [
        { source: 'DEX', val: dexMod, valStr: dexModStr }
    ];

    const classes = character?.identity?.classes || [];
    const traits = character?.combat?.traits || [];
    const traitText = traits.map(t => normalizeKey(`${t?.name || ''} ${t?.desc || ''}`)).join(' ');

    // 1. Bard: Jack of All Trades (PHB p. 54)
    // Starting at 2nd level, add half PB rounded down to any ability check that doesn't already include PB.
    let isBardLvl2 = false;
    for (const c of classes) {
        if (normalizeKey(c?.name) === 'bard' && (c?.level || 0) >= 2) {
            isBardLvl2 = true;
            break;
        }
    }
    if (isBardLvl2 || traitText.includes('jackofalltrades')) {
        const joatVal = Math.floor(pb / 2);
        if (joatVal > 0) {
            breakdown.push({
                source: 'Jack of All Trades',
                val: joatVal,
                valStr: `+${joatVal}`
            });
        }
    }

    // 2. Swashbuckler Rogue: Rakish Audacity (XGE p. 47)
    // At 3rd level, add Charisma modifier to initiative rolls.
    let isSwashbuckler = false;
    for (const c of classes) {
        const cName = normalizeKey(c?.name);
        const sName = normalizeKey(c?.subclass);
        if (cName === 'rogue' && sName.includes('swashbuckler') && (c?.level || 0) >= 3) {
            isSwashbuckler = true;
            break;
        }
    }
    if (isSwashbuckler || traitText.includes('rakishaudacity')) {
        const chaMod = computedAttrs.CHA?.mod ?? 0;
        if (chaMod !== 0) {
            breakdown.push({
                source: 'Rakish Audacity (CHA)',
                val: chaMod,
                valStr: chaMod >= 0 ? `+${chaMod}` : `${chaMod}`
            });
        }
    }

    // 3. War Magic Wizard (XGE) / Chronurgy Wizard (EGtW): Tactical Wit / Temporal Awareness (+INT)
    let isIntInitiative = false;
    for (const c of classes) {
        const cName = normalizeKey(c?.name);
        const sName = normalizeKey(c?.subclass);
        if (cName === 'wizard' && (sName.includes('war') || sName.includes('chronurgy')) && (c?.level || 0) >= 2) {
            isIntInitiative = true;
            break;
        }
    }
    if (isIntInitiative || traitText.includes('tacticalwit') || traitText.includes('temporalawareness')) {
        const intMod = computedAttrs.INT?.mod ?? 0;
        if (intMod !== 0) {
            breakdown.push({
                source: 'Tactical Wit (INT)',
                val: intMod,
                valStr: intMod >= 0 ? `+${intMod}` : `${intMod}`
            });
        }
    }

    // 4. Gloom Stalker Ranger: Dread Ambusher (XGE p. 42) (+WIS)
    let isGloomStalker = false;
    for (const c of classes) {
        const cName = normalizeKey(c?.name);
        const sName = normalizeKey(c?.subclass);
        if (cName === 'ranger' && sName.includes('gloom') && (c?.level || 0) >= 3) {
            isGloomStalker = true;
            break;
        }
    }
    if (isGloomStalker || traitText.includes('dreadambusher')) {
        const wisMod = computedAttrs.WIS?.mod ?? 0;
        if (wisMod !== 0) {
            breakdown.push({
                source: 'Dread Ambusher (WIS)',
                val: wisMod,
                valStr: wisMod >= 0 ? `+${wisMod}` : `${wisMod}`
            });
        }
    }

    // 5. Alert Feat (+5 initiative, PHB p. 165)
    const hasAlert = traits.some(t => normalizeKey(t?.name || '') === 'alert') ||
        (traitText.includes('alert') && (traitText.includes('5toinitiative') || traitText.includes('cannotbesurprised')));
    if (hasAlert) {
        breakdown.push({
            source: 'Alert Feat',
            val: 5,
            valStr: '+5'
        });
    }

    // 6. Equipped Items Bonus (statBonuses.initiative / statBonuses.init)
    allEquipped.forEach(item => {
        const sb = item?.statBonuses;
        if (sb) {
            const itemBonus = parseInt(sb.initiative ?? sb.init, 10);
            if (!isNaN(itemBonus) && itemBonus !== 0) {
                breakdown.push({
                    source: item.name || 'Equipment',
                    val: itemBonus,
                    valStr: itemBonus >= 0 ? `+${itemBonus}` : `${itemBonus}`
                });
            }
        }
    });

    const initNum = breakdown.reduce((acc, b) => acc + b.val, 0);
    const initStr = initNum >= 0 ? `+${initNum}` : `${initNum}`;
    const initDesc = breakdown.map(b => `${b.source} (${b.valStr})`).join(' + ');

    return {
        initNum,
        initStr,
        initBreakdown: breakdown,
        initDesc
    };
}
