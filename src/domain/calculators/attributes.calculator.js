/**
 * Pure calculation functions for character ability scores and saving throws.
 */

export const ATTR_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

/**
 * Computes ability scores, modifiers, equipment bonuses, and saving throws.
 * @param {Object} attributes - Raw character attributes map.
 * @param {Array} allEquipped - Array of all currently equipped items.
 * @param {number} pb - Proficiency bonus.
 * @returns {Object} Computed attributes map.
 */
export function calculateAttributes(attributes = {}, allEquipped = [], pb = 2) {
    const computedAttrs = {};

    ATTR_KEYS.forEach(k => {
        const raw = attributes?.[k] || { score: 10, profSave: false };
        const baseScore = typeof raw.score === 'number' ? raw.score : (parseInt(raw.score, 10) || 10);
        let bonusFromItems = 0;
        let itemSaveBonus = 0;
        let hasAttrAdvantage = false;
        const attrAdvantageSources = [];
        let hasSaveAdvantage = false;
        const saveAdvantageSources = [];

        allEquipped.forEach(item => {
            const sb = item.statBonuses;
            if (sb) {
                if (sb[k]) bonusFromItems += parseInt(sb[k], 10) || 0;
                if (sb.attr === k) {
                    if (sb.attrMode === 'advantage') {
                        hasAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    } else if (sb.attrVal) {
                        bonusFromItems += parseInt(sb.attrVal, 10) || 0;
                    }
                }

                const saveType = (sb.saveType || 'all').toUpperCase();
                const saveVal = parseInt(sb.saveVal, 10) || 0;
                const isTargetSave = saveType === 'ALL' || saveType === k;
                if (isTargetSave) {
                    if (sb.saveMode === 'advantage') {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    } else if (saveVal) {
                        itemSaveBonus += saveVal;
                    }
                }
            }

            // Direct advantage arrays on items
            if (Array.isArray(item.advantageAttrs)) {
                item.advantageAttrs.forEach(a => {
                    if (String(a).toUpperCase() === k) {
                        hasAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }
            if (Array.isArray(item.advantageSaves)) {
                item.advantageSaves.forEach(s => {
                    const su = String(s).toUpperCase();
                    if (su === 'ALL' || su === k) {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }
        });

        const score = baseScore + bonusFromItems;
        const mod = Math.floor((score - 10) / 2);
        const save = mod + (raw.profSave ? pb : 0) + itemSaveBonus;

        computedAttrs[k] = {
            score,
            baseScore,
            bonusFromItems,
            mod,
            modStr: mod >= 0 ? `+${mod}` : `${mod}`,
            save,
            saveStr: save >= 0 ? `+${save}` : `${save}`,
            profSave: !!raw.profSave,
            itemSaveBonus,
            hasAttrAdvantage,
            attrAdvantageSources: [...new Set(attrAdvantageSources)],
            hasSaveAdvantage,
            saveAdvantageSources: [...new Set(saveAdvantageSources)]
        };
    });

    return computedAttrs;
}
