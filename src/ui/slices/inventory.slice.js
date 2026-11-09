import { ItemBonusHelper } from '../../helpers/item-bonus.helper.js';
import { getAllEquippedItems } from '../../domain/items/equipped-items.helper.js';
import {
    ARMOR_TYPES,
    WEAPON_ATTR_MODES,
    BASE_UNARMORED_AC,
    DEFAULT_SHIELD_AC_BONUS
} from '../../domain/constants/dnd.constants.js';

/**
 * Inventory, Weapons, Armor, Wealth, Consumables, Story Items, and Tools state slice.
 */
export function createInventorySlice() {
    return {
        equipRevision: 0,

        // Weapons
        modalWeaponOpen: false,
        editingWeaponIndex: null,
        weaponForm: {
            name: '',
            attrMode: WEAPON_ATTR_MODES.FINESSE,
            dice: '1d8',
            damageType: 'Piercing',
            propsRaw: ''
        },

        // Armor & Items selection temp fields
        selectedSpellToAdd: '',
        selectedResToAdd: '',
        selectedSkillAdvToAdd: '',
        storySpellToAdd: '',
        storyResToAdd: '',
        storySkillAdvToAdd: '',

        // Armor
        modalArmorOpen: false,
        editingArmorIndex: null,
        armorForm: {
            name: '',
            type: ARMOR_TYPES.LIGHT,
            baseAc: 12,
            stealthDisadv: false,
            special: '',
            grantedSpells: [],
            resistances: [],
            bonusAttr: '',
            attrMode: 'bonus', // 'bonus' | 'advantage'
            bonusAttrVal: 0,
            saveType: '',
            saveMode: 'bonus', // 'bonus' | 'advantage'
            saveVal: 0,
            advantageSkills: [],
            equipped: false
        },

        // Wealth
        modalWealthOpen: false,
        wealthManagerMode: 'add', // 'add' | 'spend'
        wealthForm: { pp: 0, gp: 0, sp: 0, ep: 0, cp: 0, reason: '' },

        // Consumables
        modalConsumableOpen: false,
        editingConsumableIndex: null,
        consumableForm: { name: '', qty: '1' },

        // Story Items
        modalStoryItemOpen: false,
        editingStoryItemIndex: null,
        storyItemForm: {
            name: '',
            desc: '',
            isSpecial: false,
            isMagic: true,
            equipped: false,
            grantedSpells: [],
            resistances: [],
            bonusAttr: '',
            attrMode: 'bonus', // 'bonus' | 'advantage'
            bonusAttrVal: 0,
            saveType: '',
            saveMode: 'bonus', // 'bonus' | 'advantage'
            saveVal: 0,
            advantageSkills: []
        },

        // Tools
        modalToolOpen: false,
        editingToolIndex: null,
        toolForm: { name: '', desc: '', icon: '🎒', isInstrument: false },

        // Getters
        get allEquipped() {
            return getAllEquippedItems(this.data);
        },

        get attunedCount() {
            return (this.allEquipped || []).filter(item => Boolean(item.attuned || item.requiresAttunement)).length;
        },

        get maxAttunementSlots() {
            return 3;
        },

        get sortedTools() {
            return [...(this.data?.inventory?.tools || [])].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
        },

        get sortedStoryItems() {
            return [...(this.data?.inventory?.story || [])].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
        },

        // Weapons Methods
        openWeaponModal(index = null) {
            this.editingWeaponIndex = index;
            if (index !== null) {
                const w = this.data.inventory.weapons[index];
                this.weaponForm = {
                    name: w.name || '',
                    attrMode: w.attrMode || WEAPON_ATTR_MODES.FINESSE,
                    dice: w.dice || '1d8',
                    damageType: w.damageType || 'Piercing',
                    propsRaw: (w.properties || []).join(', ')
                };
            } else {
                this.weaponForm = {
                    name: '',
                    attrMode: WEAPON_ATTR_MODES.FINESSE,
                    dice: '1d8',
                    damageType: 'Piercing',
                    propsRaw: ''
                };
            }
            this.modalWeaponOpen = true;
        },

        handleSaveWeapon() {
            const name = this.weaponForm.name.trim();
            if (!name) return;

            const properties = this.weaponForm.propsRaw
                ? this.weaponForm.propsRaw.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const weaponObj = {
                name,
                attrMode: this.weaponForm.attrMode,
                dice: this.weaponForm.dice.trim(),
                damageType: this.weaponForm.damageType.trim(),
                proficient: true,
                properties
            };

            const isEdit = this.editingWeaponIndex !== null;
            if (isEdit) {
                this.data.inventory.weapons[this.editingWeaponIndex] = weaponObj;
                this.logEvent('⚔️', 'Weapon Edited', `Updated weapon "${name}" (${weaponObj.dice} ${weaponObj.damageType}).`);
            } else {
                this.data.inventory.weapons.push(weaponObj);
                this.logEvent('⚔️', 'Weapon Added', `Added weapon "${name}" (${weaponObj.dice} ${weaponObj.damageType}).`);
            }

            this.modalWeaponOpen = false;
            this.editingWeaponIndex = null;
        },

        async removeWeapon(index) {
            const w = this.data.inventory?.weapons?.[index];
            if (!w) return;
            const ok = await this.uiConfirm(`Do you want to remove the weapon "${w.name}"?`, "Remove Weapon", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.inventory.weapons.splice(index, 1);
            this.logEvent('🗑️', 'Weapon Removed', `Removed weapon "${w.name}".`);
        },

        // Armor Methods
        openArmorModal(index = null) {
            this.editingArmorIndex = index;
            this.selectedSpellToAdd = '';
            this.selectedResToAdd = '';
            this.selectedSkillAdvToAdd = '';
            if (index !== null && this.data.inventory?.armors?.[index]) {
                const a = this.data.inventory.armors[index];
                this.armorForm = ItemBonusHelper.populateItemForm(a, {
                    type: a.type || ARMOR_TYPES.LIGHT,
                    baseAc: a.baseAc !== undefined ? a.baseAc : 12,
                    stealthDisadv: !!a.stealthDisadv,
                    special: a.special || ''
                });
            } else {
                this.armorForm = ItemBonusHelper.createEmptyItemForm({
                    type: ARMOR_TYPES.LIGHT,
                    baseAc: 12,
                    stealthDisadv: false,
                    special: ''
                });
            }
            this.modalArmorOpen = true;
        },

        addSpellToArmorForm() {
            ItemBonusHelper.addUniqueItem(this.armorForm.grantedSpells, this.selectedSpellToAdd);
            this.selectedSpellToAdd = '';
        },

        removeSpellFromArmorForm(idx) {
            ItemBonusHelper.removeIndex(this.armorForm.grantedSpells, idx);
        },

        addResToArmorForm() {
            ItemBonusHelper.addUniqueItem(this.armorForm.resistances, this.selectedResToAdd);
            this.selectedResToAdd = '';
        },

        removeResFromArmorForm(idx) {
            ItemBonusHelper.removeIndex(this.armorForm.resistances, idx);
        },

        addSkillAdvToArmorForm() {
            ItemBonusHelper.addUniqueItem(this.armorForm.advantageSkills, this.selectedSkillAdvToAdd);
            this.selectedSkillAdvToAdd = '';
        },

        removeSkillAdvFromArmorForm(idx) {
            ItemBonusHelper.removeIndex(this.armorForm.advantageSkills, idx);
        },

        handleSaveArmor() {
            const name = this.armorForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.armors)) this.data.inventory.armors = [];

            const isEdit = this.editingArmorIndex !== null;
            const existing = isEdit ? this.data.inventory.armors[this.editingArmorIndex] : null;

            const parsedAc = parseInt(this.armorForm.baseAc, 10);
            const baseAc = isNaN(parsedAc)
                ? (this.armorForm.type === ARMOR_TYPES.SHIELD ? DEFAULT_SHIELD_AC_BONUS : (this.armorForm.type === ARMOR_TYPES.ACCESSORY ? 0 : BASE_UNARMORED_AC))
                : Math.max(0, parsedAc);

            const grantedSpells = [...(this.armorForm.grantedSpells || [])];
            const resistances = [...(this.armorForm.resistances || [])];
            const advantageSkills = [...(this.armorForm.advantageSkills || [])];

            const statBonuses = ItemBonusHelper.parseStatBonuses(this.armorForm);

            const armorObj = {
                name,
                type: this.armorForm.type,
                baseAc,
                stealthDisadv: !!this.armorForm.stealthDisadv,
                equipped: existing ? !!existing.equipped : (this.armorForm.equipped || false),
                special: this.armorForm.special.trim(),
                grantedSpells,
                resistances,
                advantageSkills,
                statBonuses
            };

            this.equipRevision++;
            if (isEdit) {
                this.data.inventory.armors[this.editingArmorIndex] = armorObj;
                this.logEvent('🛡️', 'Armor/Item Edited', `Updated "${name}" (${armorObj.type}).`);
            } else {
                this.data.inventory.armors.push(armorObj);
                this.logEvent('🛡️', 'Armor/Item Added', `Added "${name}" (${armorObj.type}).`);
            }

            this.modalArmorOpen = false;
            this.editingArmorIndex = null;
        },

        async removeArmor(index) {
            const a = this.data.inventory?.armors?.[index];
            if (!a) return;
            const ok = await this.uiConfirm(`Do you want to remove the armor/protection "${a.name}"?`, "Remove Armor", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.inventory.armors.splice(index, 1);
            this.logEvent('🗑️', 'Armor/Item Removed', `Removed "${a.name}".`);
        },

        // Wealth Management
        openWealthModal(mode = 'add') {
            this.wealthManagerMode = mode === 'spend' ? 'spend' : 'add';
            this.wealthForm = { pp: 0, gp: 0, sp: 0, ep: 0, cp: 0, reason: '' };
            this.modalWealthOpen = true;
        },

        async applyWealthChange() {
            if (!this.data.inventory) this.data.inventory = {};
            if (!this.data.inventory.wealth) {
                this.data.inventory.wealth = { pp: 0, gp: 0, sp: 0, ep: 0, cp: 0 };
            }
            const w = this.data.inventory.wealth;
            const dPp = Math.max(0, parseInt(this.wealthForm.pp, 10) || 0);
            const dGp = Math.max(0, parseInt(this.wealthForm.gp, 10) || 0);
            const dSp = Math.max(0, parseInt(this.wealthForm.sp, 10) || 0);
            const dEp = Math.max(0, parseInt(this.wealthForm.ep, 10) || 0);
            const dCp = Math.max(0, parseInt(this.wealthForm.cp, 10) || 0);

            if (dPp === 0 && dGp === 0 && dSp === 0 && dEp === 0 && dCp === 0) {
                await this.uiAlert("Please enter at least 1 coin to add or spend.", "No Amount Entered", "🪙");
                return;
            }

            if (this.wealthManagerMode === 'spend') {
                if (dPp > (w.pp || 0) || dGp > (w.gp || 0) || dSp > (w.sp || 0) || dEp > (w.ep || 0) || dCp > (w.cp || 0)) {
                    await this.uiAlert(
                        `Insufficient coins for this transaction.\nCurrent balance: ${w.pp || 0} PP, ${w.gp || 0} GP, ${w.sp || 0} SP, ${w.ep || 0} EP, ${w.cp || 0} CP.`,
                        "Insufficient Funds",
                        "⚠️"
                    );
                    return;
                }
                w.pp = (w.pp || 0) - dPp;
                w.gp = (w.gp || 0) - dGp;
                w.sp = (w.sp || 0) - dSp;
                w.ep = (w.ep || 0) - dEp;
                w.cp = (w.cp || 0) - dCp;
            } else {
                w.pp = (w.pp || 0) + dPp;
                w.gp = (w.gp || 0) + dGp;
                w.sp = (w.sp || 0) + dSp;
                w.ep = (w.ep || 0) + dEp;
                w.cp = (w.cp || 0) + dCp;
            }

            const parts = [];
            if (dPp > 0) parts.push(`${dPp} PP`);
            if (dGp > 0) parts.push(`${dGp} GP`);
            if (dSp > 0) parts.push(`${dSp} SP`);
            if (dEp > 0) parts.push(`${dEp} EP`);
            if (dCp > 0) parts.push(`${dCp} CP`);

            const reason = (this.wealthForm.reason || '').trim();
            const isSpend = this.wealthManagerMode === 'spend';
            this.logEvent(
                '🪙',
                isSpend ? 'Coins Spent' : 'Coins Gained',
                `${isSpend ? 'Spent' : 'Gained'} ${parts.join(', ')}. Balance: ${w.pp || 0} PP, ${w.gp} GP, ${w.sp} SP, ${w.ep} EP, ${w.cp} CP.`,
                reason
            );

            this.saveState();
            this.modalWealthOpen = false;
        },

        // Consumables Management
        openConsumableModal(index = null) {
            this.editingConsumableIndex = index;
            if (index !== null && this.data.inventory?.consumables?.[index]) {
                const c = this.data.inventory.consumables[index];
                this.consumableForm = { name: c.name || '', qty: c.qty || '1' };
            } else {
                this.consumableForm = { name: '', qty: '1' };
            }
            this.modalConsumableOpen = true;
        },

        handleSaveConsumable() {
            const name = this.consumableForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.consumables)) this.data.inventory.consumables = [];

            const item = { name, qty: this.consumableForm.qty.trim() || '1' };
            const isEdit = this.editingConsumableIndex !== null;
            if (isEdit) {
                this.data.inventory.consumables[this.editingConsumableIndex] = item;
                this.logEvent('🧪', 'Consumable Edited', `Updated "${name}" (Qty: ${item.qty}).`);
            } else {
                this.data.inventory.consumables.push(item);
                this.logEvent('🧪', 'Consumable Added', `Added "${name}" (Qty: ${item.qty}).`);
            }
            this.modalConsumableOpen = false;
            this.editingConsumableIndex = null;
        },

        async removeConsumable(index) {
            const c = this.data.inventory?.consumables?.[index];
            if (!c) return;
            const ok = await this.uiConfirm(`Do you want to remove "${c.name}" from your consumables?`, "Remove Consumable", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.consumables.splice(index, 1);
            this.logEvent('🗑️', 'Consumable Removed', `Removed consumable "${c.name}".`);
        },

        adjustConsumableQty(index, delta) {
            const c = this.data.inventory?.consumables?.[index];
            if (!c) return;
            const prevQty = c.qty;
            const match = String(c.qty || '').match(/^(\d+)(.*)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                const suffix = match[2];
                const newNum = Math.max(0, num + delta);
                if (newNum === num) return;
                c.qty = `${newNum}${suffix}`;
            } else {
                const num = parseInt(c.qty, 10) || 0;
                const newNum = Math.max(0, num + delta);
                if (newNum === num) return;
                c.qty = String(newNum);
            }
            if (delta < 0) {
                this.logEvent('🧪', 'Consumable Used', `Used "${c.name}" (${prevQty} → ${c.qty} remaining).`);
            } else if (delta > 0) {
                this.logEvent('🧪', 'Consumable Restocked', `Increased "${c.name}" (${prevQty} → ${c.qty}).`);
            }
        },

        // Story Items Management
        openStoryItemModal(target = null) {
            let index = null;
            if (typeof target === 'number') {
                index = target;
            } else if (target && typeof target === 'object') {
                index = this.data.inventory?.story?.indexOf(target);
            }
            this.editingStoryItemIndex = (index !== null && index >= 0) ? index : null;
            this.storySpellToAdd = '';
            this.storyResToAdd = '';
            this.storySkillAdvToAdd = '';
            if (this.editingStoryItemIndex !== null && this.data.inventory?.story?.[this.editingStoryItemIndex]) {
                const st = this.data.inventory.story[this.editingStoryItemIndex];
                this.storyItemForm = ItemBonusHelper.populateItemForm(st, {
                    desc: st.desc || '',
                    isSpecial: !!st.isSpecial,
                    isMagic: st.isMagic !== undefined ? !!st.isMagic : true
                });
            } else {
                this.storyItemForm = ItemBonusHelper.createEmptyItemForm({
                    desc: '',
                    isSpecial: false,
                    isMagic: true
                });
            }
            this.modalStoryItemOpen = true;
        },

        addSpellToStoryForm() {
            ItemBonusHelper.addUniqueItem(this.storyItemForm.grantedSpells, this.storySpellToAdd);
            this.storySpellToAdd = '';
        },

        removeSpellFromStoryForm(idx) {
            ItemBonusHelper.removeIndex(this.storyItemForm.grantedSpells, idx);
        },

        addResToStoryForm() {
            ItemBonusHelper.addUniqueItem(this.storyItemForm.resistances, this.storyResToAdd);
            this.storyResToAdd = '';
        },

        removeResFromStoryForm(idx) {
            ItemBonusHelper.removeIndex(this.storyItemForm.resistances, idx);
        },

        addSkillAdvToStoryForm() {
            ItemBonusHelper.addUniqueItem(this.storyItemForm.advantageSkills, this.storySkillAdvToAdd);
            this.storySkillAdvToAdd = '';
        },

        removeSkillAdvFromStoryForm(idx) {
            ItemBonusHelper.removeIndex(this.storyItemForm.advantageSkills, idx);
        },

        handleSaveStoryItem() {
            const name = this.storyItemForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.story)) this.data.inventory.story = [];

            const isEdit = this.editingStoryItemIndex !== null && this.editingStoryItemIndex >= 0;
            const existing = isEdit ? this.data.inventory.story[this.editingStoryItemIndex] : null;

            const grantedSpells = [...(this.storyItemForm.grantedSpells || [])];
            const resistances = [...(this.storyItemForm.resistances || [])];
            const advantageSkills = [...(this.storyItemForm.advantageSkills || [])];

            const statBonuses = ItemBonusHelper.parseStatBonuses(this.storyItemForm);

            const item = {
                name,
                desc: this.storyItemForm.desc.trim(),
                isSpecial: !!this.storyItemForm.isSpecial,
                isMagic: !!this.storyItemForm.isMagic,
                equipped: existing ? !!existing.equipped : (this.storyItemForm.equipped || false),
                grantedSpells,
                resistances,
                advantageSkills,
                statBonuses
            };

            this.equipRevision++;
            if (isEdit) {
                this.data.inventory.story[this.editingStoryItemIndex] = item;
                this.logEvent('✨', 'Item Edited', `Updated item "${name}".`);
            } else {
                this.data.inventory.story.push(item);
                this.logEvent('✨', 'Item Added', `Added item "${name}".`);
            }
            this.modalStoryItemOpen = false;
            this.editingStoryItemIndex = null;
        },

        toggleEquipItem(item) {
            if (!item) return;
            item.equipped = !item.equipped;
            this.equipRevision++;
            this.checkAttunementLimit(item);
            this.saveState();
        },

        onEquipChange(item) {
            if (!item) return;
            this.equipRevision++;
            this.checkAttunementLimit(item);
            this.saveState();
        },

        checkAttunementLimit(item) {
            if (item && item.equipped && (item.requiresAttunement || item.attuned) && this.attunedCount > this.maxAttunementSlots) {
                this.uiAlert(
                    `You currently have ${this.attunedCount} attuned items equipped. According to D&D 5e rules (DMG p. 136), a character can be attuned to a maximum of 3 magic items at a time.`,
                    "Attunement Limit Exceeded (3)",
                    "🔮"
                );
            }
        },

        async removeStoryItem(target) {
            const index = typeof target === 'number' ? target : this.data.inventory?.story?.indexOf(target);
            if (index === null || index === undefined || index < 0) return;
            const st = this.data.inventory?.story?.[index];
            if (!st) return;
            const ok = await this.uiConfirm(`Do you want to remove "${st.name}"?`, "Remove Item", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.story.splice(index, 1);
            this.logEvent('🗑️', 'Item Removed', `Removed item "${st.name}".`);
        },

        // Tools & Equipment Management
        openToolModal(target = null) {
            let index = null;
            if (typeof target === 'number') {
                index = target;
            } else if (target && typeof target === 'object') {
                index = this.data.inventory?.tools?.indexOf(target);
            }
            this.editingToolIndex = (index !== null && index >= 0) ? index : null;
            if (this.editingToolIndex !== null && this.data.inventory?.tools?.[this.editingToolIndex]) {
                const t = this.data.inventory.tools[this.editingToolIndex];
                this.toolForm = {
                    name: t.name || '',
                    desc: t.desc || '',
                    icon: t.icon || '🎒',
                    isInstrument: !!t.isInstrument
                };
            } else {
                this.toolForm = { name: '', desc: '', icon: '🎒', isInstrument: false };
            }
            this.modalToolOpen = true;
        },

        handleSaveTool() {
            const name = this.toolForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.tools)) this.data.inventory.tools = [];

            const item = {
                name,
                desc: this.toolForm.desc.trim(),
                icon: this.toolForm.icon || '🎒',
                isInstrument: !!this.toolForm.isInstrument
            };

            const isEdit = this.editingToolIndex !== null && this.editingToolIndex >= 0;
            if (isEdit) {
                this.data.inventory.tools[this.editingToolIndex] = item;
                this.logEvent('🎒', 'Tool Edited', `Updated tool/equipment "${name}".`);
            } else {
                this.data.inventory.tools.push(item);
                this.logEvent('🎒', 'Tool Added', `Added tool/equipment "${name}".`);
            }
            this.modalToolOpen = false;
            this.editingToolIndex = null;
        },

        async removeTool(target) {
            const index = typeof target === 'number' ? target : this.data.inventory?.tools?.indexOf(target);
            if (index === null || index === undefined || index < 0) return;
            const t = this.data.inventory?.tools?.[index];
            if (!t) return;
            const ok = await this.uiConfirm(`Do you want to remove "${t.name}" from your tools & equipment?`, "Remove Tool", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.tools.splice(index, 1);
            this.logEvent('🗑️', 'Tool Removed', `Removed tool/equipment "${t.name}".`);
        }
    };
}
