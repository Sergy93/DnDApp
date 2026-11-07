/**
 * Pure calculator for character spellcasting statistics (DC, attack bonus, ability modifier).
 */

/**
 * Calculates spellcasting DC, spell attack bonus string, and key ability modifier.
 * @param {string} spellcastingAttrKey - Target attribute key ('CHA', 'INT', 'WIS', etc.).
 * @param {Object} computedAttrs - Attributes map with modifiers.
 * @param {number} pb - Proficiency bonus.
 * @param {Array} allEquipped - Array of equipped items for DC/attack bonuses.
 * @returns {Object}
 */
export function calculateSpellStats(spellcastingAttrKey, computedAttrs = {}, pb = 2, allEquipped = []) {
    const spellAttrMod = (computedAttrs[spellcastingAttrKey] || computedAttrs.CHA || { mod: 0 }).mod;
    let itemSpellDcBonus = 0;
    let itemSpellAtkBonus = 0;

    allEquipped.forEach(item => {
        const dcBonus = item.statBonuses?.spellDC !== undefined ? item.statBonuses.spellDC : item.statBonuses?.spellDc;
        if (dcBonus) itemSpellDcBonus += parseInt(dcBonus, 10) || 0;
        if (item.statBonuses?.spellAtk) itemSpellAtkBonus += parseInt(item.statBonuses.spellAtk, 10) || 0;
    });

    const spellAtkNum = spellAttrMod + pb + itemSpellAtkBonus;
    const spellDC = 8 + pb + spellAttrMod + itemSpellDcBonus;

    return {
        spellcastingAttrKey,
        spellStat: spellcastingAttrKey,
        spellAttrMod,
        spellAtkNum,
        spellAtkStr: spellAtkNum >= 0 ? `+${spellAtkNum}` : `${spellAtkNum}`,
        spellDC,
        itemSpellDcBonus,
        itemSpellAtkBonus
    };
}
