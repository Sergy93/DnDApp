import { normalizeKey } from '../../helpers/string.helper.js';

/**
 * D&D 5e Known Spells progression by class level (excluding cantrips).
 */
export const KNOWN_SPELLS_TABLES = {
    bard: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    sorcerer: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    warlock: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    ranger: [0, 0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
};

/**
 * Pure calculator for character spell preparation limits and known spells tracking.
 * 
 * @param {Object} character - Character data.
 * @param {Object} computedAttrs - Attributes map with modifiers.
 * @param {Array} spellsList - Resolved list of spells on the character.
 * @returns {Object} Spell preparation summary.
 */
export function calculateSpellPreparation(
    character = null,
    computedAttrs = {},
    spellsList = []
) {
    const classes = character?.identity?.classes || [];
    let isPreparedCaster = false;
    let maxPrepared = 0;
    const preparedCasterBreakdown = [];

    let isKnownCaster = false;
    let maxKnown = 0;
    const knownCasterBreakdown = [];

    classes.forEach(c => {
        const cName = normalizeKey(c?.name || '');
        const lvl = parseInt(c?.level, 10) || 0;
        if (lvl <= 0) return;

        // Prepared Casters
        if (cName === 'wizard') {
            isPreparedCaster = true;
            const intMod = computedAttrs.INT?.mod ?? 0;
            const limit = Math.max(1, lvl + intMod);
            maxPrepared += limit;
            preparedCasterBreakdown.push(`Wizard (${lvl} + INT ${intMod >= 0 ? '+' + intMod : intMod} = ${limit})`);
        } else if (cName === 'cleric') {
            isPreparedCaster = true;
            const wisMod = computedAttrs.WIS?.mod ?? 0;
            const limit = Math.max(1, lvl + wisMod);
            maxPrepared += limit;
            preparedCasterBreakdown.push(`Cleric (${lvl} + WIS ${wisMod >= 0 ? '+' + wisMod : wisMod} = ${limit})`);
        } else if (cName === 'druid') {
            isPreparedCaster = true;
            const wisMod = computedAttrs.WIS?.mod ?? 0;
            const limit = Math.max(1, lvl + wisMod);
            maxPrepared += limit;
            preparedCasterBreakdown.push(`Druid (${lvl} + WIS ${wisMod >= 0 ? '+' + wisMod : wisMod} = ${limit})`);
        } else if (cName === 'paladin') {
            if (lvl >= 2) {
                isPreparedCaster = true;
                const chaMod = computedAttrs.CHA?.mod ?? 0;
                const limit = Math.max(1, Math.floor(lvl / 2) + chaMod);
                maxPrepared += limit;
                preparedCasterBreakdown.push(`Paladin (½ lvl ${Math.floor(lvl / 2)} + CHA ${chaMod >= 0 ? '+' + chaMod : chaMod} = ${limit})`);
            }
        } else if (cName === 'artificer') {
            isPreparedCaster = true;
            const intMod = computedAttrs.INT?.mod ?? 0;
            const limit = Math.max(1, Math.floor(lvl / 2) + intMod);
            maxPrepared += limit;
            preparedCasterBreakdown.push(`Artificer (½ lvl ${Math.floor(lvl / 2)} + INT ${intMod >= 0 ? '+' + intMod : intMod} = ${limit})`);
        }

        // Known Casters
        if (KNOWN_SPELLS_TABLES[cName]) {
            isKnownCaster = true;
            const table = KNOWN_SPELLS_TABLES[cName];
            const limit = table[Math.min(lvl, 20)] || 0;
            maxKnown += limit;
            const capName = cName.charAt(0).toUpperCase() + cName.slice(1);
            knownCasterBreakdown.push(`${capName} (${limit})`);
        }
    });

    // Count prepared spells
    // Only leveled spells (level > 0), not item-granted, and not always-prepared count against limit
    let preparedCount = 0;
    let knownCount = 0;

    (spellsList || []).forEach(sp => {
        if (!sp || sp.level === 0 || sp.isItemGranted) return;

        knownCount++;

        // In 5e RAW, domain/subclass spells and spells explicitly marked alwaysPrepared don't count
        if (sp.alwaysPrepared) return;

        // If prepared caster exists, check if spell is prepared (defaults to true if undefined)
        const isPrep = sp.prepared !== false;
        if (isPrep) {
            preparedCount++;
        }
    });

    const isOverPrepared = isPreparedCaster && preparedCount > maxPrepared;
    const isOverKnown = isKnownCaster && knownCount > maxKnown;

    return {
        isPreparedCaster,
        maxPrepared,
        preparedCount,
        isOverPrepared,
        preparedCasterBreakdown,
        isKnownCaster,
        maxKnown,
        knownCount,
        isOverKnown,
        knownCasterBreakdown
    };
}
