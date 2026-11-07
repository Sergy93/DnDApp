/**
 * Armor Class (AC) pure domain calculator.
 * Supports Unarmored, Light, Medium (capped at +2 DEX), Heavy, Shield, and wondrous accessories.
 */

/**
 * Computes total AC and formatted formula description.
 * @param {Array} armors - Inventory armors list.
 * @param {Array} storyItems - Inventory story items list.
 * @param {Object} computedAttrs - Attributes map with DEX modifier.
 * @returns {{ ac: number, armorDesc: string }}
 */
export function calculateArmorClass(armors = [], storyItems = [], computedAttrs = {}) {
    const dexMod = computedAttrs.DEX?.mod || 0;
    const dexModStr = computedAttrs.DEX?.modStr || '+0';

    let calculatedAc = 10 + dexMod;
    let armorDesc = `10 + DEX (${dexModStr})`;

    const equippedArmors = (armors || []).filter(a => a && a.equipped);
    const equippedStory = (storyItems || []).filter(s => s && s.equipped);

    // Main armor must be light, medium, or heavy (or custom base body armor)
    const mainArmor = equippedArmors.find(a =>
        ['light', 'medium', 'heavy'].includes(a.type) ||
        (a.type !== 'shield' && a.type !== 'accessory' && (parseInt(a.baseAc, 10) || 0) >= 10)
    );
    const equippedShield = equippedArmors.find(a => a.type === 'shield');
    // Magic accessories (cloaks, rings, amulets, wondrous items) that grant bonus AC (or 0 AC)
    const accessories = equippedArmors.filter(a => a !== mainArmor && a !== equippedShield);
    accessories.push(...equippedStory);

    if (mainArmor) {
        const bAc = parseInt(mainArmor.baseAc, 10) || 10;
        if (mainArmor.type === 'light') {
            calculatedAc = bAc + dexMod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        } else if (mainArmor.type === 'medium') {
            calculatedAc = bAc + Math.min(2, dexMod);
            armorDesc = `${mainArmor.name} (${bAc} + max 2)`;
        } else if (mainArmor.type === 'heavy') {
            calculatedAc = bAc;
            armorDesc = `${mainArmor.name} (${bAc})`;
        } else {
            // General custom armor base
            calculatedAc = bAc + dexMod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        }
    }

    if (equippedShield) {
        const sBonus = parseInt(equippedShield.baseAc, 10) || 2;
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
        armorDesc
    };
}
