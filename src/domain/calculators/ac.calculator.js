import { normalizeKey } from '../../helpers/string.helper.js';
import {
    BASE_UNARMORED_AC,
    DRACONIC_RESILIENCE_BASE_AC,
    MEDIUM_ARMOR_MAX_DEX_BONUS,
    DEFAULT_SHIELD_AC_BONUS,
    DEFENSE_FIGHTING_STYLE_BONUS
} from '../constants/dnd.constants.js';

/**
 * Armor Class (AC) pure domain calculator for PHB, XGE, and TCE rules.
 * Supports:
 * - Standard Unarmored (10 + DEX)
 * - Barbarian Unarmored Defense (10 + DEX + CON, shield allowed)
 * - Monk Unarmored Defense (10 + DEX + WIS, no armor and no shield)
 * - Draconic Bloodline Sorcerer Resilience (13 + DEX when unarmored)
 * - Light, Medium (capped at +2 DEX), Heavy, Custom body armor
 * - Shield (+2 default) and wondrous accessories
 * - Bladesinging Wizard (TCE): Bladesong (+INT when unarmored or light armor, no shield)
 * - Armorer Artificer (TCE): Arcane Armor (ignores heavy armor STR requirement)
 */

function detectCharacterAcRules(character) {
    if (!character) {
        return {
            isBarbarian: false,
            isMonk: false,
            isDraconicSorcerer: false,
            isBladesingerActive: false,
            isArmorer: false,
            hasDefenseFightingStyle: false
        };
    }

    const classes = character?.identity?.classes || [];
    const traits = character?.combat?.traits || [];
    const traitText = traits.map(t => normalizeKey(`${t?.name || ''} ${t?.desc || ''}`)).join(' ');

    let isBarbarian = traitText.includes('unarmoreddefensebarbarian');
    let isMonk = traitText.includes('unarmoreddefensemonk');
    let isDraconicSorcerer = traitText.includes('draconicresilience');
    let isBladesingerActive = Boolean(
        character?.combat?.bladesongActive ||
        traits.some(t => {
            const n = normalizeKey(t?.name || '');
            return n.includes('bladesong') && (n.includes('active') || t?.active === true);
        })
    );
    let isArmorer = traitText.includes('arcanearmor');
    let hasDefenseFightingStyle = traitText.includes('fightingstyledefense');

    for (const c of classes) {
        const cName = normalizeKey(c?.name);
        const sName = normalizeKey(c?.subclass);
        const lvl = parseInt(c?.level, 10) || 0;
        if (cName === 'barbarian' && lvl >= 1) isBarbarian = true;
        if (cName === 'monk' && lvl >= 1) isMonk = true;
        if (cName === 'sorcerer' && sName.includes('draconic') && lvl >= 1) isDraconicSorcerer = true;
        if (cName === 'artificer' && sName.includes('armorer') && lvl >= 3) isArmorer = true;
    }

    return {
        isBarbarian,
        isMonk,
        isDraconicSorcerer,
        isBladesingerActive,
        isArmorer,
        hasDefenseFightingStyle
    };
}

/**
 * Computes total AC and formatted formula description.
 * @param {Array} armors - Inventory armors list.
 * @param {Array} storyItems - Inventory story items list.
 * @param {Object} computedAttrs - Attributes map with modifiers.
 * @param {Object} [character=null] - Optional character sheet object for class AC rules.
 * @returns {{ ac: number, armorDesc: string, ignoresHeavyArmorStrPenalty: boolean }}
 */
export function calculateArmorClass(
    armors = [],
    storyItems = [],
    computedAttrs = {},
    character = null
) {
    const dexMod = computedAttrs.DEX?.mod || 0;
    const dexModStr = computedAttrs.DEX?.modStr || '+0';
    const conMod = computedAttrs.CON?.mod || 0;
    const conModStr = computedAttrs.CON?.modStr || '+0';
    const wisMod = computedAttrs.WIS?.mod || 0;
    const wisModStr = computedAttrs.WIS?.modStr || '+0';
    const intMod = computedAttrs.INT?.mod || 0;

    const acRules = detectCharacterAcRules(character);

    let calculatedAc = BASE_UNARMORED_AC + dexMod;
    let armorDesc = `${BASE_UNARMORED_AC} + DEX (${dexModStr})`;

    const equippedArmors = (armors || []).filter(a => a && a.equipped);
    const equippedStory = (storyItems || []).filter(s => s && s.equipped);

    // Main armor must be light, medium, or heavy (or custom base body armor)
    const mainArmor = equippedArmors.find(a =>
        ['light', 'medium', 'heavy'].includes(a.type) ||
        (a.type !== 'shield' && a.type !== 'accessory' && (parseInt(a.baseAc, 10) || 0) >= BASE_UNARMORED_AC)
    );
    const equippedShield = equippedArmors.find(a => a.type === 'shield');
    // Magic accessories (cloaks, rings, amulets, wondrous items) that grant bonus AC (or 0 AC)
    const accessories = equippedArmors.filter(a => a !== mainArmor && a !== equippedShield);
    accessories.push(...equippedStory);

    if (mainArmor) {
        const bAc = parseInt(mainArmor.baseAc, 10) || BASE_UNARMORED_AC;
        if (mainArmor.type === 'light') {
            calculatedAc = bAc + dexMod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        } else if (mainArmor.type === 'medium') {
            calculatedAc = bAc + Math.min(MEDIUM_ARMOR_MAX_DEX_BONUS, dexMod);
            armorDesc = `${mainArmor.name} (${bAc} + max ${MEDIUM_ARMOR_MAX_DEX_BONUS})`;
        } else if (mainArmor.type === 'heavy') {
            calculatedAc = bAc;
            armorDesc = `${mainArmor.name} (${bAc})`;
        } else {
            // General custom armor base
            calculatedAc = bAc + dexMod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        }

        if (acRules.hasDefenseFightingStyle) {
            calculatedAc += DEFENSE_FIGHTING_STYLE_BONUS;
            armorDesc += ` + Defense (+${DEFENSE_FIGHTING_STYLE_BONUS})`;
        }
    } else {
        // Evaluate alternative Unarmored AC formulas (choose highest, per 5e rules)
        if (acRules.isDraconicSorcerer) {
            const draconicAc = DRACONIC_RESILIENCE_BASE_AC + dexMod;
            if (draconicAc > calculatedAc) {
                calculatedAc = draconicAc;
                armorDesc = `Draconic Resilience (${DRACONIC_RESILIENCE_BASE_AC} + DEX ${dexModStr})`;
            }
        }
        if (acRules.isBarbarian) {
            const barbAc = BASE_UNARMORED_AC + dexMod + conMod;
            if (barbAc > calculatedAc) {
                calculatedAc = barbAc;
                armorDesc = `Unarmored Defense (${BASE_UNARMORED_AC} + DEX ${dexModStr} + CON ${conModStr})`;
            }
        }
        if (acRules.isMonk && !equippedShield) {
            const monkAc = BASE_UNARMORED_AC + dexMod + wisMod;
            if (monkAc > calculatedAc) {
                calculatedAc = monkAc;
                armorDesc = `Unarmored Defense (${BASE_UNARMORED_AC} + DEX ${dexModStr} + WIS ${wisModStr})`;
            }
        }
    }

    // Bladesong (TCE): +INT (min +1) while not wearing medium/heavy armor or using a shield
    const canBladesing = !equippedShield && (!mainArmor || mainArmor.type === 'light');
    if (acRules.isBladesingerActive && canBladesing) {
        const bladesongBonus = Math.max(1, intMod);
        calculatedAc += bladesongBonus;
        armorDesc += ` + Bladesong (+${bladesongBonus})`;
    }

    if (equippedShield) {
        const sBonus = parseInt(equippedShield.baseAc, 10) || DEFAULT_SHIELD_AC_BONUS;
        calculatedAc += sBonus;
        armorDesc += ` + ${equippedShield.name || 'Shield'} (+${sBonus})`;
    }

    accessories.forEach(acc => {
        const bonus = parseInt(acc.baseAc, 10) || 0;
        if (bonus > 0) {
            calculatedAc += bonus;
            armorDesc += ` + ${acc.name} (+${bonus})`;
        }
    });

    return {
        ac: calculatedAc,
        armorDesc,
        ignoresHeavyArmorStrPenalty: acRules.isArmorer
    };
}
