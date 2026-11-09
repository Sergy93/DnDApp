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

    /**
     * Creates an empty item effect form configuration.
     * @param {Object} [overrides={}]
     * @returns {Object}
     */
    static createEmptyItemForm(overrides = {}) {
        return {
            name: '',
            grantedSpells: [],
            resistances: [],
            bonusAttr: '',
            attrMode: 'bonus',
            bonusAttrVal: 0,
            saveType: '',
            saveMode: 'bonus',
            saveVal: 0,
            advantageSkills: [],
            equipped: false,
            ...overrides
        };
    }

    /**
     * Populates form fields from an existing item.
     * @param {Object} item
     * @param {Object} [overrides={}]
     * @returns {Object}
     */
    static populateItemForm(item = {}, overrides = {}) {
        const sb = item.statBonuses || {};
        return {
            name: item.name || '',
            grantedSpells: Array.isArray(item.grantedSpells) ? [...item.grantedSpells] : [],
            resistances: Array.isArray(item.resistances) ? [...item.resistances] : [],
            bonusAttr: sb.attr || '',
            attrMode: sb.attrMode || (sb.attrVal ? 'bonus' : 'advantage'),
            bonusAttrVal: sb.attrVal || 0,
            saveType: sb.saveType || '',
            saveMode: sb.saveMode || (sb.saveVal ? 'bonus' : 'advantage'),
            saveVal: sb.saveVal || 0,
            advantageSkills: Array.isArray(item.advantageSkills) ? [...item.advantageSkills] : [],
            equipped: Boolean(item.equipped),
            ...overrides
        };
    }
}
