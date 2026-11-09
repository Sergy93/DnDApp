import DND_RULES from '../../dnd-data/dnd-rules.json' with { type: "json" };

const SPELL_SLOTS_TABLES = DND_RULES.spellSlotsTables;
import { normalizeKey } from '../../helpers/string.helper.js';
import { SpellService } from '../../domain/spells/spell.service.js';
import { ClassProgressionService } from '../../domain/progression/class-progression.service.js';
import { collectActionFeatures } from '../../helpers/action-collector.helper.js';
import { createMemo } from '../../helpers/memo.helper.js';
import { ABILITIES, ACTION_TYPES } from '../../domain/constants/dnd.constants.js';

/**
 * Spells, Spellbook, Spell Slot Casting, and Concentration Override slice.
 */
export function createSpellsSlice() {
    const memoizedResolvedSpells = createMemo(
        function() {
            const _rev = this.equipRevision;
            const totalLevel = this.stats.totalLevel;
            const maxSlot = this.maxSlotLevel;
            const spellAttrKey = this.stats.spellStat || this.stats.spellcastingAttrKey || ABILITIES.CHA;
            const spellAttrMod = (this.stats.computedAttrs?.[spellAttrKey] || this.stats.computedAttrs?.[ABILITIES.CHA])?.mod ?? 0;

            // 1. Spells defined on the character (exclude any static sourceType === 'item')
            const list = (this.data.magic?.spells || []).filter(sp => sp && sp.sourceType !== 'item');
            const seen = new Set(list.map(s => normalizeKey(s.name)));

            // 2. Spells dynamically granted by ALL EQUIPPED armors / accessories / story items / weapons
            const allEquipped = this.allEquipped || [];

            allEquipped.forEach(item => {
                const granted = Array.isArray(item.grantedSpells) ? item.grantedSpells : [];
                granted.forEach(spellName => {
                    const cleanName = String(spellName).trim();
                    const norm = normalizeKey(cleanName);
                    if (cleanName && !seen.has(norm)) {
                        seen.add(norm);
                        list.push({
                            name: cleanName,
                            source: item.name,
                            sourceType: 'item',
                            isItemGranted: true
                        });
                    }
                });
            });

            return list.map(sp => {
                const resolved = SpellService.resolveSpellData(sp, totalLevel, maxSlot, spellAttrMod);
                resolved.isFavorite = this.isSpellFavorite(sp.name);
                resolved.isItemGranted = !!sp.isItemGranted || sp.sourceType === 'item';
                resolved.prepared = sp.prepared !== false;
                resolved.alwaysPrepared = !!sp.alwaysPrepared;
                return resolved;
            });
        },
        function() {
            const spellsSig = (this.data?.magic?.spells || []).map(s => `${s.name}:${s.prepared !== false}`).join(',');
            const favsSig = (this.data?.magic?.favorites || []).join(',');
            return `${this.equipRevision}|${this.stats?.totalLevel}|${this.stats?.spellStat}|${this.maxSlotLevel}|${spellsSig}|${favsSig}`;
        }
    );

    const memoizedCastSlotOptions = createMemo(
        function() {
            const sp = this.selectedCastSpell;
            if (!sp) return [];

            if (sp.level === 0) {
                return [{
                    key: 'cantrip',
                    type: 'cantrip',
                    label: '✨ Cantrip — At Will (0 Slots Required)',
                    available: 1,
                    max: 1,
                    canCast: true,
                    castLevel: 0,
                    scaledDamage: sp.damage
                }];
            }

            const options = [];
            const normSpell = normalizeKey(sp.name);

            // 1. Check matching combat resources (Item / Feat / Racial innate uses)
            (this.computedCombatResources || []).forEach(r => {
                if (!r || !r.name) return;
                const resetLower = String(r.reset || '').toLowerCase();
                if (resetLower.includes('cantrip')) return;
                if (normalizeKey(r.name).includes(normSpell)) {
                    const spentArr = this.data.combat?.resources?.[r.originalIndex]?.spent || [];
                    const avail = spentArr.filter(s => !s).length;
                    const max = spentArr.length || 1;
                    options.push({
                        key: `res:${r.originalIndex}`,
                        type: 'resource',
                        resIndex: r.originalIndex,
                        resourceName: r.displayName || r.name,
                        label: `${r.displayName || r.name} (${avail}/${max} available)${avail === 0 ? ' — ❌ No charges remaining' : ' — Free Cast (Item/Feat)'}`,
                        available: avail,
                        max,
                        canCast: avail > 0,
                        castLevel: sp.level,
                        scaledDamage: sp.damage
                    });
                }
            });

            // 2. Check all spell slots of level >= spell.level (never hidden when 0 available)
            (this.data.magic?.slots || []).forEach((slot, sIdx) => {
                const slotLvl = this.resolveSlotNumericLevel(slot);
                if (slotLvl >= sp.level) {
                    const spentArr = Array.isArray(slot.spent) ? slot.spent : [];
                    const avail = spentArr.filter(s => !s).length;
                    const max = spentArr.length || slot.max || 0;
                    const isUpcast = slotLvl > sp.level;
                    const scaledDmg = (isUpcast && sp.higherLevelScale && sp.damage && sp.damage !== '—')
                        ? SpellService.calculateSlotDamage(sp.damage, sp.higherLevelScale, sp.level, slotLvl)
                        : sp.damage;
                    const upcastTag = isUpcast
                        ? ` [Upcast Lvl ${slotLvl}${scaledDmg && scaledDmg !== sp.damage ? ` → ${scaledDmg}` : ''}]`
                        : '';
                    const statusTag = avail === 0 ? ' — ❌ No slots remaining' : '';
                    options.push({
                        key: `slot:${sIdx}`,
                        type: 'slot',
                        slotIndex: sIdx,
                        slotName: slot.level,
                        slotLevel: slotLvl,
                        label: `${slot.level}${upcastTag} (${avail}/${max} available)${statusTag}`,
                        available: avail,
                        max,
                        canCast: avail > 0,
                        castLevel: slotLvl,
                        scaledDamage: scaledDmg
                    });
                }
            });

            if (options.length === 0) {
                options.push({
                    key: 'none',
                    type: 'none',
                    label: `❌ No Level ${sp.level}+ spell slots or item charges available`,
                    available: 0,
                    max: 0,
                    canCast: false,
                    castLevel: sp.level,
                    scaledDamage: sp.damage
                });
            }

            return options;
        },
        function() {
            const spName = this.selectedCastSpell?.name || '';
            const slotsSig = (this.data?.magic?.slots || []).map(s => (s.spent || []).join('')).join('|');
            const resSig = (this.data?.combat?.resources || []).map(r => (r.spent || []).join('')).join('|');
            return `${spName}|${slotsSig}|${resSig}`;
        }
    );

    return {
        currentSpellFilter: 'all',
        showFullSpellbook: false,

        // Spell Casting Modal
        modalCastSpellOpen: false,
        castSpellForm: {
            spellName: '',
            selectedSlotKey: '',
            slotKey: '',
            note: ''
        },

        // Spell Addition Modal
        modalSpellAddOpen: false,
        spellAddTab: 'compendium', // 'compendium' | 'manual'
        spellCompendiumSearch: '',
        spellCompendiumLevelFilter: 'all',
        selectedCompendiumSpell: null,
        spellCompendiumSource: 'Class',
        spellManualForm: {
            name: '',
            level: 1,
            actionType: ACTION_TYPES.ACTION,
            range: '60 ft',
            duration: 'Instantaneous',
            damage: '',
            conc: false,
            desc: '',
            source: 'Class'
        },

        // Concentration Override Modal
        modalConcOverrideOpen: false,
        pendingConcentrationSpell: null,

        // Getters
        get allCompendiumSpellsList() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumCount || 0);
            if (!SpellService.isLoaded && SpellService.spellsCompendium.length === 0) {
                SpellService.loadCompendium().then(c => {
                    this.compendiumCount = c;
                    this.compendiumRevision = (this.compendiumRevision || 0) + 1;
                });
            }
            return [...SpellService.spellsCompendium].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
        },

        get maxSlotLevel() {
            const slots = this.data.magic?.slots || [];
            let maxLvl = 1;
            for (const s of slots) {
                const match = String(s.level || s.id || '').match(/(\d+)/);
                if (match) {
                    const lvl = parseInt(match[1], 10);
                    if (!isNaN(lvl) && lvl > maxLvl) maxLvl = lvl;
                }
            }
            return maxLvl;
        },

        get allResolvedSpells() {
            return memoizedResolvedSpells.call(this);
        },

        get favoriteSpells() {
            const list = this.allResolvedSpells.filter(sp => sp.isFavorite);
            return this.sortSpellsByCategory(list);
        },

        sortSpellsByCategory(spellsList) {
            const getCategoryRank = (sp) => {
                const hasDamage = sp.damage && sp.damage !== '—';
                if (hasDamage) return 1;    // 1: Damage
                if (sp.isHealing) return 2;  // 2: Heal
                return 3;                   // 3: Utility
            };

            return [...spellsList].sort((a, b) => {
                const rankA = getCategoryRank(a);
                const rankB = getCategoryRank(b);
                if (rankA !== rankB) return rankA - rankB;
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
            });
        },

        get combatSpells() {
            return this.favoriteSpells;
        },

        get castableSpellsList() {
            return [...this.allResolvedSpells].sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level;
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
            });
        },

        get selectedCastSpell() {
            const list = this.castableSpellsList;
            if (list.length === 0) return null;
            if (this.castSpellForm.spellName) {
                const found = list.find(s => normalizeKey(s.name) === normalizeKey(this.castSpellForm.spellName));
                if (found) return found;
            }
            return list[0];
        },

        resolveSlotNumericLevel(slot) {
            if (!slot) return 1;
            const idStr = String(slot.id || '').toLowerCase();
            const lvlStr = String(slot.level || '').toLowerCase();
            if (idStr === 'pact' || lvlStr.includes('pact')) {
                const classes = this.data.identity?.classes || [];
                const warlock = classes.find(c => (ClassProgressionService.findCompendiumClass(c?.name)?.key || normalizeKey(c?.name)) === 'warlock');
                const wLvl = Math.min(20, Math.max(1, parseInt(warlock?.level, 10) || 1));
                return SPELL_SLOTS_TABLES.warlockPactSlots?.[wLvl]?.level || 1;
            }
            const idMatch = idStr.match(/lvl(\d+)/);
            if (idMatch) return parseInt(idMatch[1], 10) || 1;
            const lvlMatch = lvlStr.match(/(\d+)(?:st|nd|rd|th)/);
            if (lvlMatch) return parseInt(lvlMatch[1], 10) || 1;
            return 1;
        },

        get castSpellSlotOptions() {
            return memoizedCastSlotOptions.call(this);
        },

        get selectedCastSlotOption() {
            const opts = this.castSpellSlotOptions;
            if (opts.length === 0) return null;
            const chosenKey = this.castSpellForm.selectedSlotKey || this.castSpellForm.slotKey;
            if (chosenKey) {
                const found = opts.find(o => o.key === chosenKey);
                if (found) return found;
            }
            return opts.find(o => o.canCast) || opts[0];
        },

        get filteredSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || ACTION_TYPES.ACTION).toLowerCase();
                const isBonus = act.includes('bonus');
                const isReaction = act.includes('react');
                const isAction = !isBonus && !isReaction;

                if (this.currentSpellFilter === ACTION_TYPES.ACTION) return isAction;
                if (this.currentSpellFilter === ACTION_TYPES.BONUS_ACTION) return isBonus;
                if (this.currentSpellFilter === ACTION_TYPES.REACTION) return isReaction;
                if (this.currentSpellFilter === 'conc') return sp.conc;
                return true;
            });
        },

        get filteredCompendiumSpells() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumCount || 0);
            if (!SpellService.isLoaded && SpellService.spellsCompendium.length === 0) {
                SpellService.loadCompendium().then(c => {
                    this.compendiumCount = c;
                    this.compendiumRevision = (this.compendiumRevision || 0) + 1;
                });
            }

            const currentSpellKeys = new Set();
            (this.data.magic?.spells || []).forEach(s => {
                if (!s || !s.name) return;
                currentSpellKeys.add(normalizeKey(s.name));
            });

            const q = normalizeKey(this.spellCompendiumSearch);
            const lvl = this.spellCompendiumLevelFilter;
            let list = SpellService.spellsCompendium || [];

            // Exclude spells already owned by character
            list = list.filter(s => {
                const k = normalizeKey(s.name);
                return !currentSpellKeys.has(k);
            });

            if (lvl !== 'all') {
                const targetLvl = parseInt(lvl, 10);
                list = list.filter(s => s.level === targetLvl);
            }
            if (q) {
                list = list.filter(s => normalizeKey(s.name).includes(q));
            }
            return list.slice(0, 50);
        },

        get actionCantrips() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || 'action').toLowerCase();
                const isBonus = act.includes('bonus');
                const isReaction = act.includes('react');
                return sp.level === 0 && !isBonus && !isReaction;
            });
        },

        get bonusSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('bonus');
            });
        },

        get reactionSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('react');
            });
        },

        get dynamicBonusActions() {
            return collectActionFeatures('bonus', {
                resources: this.computedCombatResources,
                traits: this.data.combat?.traits,
                equipped: this.allEquipped,
                bardicDie: this.stats.bardicDie || '1d8'
            });
        },

        get dynamicReactionActions() {
            return collectActionFeatures(ACTION_TYPES.REACTION, {
                resources: this.computedCombatResources,
                traits: this.data.combat?.traits,
                equipped: this.allEquipped,
                bardicDie: this.stats.bardicDie || '1d8'
            });
        },

        get bonusResourcesAndTraits() {
            const items = [];
            (this.data.combat?.resources || []).forEach(r => {
                const cost = (r.actionCost || '').toLowerCase();
                if (cost.includes('bonus')) items.push(r.name);
            });
            (this.data.combat?.traits || []).forEach(t => {
                const desc = (t.desc || '').toLowerCase();
                if (desc.includes('action: bonus') || desc.includes('bonus action')) items.push(t.name);
            });
            return items;
        },

        // Spell Methods
        openCastSpellModal(preselectedSpellName = null) {
            const list = this.castableSpellsList;
            let chosenName = '';
            if (preselectedSpellName) {
                const found = list.find(s => normalizeKey(s.name) === normalizeKey(preselectedSpellName));
                if (found) chosenName = found.name;
            }
            if (!chosenName && list.length > 0) {
                chosenName = list[0].name;
            }
            this.castSpellForm = {
                spellName: chosenName,
                selectedSlotKey: '',
                slotKey: '',
                note: ''
            };
            this.onCastSpellSelectionChange();
            this.modalCastSpellOpen = true;
        },

        onCastSpellSelectionChange() {
            const opts = this.castSpellSlotOptions;
            const firstAvailable = opts.find(o => o.canCast);
            const key = firstAvailable ? firstAvailable.key : (opts[0]?.key || '');
            this.castSpellForm.selectedSlotKey = key;
            this.castSpellForm.slotKey = key;
        },

        async executeCastSpell() {
            const sp = this.selectedCastSpell;
            const opt = this.selectedCastSlotOption;
            if (!sp || !opt) return;

            if (!opt.canCast) {
                await this.uiAlert(
                    `Cannot cast "${sp.name}": the selected slot or resource (${opt.label}) has 0 uses remaining.`,
                    "No Slots Available",
                    "⚠️"
                );
                return;
            }

            let slotSummary = 'as a Cantrip (0 slots)';
            if (opt.type === 'slot') {
                const slotObj = this.data.magic?.slots?.[opt.slotIndex];
                if (slotObj && Array.isArray(slotObj.spent)) {
                    const freeIdx = slotObj.spent.findIndex(s => !s);
                    if (freeIdx === -1) {
                        await this.uiAlert(`No available slots remaining in ${slotObj.level}.`, "No Slots Available", "⚠️");
                        return;
                    }
                    slotObj.spent[freeIdx] = true;
                    const rem = slotObj.spent.filter(s => !s).length;
                    slotSummary = `using ${slotObj.level}${opt.castLevel > sp.level ? ` [Upcast Lvl ${opt.castLevel}]` : ''} (${rem}/${slotObj.spent.length} slots left)`;
                }
            } else if (opt.type === 'resource') {
                const resObj = this.data.combat?.resources?.[opt.resIndex];
                if (resObj && Array.isArray(resObj.spent)) {
                    const freeIdx = resObj.spent.findIndex(s => !s);
                    if (freeIdx === -1) {
                        await this.uiAlert(`No charges remaining for ${opt.resourceName}.`, "No Charges Available", "⚠️");
                        return;
                    }
                    resObj.spent[freeIdx] = true;
                    const rem = resObj.spent.filter(s => !s).length;
                    slotSummary = `using "${opt.resourceName}" (${rem}/${resObj.spent.length} charges left)`;
                }
            }

            const effectParts = [];
            if (opt.scaledDamage && opt.scaledDamage !== '—') {
                effectParts.push(sp.isHealing ? `Heal: ${opt.scaledDamage}` : `Dmg: ${opt.scaledDamage}`);
            }
            if (sp.useSpellDc) {
                effectParts.push(`Save: DC ${this.stats.spellDC} ${sp.saveStat}`);
            } else if (!sp.isHealing && opt.scaledDamage && opt.scaledDamage !== '—') {
                effectParts.push(`Atk: ${this.stats.spellAtkStr}`);
            }
            const effectStr = effectParts.length > 0 ? ` [${effectParts.join(' • ')}]` : '';

            this.logEvent(
                '✨',
                `Spell Cast: ${sp.name}`,
                `Cast "${sp.name}" ${slotSummary}${effectStr}.`,
                this.castSpellForm.note
            );

            if (sp.conc) {
                this.setConcentration(sp.name);
            }

            this.modalCastSpellOpen = false;
        },

        openAddSpellModal() {
            if (!SpellService.isLoaded && SpellService.spellsCompendium.length === 0) {
                SpellService.loadCompendium().then(c => { this.compendiumCount = c; });
            }
            this.spellCompendiumSearch = '';
            this.spellCompendiumLevelFilter = 'all';
            this.selectedCompendiumSpell = null;
            const defaultSource = this.data.identity?.classes?.[0]?.name || 'Class';
            this.spellCompendiumSource = defaultSource;
            this.spellManualForm = {
                name: '',
                level: 1,
                actionType: ACTION_TYPES.ACTION,
                range: '60 ft',
                duration: 'Instantaneous',
                damage: '',
                conc: false,
                desc: '',
                source: defaultSource
            };
            this.modalSpellAddOpen = true;
        },

        addSpellFromCompendium(compSpell) {
            if (!compSpell || !compSpell.name) return;
            if (!Array.isArray(this.data.magic.spells)) this.data.magic.spells = [];

            const compKey = normalizeKey(compSpell.name);
            const exists = this.data.magic.spells.some(s => normalizeKey(s.name) === compKey);
            if (exists) {
                this.uiAlert(`"${compSpell.name}" is already in your spellbook.`, "Already Known", "ℹ️");
                return;
            }

            this.data.magic.spells.push({
                name: compSpell.name,
                source: this.spellCompendiumSource,
                sourceType: this.spellCompendiumSource.toLowerCase()
            });
            this.logEvent('📖', 'Spell Learned', `Added "${compSpell.name}" to spellbook (Source: ${this.spellCompendiumSource}).`);
            this.equipRevision++;
            this.saveState();
            this.modalSpellAddOpen = false;
            this.uiAlert(`Added "${compSpell.name}" to your spellbook.`, "Spell Added", "✨");
        },

        handleSaveManualSpell() {
            const name = this.spellManualForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.magic.spells)) this.data.magic.spells = [];

            const exists = this.data.magic.spells.some(s => normalizeKey(s.name) === normalizeKey(name));
            if (exists) {
                this.uiAlert(`A spell named "${name}" already exists.`, "Notice", "⚠️");
                return;
            }

            const lvl = parseInt(this.spellManualForm.level, 10) || 0;
            this.data.magic.spells.push({
                name,
                level: lvl,
                actionType: this.spellManualForm.actionType,
                range: this.spellManualForm.range.trim(),
                duration: this.spellManualForm.duration.trim(),
                damage: this.spellManualForm.damage.trim() || '—',
                conc: !!this.spellManualForm.conc,
                desc: this.spellManualForm.desc.trim(),
                source: this.spellManualForm.source.trim() || 'Custom',
                sourceType: 'custom'
            });

            this.logEvent('📖', 'Custom Spell Created', `Created custom spell "${name}" (Level ${lvl}).`);
            this.equipRevision++;
            this.saveState();
            this.modalSpellAddOpen = false;
            this.uiAlert(`Custom spell "${name}" created.`, "Spell Created", "✨");
        },

        async removeSpell(spellName) {
            if (!spellName) return;
            const isGrantedByItem = (this.allEquipped || []).some(item =>
                (item.grantedSpells || []).some(s => normalizeKey(s) === normalizeKey(spellName))
            );
            if (isGrantedByItem) {
                await this.uiAlert(`"${spellName}" is granted by an equipped item. To remove it, unequip the item.`, "Item Spell", "📦");
                return;
            }
            const ok = await this.uiConfirm(`Do you want to remove "${spellName}" from your spellbook?`, "Remove Spell", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.magic.spells = (this.data.magic.spells || []).filter(s => normalizeKey(s.name) !== normalizeKey(spellName));
            this.logEvent('🗑️', 'Spell Removed', `Removed spell "${spellName}" from spellbook.`);
            this.equipRevision++;
            this.saveState();
        },

        toggleSpellFavorite(spellName) {
            if (!spellName) return;
            const norm = normalizeKey(spellName);
            if (!Array.isArray(this.data.magic.favorites)) this.data.magic.favorites = [];
            const idx = this.data.magic.favorites.indexOf(norm);
            if (idx >= 0) {
                this.data.magic.favorites.splice(idx, 1);
            } else {
                this.data.magic.favorites.push(norm);
            }

            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            if (sp) {
                sp.favorite = this.data.magic.favorites.includes(norm);
            }
            this.saveState();
        },

        isSpellFavorite(spellName) {
            if (!spellName) return false;
            const norm = normalizeKey(spellName);
            if (Array.isArray(this.data.magic?.favorites) && this.data.magic.favorites.includes(norm)) {
                return true;
            }
            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            return !!sp?.favorite;
        },

        toggleSpellPrepared(spellName) {
            if (!spellName) return;
            const norm = normalizeKey(spellName);
            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            if (sp) {
                if (sp.level === 0 || sp.isItemGranted || sp.alwaysPrepared) return;
                sp.prepared = sp.prepared === false ? true : false;
                this.equipRevision++;
                this.saveState();
            }
        },

        isSpellPrepared(spellName) {
            if (!spellName) return true;
            const norm = normalizeKey(spellName);
            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            if (!sp) return true;
            if (sp.level === 0 || sp.isItemGranted || sp.alwaysPrepared) return true;
            return sp.prepared !== false;
        },

        openSpellDetail(spell) {
            if (!spell) return;
            const meta = [];
            meta.push(spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`);
            meta.push(spell.actionType === ACTION_TYPES.BONUS_ACTION ? 'Bonus Action' : (spell.actionType === ACTION_TYPES.REACTION ? 'Reaction' : 'Action'));
            if (spell.range) meta.push(`Range: ${spell.range}`);
            if (spell.duration) meta.push(`Duration: ${spell.duration}`);
            if (spell.useSpellDc) meta.push(`Save: ${spell.saveStat || ''} (DC ${this.stats.spellDC})`);
            if (spell.damage && spell.damage !== '—') meta.push(`Base Damage: ${spell.damage}`);

            const header = meta.join(' • ');

            let scalingText = '';
            if (spell.slotScaling && spell.slotScaling.length > 0) {
                scalingText = '\n\n✨ Higher Level Scaling:\n' + spell.slotScaling.map(s => `• ${s.label}: ${s.damage}`).join('\n');
            }

            const fullMessage = `${header}\n\n${spell.desc}${scalingText}`;
            this.uiAlert(fullMessage, `${spell.name}`, '📜');
        },

        requestCastConcentration(spellName) {
            if (this.data.concentration?.active && this.data.concentration?.spellName) {
                if (this.data.concentration.spellName.toLowerCase() === spellName.toLowerCase()) {
                    this.breakConcentration();
                    return;
                }
                this.pendingConcentrationSpell = spellName;
                this.modalConcOverrideOpen = true;
                return;
            }
            this.setConcentration(spellName);
        },

        closeConcentrationModal(proceed) {
            this.modalConcOverrideOpen = false;
            if (proceed && this.pendingConcentrationSpell) {
                this.setConcentration(this.pendingConcentrationSpell);
            }
            this.pendingConcentrationSpell = null;
        }
    };
}
