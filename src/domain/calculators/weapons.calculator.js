/**
 * Pure calculator for weapon attack bonuses, damage modifiers, and formatted attack cards.
 */

/**
 * Computes attack and damage strings for weapons, handling finesse, attribute scaling, and magical bonuses.
 * @param {Array} weapons - Inventory weapons.
 * @param {Object} computedAttrs - Attributes map with calculated modifiers.
 * @param {number} pb - Proficiency bonus.
 * @returns {Array} Computed weapons array.
 */
export function calculateWeapons(weapons = [], computedAttrs = {}, pb = 2) {
    return (weapons || []).map((w, idx) => {
        let usedAttr = 'STR';
        if (w.attrMode === 'dex') usedAttr = 'DEX';
        else if (w.attrMode === 'finesse') {
            const dexMod = computedAttrs.DEX?.mod || 0;
            const strMod = computedAttrs.STR?.mod || 0;
            usedAttr = (dexMod >= strMod) ? 'DEX' : 'STR';
        }

        const attrMod = (computedAttrs[usedAttr] || computedAttrs.STR || { mod: 0 }).mod;
        const nameBonusMatch = (w.name || '').match(/\+(\d+)/);
        const nameBonus = nameBonusMatch ? parseInt(nameBonusMatch[1], 10) : 0;
        const magicBonus = parseInt(w.magicBonus !== undefined ? w.magicBonus : nameBonus, 10) || 0;
        const atkBonus = attrMod + (w.proficient !== false ? pb : 0) + magicBonus;
        const dmgMod = attrMod + magicBonus;
        let dmgModStr = '';
        if (dmgMod > 0) dmgModStr = `+${dmgMod}`;
        else if (dmgMod < 0) dmgModStr = `-${Math.abs(dmgMod)}`;
        const dmgStr = `${w.dice || ''} ${dmgModStr} ${w.damageType || ''}`.replace(/\s+/g, ' ').trim();

        return {
            ...w,
            originalIndex: idx,
            usedAttr,
            atkStr: atkBonus >= 0 ? `+${atkBonus}` : `${atkBonus}`,
            dmgStr
        };
    });
}
