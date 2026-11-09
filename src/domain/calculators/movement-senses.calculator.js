import { normalizeKey } from '../../helpers/string.helper.js';
import { DEFAULT_WALK_SPEED } from '../constants/dnd.constants.js';

/**
 * Canonical minimum Strength requirements for heavy armor (PHB p. 144).
 */
export const HEAVY_ARMOR_STR_REQUIREMENTS = {
    ringmail: 0,
    chainmail: 13,
    splint: 15,
    plate: 15
};

/**
 * Resolves the minimum Strength required for an armor.
 * @param {Object} armor - Armor object from inventory.
 * @returns {number} Minimum STR score required (0 if none).
 */
export function getArmorMinStr(armor) {
    if (!armor || armor.type !== 'heavy') return 0;
    if (typeof armor.minStr === 'number') return armor.minStr;
    const norm = normalizeKey(armor.name || '');
    if (norm.includes('chainmail')) return HEAVY_ARMOR_STR_REQUIREMENTS.chainmail;
    if (norm.includes('splint')) return HEAVY_ARMOR_STR_REQUIREMENTS.splint;
    if (norm.includes('plate')) return HEAVY_ARMOR_STR_REQUIREMENTS.plate;
    return 0;
}

/**
 * Pure calculator for character movement modes, heavy armor penalties, and special senses.
 * 
 * @param {Object} character - Character data.
 * @param {Object} computedAttrs - Calculated attributes map.
 * @param {Object} raceInfo - Resolved race data from RaceProvider.
 * @param {Array} equippedArmors - List of equipped armors/shields.
 * @param {Array} allEquipped - List of all equipped items.
 * @returns {Object} Comprehensive movement and senses analysis.
 */
export function calculateMovementAndSenses(
    character = null,
    computedAttrs = {},
    raceInfo = {},
    equippedArmors = [],
    allEquipped = []
) {
    const classes = character?.identity?.classes || [];
    const traits = character?.combat?.traits || [];
    const traitText = traits.map(t => normalizeKey(`${t?.name || ''} ${t?.desc || ''}`)).join(' ');
    const normRace = normalizeKey(character?.identity?.race || raceInfo.name || '');

    const charStr = computedAttrs.STR?.score ?? 10;

    // 1. Heavy Armor Strength Requirement & Penalty
    let heavyArmorPenalty = 0;
    let heavyArmorWarning = null;
    let heavyArmorViolatedItem = null;

    const equippedHeavyArmor = (equippedArmors || []).find(a => a && a.equipped && a.type === 'heavy');
    if (equippedHeavyArmor) {
        const requiredStr = getArmorMinStr(equippedHeavyArmor);
        if (requiredStr > 0 && charStr < requiredStr) {
            // Exceptions: Dwarf race ignores heavy armor speed penalty (PHB p. 20)
            const isDwarf = normRace.includes('dwarf') || raceInfo.baseKey === 'dwarf';
            // Exception: Armorer Artificer Arcane Armor ignores heavy armor STR req (TCE p. 15)
            const isArmorer = traitText.includes('arcanearmor') || classes.some(c =>
                normalizeKey(c?.name) === 'artificer' && normalizeKey(c?.subclass).includes('armorer') && (c?.level || 0) >= 3
            );

            if (!isDwarf && !isArmorer) {
                heavyArmorPenalty = 10;
                heavyArmorViolatedItem = equippedHeavyArmor.name;
                heavyArmorWarning = `${equippedHeavyArmor.name} requires STR ${requiredStr} (You have ${charStr}). Speed reduced by 10 ft.`;
            }
        }
    }

    // 2. Base Walk Speed
    let baseWalk = 30;
    if (typeof raceInfo.speed === 'string') {
        const parsed = parseInt(raceInfo.speed, 10);
        if (!isNaN(parsed)) baseWalk = parsed;
    } else if (typeof raceInfo.speed === 'number') {
        baseWalk = raceInfo.speed;
    } else if (character?.vitals?.speed) {
        const parsed = parseInt(character.vitals.speed, 10);
        if (!isNaN(parsed)) baseWalk = parsed;
    }

    // 3. Class Movement Bonuses (Monk Unarmored Movement, Barbarian Fast Movement)
    let bonusSpeed = 0;
    const speedBonusSources = [];

    // Barbarian Fast Movement (Level 5+, not wearing heavy armor)
    const isBarbLvl5 = classes.some(c => normalizeKey(c?.name) === 'barbarian' && (c?.level || 0) >= 5);
    if ((isBarbLvl5 || traitText.includes('fastmovement')) && !equippedHeavyArmor) {
        bonusSpeed += 10;
        speedBonusSources.push('Barbarian Fast Movement (+10 ft)');
    }

    // Monk Unarmored Movement (Level 2+, no armor and no shield)
    const equippedShield = (equippedArmors || []).find(a => a && a.equipped && a.type === 'shield');
    const hasAnyArmor = (equippedArmors || []).some(a => a && a.equipped && ['light', 'medium', 'heavy'].includes(a.type));
    if (!hasAnyArmor && !equippedShield) {
        const monkClass = classes.find(c => normalizeKey(c?.name) === 'monk');
        const monkLvl = monkClass?.level || 0;
        if (monkLvl >= 2 || traitText.includes('unarmoredmovement')) {
            let monkBonus = 10;
            if (monkLvl >= 18) monkBonus = 30;
            else if (monkLvl >= 14) monkBonus = 25;
            else if (monkLvl >= 10) monkBonus = 20;
            else if (monkLvl >= 6) monkBonus = 15;
            bonusSpeed += monkBonus;
            speedBonusSources.push(`Monk Unarmored Movement (+${monkBonus} ft)`);
        }
    }

    // Items speed bonus
    allEquipped.forEach(item => {
        const sb = item?.statBonuses;
        if (sb && sb.speed) {
            const spdBonus = parseInt(sb.speed, 10);
            if (!isNaN(spdBonus) && spdBonus !== 0) {
                bonusSpeed += spdBonus;
                speedBonusSources.push(`${item.name} (${spdBonus >= 0 ? '+' : ''}${spdBonus} ft)`);
            }
        }
    });

    const finalWalkSpeed = Math.max(5, baseWalk + bonusSpeed - heavyArmorPenalty);

    // 4. Movement Modes (Walk, Fly, Swim, Climb)
    const movementModes = [
        {
            type: 'walk',
            icon: '👟',
            label: 'Walking',
            speed: `${finalWalkSpeed} ft.`,
            isReduced: heavyArmorPenalty > 0,
            note: heavyArmorPenalty > 0 ? `-10 ft (${heavyArmorViolatedItem} STR req)` : null
        }
    ];

    // Flying Speed
    // Genie Warlock Level 6 (Elemental Gift): fly speed equal to walking speed, can hover
    const isGenieFly = classes.some(c =>
        normalizeKey(c?.name) === 'warlock' && normalizeKey(c?.subclass).includes('genie') && (c?.level || 0) >= 6
    ) || traitText.includes('elementalgift');
    if (isGenieFly) {
        movementModes.push({
            type: 'fly',
            icon: '🦅',
            label: 'Flying (Hover)',
            speed: `${finalWalkSpeed} ft.`,
            source: "Genie's Elemental Gift"
        });
    }

    // Aasimar / Winged races / Items flying
    if (normRace.includes('winged') || normRace.includes('aaracocra') || traitText.includes('wings')) {
        movementModes.push({
            type: 'fly',
            icon: '🪶',
            label: 'Flying',
            speed: `${finalWalkSpeed} ft.`,
            source: 'Racial Wings'
        });
    }

    // Swimming Speed
    if (normRace.includes('triton') || normRace.includes('watergenasi') || normRace.includes('seaelf')) {
        movementModes.push({
            type: 'swim',
            icon: '🏊',
            label: 'Swimming',
            speed: '30 ft.',
            source: 'Aquatic Heritage'
        });
    }

    // Climbing Speed
    if (normRace.includes('tabaxi')) {
        movementModes.push({
            type: 'climb',
            icon: '🧗',
            label: 'Climbing',
            speed: '20 ft.',
            source: "Cat's Claws"
        });
    }

    // 5. Special Senses
    const senses = [];

    // Darkvision resolution: race, class, items
    let darkvisionRange = raceInfo.darkvision || 0;
    let darkvisionSource = darkvisionRange > 0 ? (raceInfo.name || 'Racial Trait') : null;

    // Gloom Stalker Ranger: +30 ft darkvision (XGE p. 42)
    const isGloomStalker = classes.some(c =>
        normalizeKey(c?.name) === 'ranger' && normalizeKey(c?.subclass).includes('gloom') && (c?.level || 0) >= 3
    );
    if (isGloomStalker || traitText.includes('umbrasight')) {
        darkvisionRange = darkvisionRange > 0 ? (darkvisionRange + 30) : 60;
        darkvisionSource = darkvisionSource ? `${darkvisionSource} + Umbral Sight` : 'Umbral Sight';
    }

    // Shadow Magic Sorcerer: 120 ft darkvision (XGE p. 50)
    if (classes.some(c => normalizeKey(c?.name) === 'sorcerer' && normalizeKey(c?.subclass).includes('shadow'))) {
        if (darkvisionRange < 120) {
            darkvisionRange = 120;
            darkvisionSource = 'Eyes of the Dark';
        }
    }

    // Magic Items darkvision (e.g. Goggles of Night)
    allEquipped.forEach(item => {
        const normItem = normalizeKey(item?.name || '');
        if (normItem.includes('gogglesofnight')) {
            darkvisionRange = darkvisionRange > 0 ? (darkvisionRange + 60) : 60;
            darkvisionSource = darkvisionSource ? `${darkvisionSource} + Goggles of Night` : 'Goggles of Night';
        }
    });

    if (darkvisionRange > 0) {
        senses.push({
            name: 'Darkvision',
            icon: '👁️',
            range: `${darkvisionRange} ft.`,
            source: darkvisionSource || 'Racial'
        });
    }

    // Blindsight (Blind Fighting Style, Tasha p. 41)
    if (traitText.includes('blindfighting') || traitText.includes('blindsight')) {
        senses.push({
            name: 'Blindsight',
            icon: '🦇',
            range: '10 ft.',
            source: 'Blind Fighting'
        });
    }

    // Truesight / Tremorsense
    if (traitText.includes('truesight')) {
        senses.push({
            name: 'Truesight',
            icon: '✨',
            range: '30 ft.',
            source: 'Trait'
        });
    }

    // Fallback: Passive Perception is always present as a passive sense
    const speedStr = `${finalWalkSpeed} ft.`;
    const speedDesc = heavyArmorPenalty > 0
        ? `Base ${baseWalk} ft. - 10 ft. (${heavyArmorViolatedItem} requires STR ${getArmorMinStr(equippedHeavyArmor)})`
        : (speedBonusSources.length > 0 ? `Base ${baseWalk} ft. + ${speedBonusSources.join(', ')}` : `Base ${baseWalk} ft.`);

    return {
        speedStr,
        finalWalkSpeed,
        heavyArmorPenalty,
        heavyArmorWarning,
        heavyArmorViolatedItem,
        speedDesc,
        movementModes,
        senses
    };
}
