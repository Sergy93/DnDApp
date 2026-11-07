/**
 * Helper for managing item stat bonuses and form collection modifications (spells, resistances, advantages).
 */
export class ItemBonusHelper {
    /**
     * Extracts and validates statBonuses object from an armor or story item form.
     * @param {Object} form
     * @returns {Object}
     */
    static parseStatBonuses(form = {}) {
        const statBonuses = {};
        if (form.bonusAttr) {
            statBonuses.attr = form.bonusAttr;
            statBonuses.attrMode = form.attrMode || 'bonus';
            if (statBonuses.attrMode === 'bonus') {
                const val = parseInt(form.bonusAttrVal, 10) || 0;
                if (val) {
                    statBonuses[form.bonusAttr] = val;
                    statBonuses.attrVal = val;
                }
            }
        }
        if (form.saveType) {
            statBonuses.saveType = form.saveType;
            statBonuses.saveMode = form.saveMode || 'bonus';
            if (statBonuses.saveMode === 'bonus') {
                const saveVal = parseInt(form.saveVal, 10) || 0;
                if (saveVal) {
                    statBonuses.saveVal = saveVal;
                }
            }
        }
        return statBonuses;
    }

    /**
     * Adds a trimmed unique item to a target array.
     * @param {Array} list
     * @param {string} rawItem
     * @returns {Array}
     */
    static addUniqueItem(list, rawItem) {
        const target = Array.isArray(list) ? list : [];
        const item = (rawItem || '').trim();
        if (!item) return target;
        if (!target.includes(item)) {
            target.push(item);
        }
        return target;
    }

    /**
     * Removes an item at a specific index from an array.
     * @param {Array} list
     * @param {number} idx
     * @returns {Array}
     */
    static removeIndex(list, idx) {
        if (Array.isArray(list) && typeof idx === 'number' && idx >= 0 && idx < list.length) {
            list.splice(idx, 1);
        }
        return list;
    }
}
