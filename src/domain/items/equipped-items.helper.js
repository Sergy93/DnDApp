/**
 * Helper to retrieve all equipped items (armors, story items, weapons) from character data.
 * @param {object} d - Character data object
 * @returns {Array<object>} List of equipped item objects
 */
export function getAllEquippedItems(d) {
    if (!d || !d.inventory) return [];
    return [
        ...(d.inventory.armors || []),
        ...(d.inventory.story || []),
        ...(d.inventory.weapons || [])
    ].filter(a => a && a.equipped);
}
