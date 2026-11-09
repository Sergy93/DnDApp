import DND_RULES from '../../dnd-data/dnd-rules.json' with { type: "json" };
import CHARACTER_DATA from '../../character.json' with { type: "json" };
import { ClassProgressionService } from '../../domain/progression/class-progression.service.js';
import { StorageService } from '../../services/storage.service.js';

const DND_CONDITIONS = DND_RULES.conditions;
const STORAGE_KEY = 'character_dnd_v21';

/**
 * Vitals, Health, Resting, Conditions, Concentration, Inspiration, and Session Event Log slice.
 */
export function createVitalsSlice() {
    return {
        // HP Manager
        modalHpManagerOpen: false,
        hpManagerMode: 'damage', // 'damage' | 'heal' | 'temp'
        hpManagerAmount: 1,
        hpManagerResistedAmount: 0,
        hpManagerResistanceType: '',

        // Conditions
        allConditions: DND_CONDITIONS,
        modalConditionsOpen: false,
        conditionDetailItem: null,

        // Short Rest
        modalShortRestOpen: false,
        shortRestClassIndex: 0,
        shortRestDiceSelected: 1,
        shortRestRolledHp: 0,
        shortRestConBonus: 0,
        shortRestUseSongOfRest: true,

        // Event Log
        modalLogOpen: false,

        // Getters
        get damageCalculation() {
            const rawTotal = Math.max(0, parseInt(this.hpManagerAmount, 10) || 0);
            const rawResisted = Math.min(rawTotal, Math.max(0, parseInt(this.hpManagerResistedAmount, 10) || 0));
            const normalPart = rawTotal - rawResisted;
            const halvedPart = Math.floor(rawResisted / 2);
            return {
                normalPart,
                resistedPart: rawResisted,
                halvedPart,
                finalDamage: normalPart + halvedPart,
                hasResistanceReduction: rawResisted > 0
            };
        },

        get activeConditionsList() {
            const active = Array.isArray(this.data?.conditions) ? this.data.conditions : [];
            return active.map(c => {
                const id = typeof c === 'string' ? c : c.id;
                const source = (typeof c === 'object' && c.source) ? c.source : 'Custom Effect';
                const found = (this.allConditions || []).find(item => item.id === id);
                if (found) {
                    return { ...found, source };
                }
                return {
                    id,
                    name: id.charAt(0).toUpperCase() + id.slice(1),
                    icon: '⚠️',
                    source,
                    summary: 'Condition active on character.',
                    effects: ['Effects defined by GM or situation.']
                };
            });
        },

        get availableHitDiceCount() {
            return (this.data?.vitals?.hitDiceSpent || []).filter(s => !s).length;
        },

        get totalHitDiceCount() {
            return (this.data?.identity?.classes || []).reduce((acc, c) => acc + (c.level || 0), 0);
        },

        get primaryHitDie() {
            return ClassProgressionService.resolveClassHitDie(this.data?.identity?.classes?.[0]);
        },

        get shortRestSelectedHitDie() {
            const cls = this.data?.identity?.classes?.[this.shortRestClassIndex] || this.data?.identity?.classes?.[0];
            return ClassProgressionService.resolveClassHitDie(cls) || 'd8';
        },

        getClassHitDie(cls) {
            return ClassProgressionService.resolveClassHitDie(cls) || 'd8';
        },

        get songOfRestDie() {
            return this.stats?.songOfRestDie;
        },

        get hasSongOfRest() {
            return !!this.songOfRestDie;
        },

        get shortRestHealingBonus() {
            if (this.stats?.songOfRestDie) {
                return { name: "Song of Rest", die: this.stats.songOfRestDie };
            }
            const feat = (this.data?.combat?.traits || []).find(t => /short rest.*extra.*(?:hp|hit points)/i.test(t.desc || ''));
            if (feat) {
                return { name: feat.name, die: '1d6' };
            }
            return null;
        },

        get shortRestRecharges() {
            const list = [];
            (this.data?.magic?.slots || []).forEach(s => {
                const r = (s.reset || '').toLowerCase();
                if (r.includes('short')) list.push(s.level);
            });
            (this.data?.combat?.resources || []).forEach(r => {
                const res = (r.reset || '').toLowerCase();
                if (res.includes('short')) list.push(r.name);
            });
            return list;
        },

        // HP Actions
        openHpManager(mode = 'damage') {
            this.hpManagerMode = mode;
            this.hpManagerAmount = 1;
            this.hpManagerResistedAmount = 0;
            const resList = this.stats?.resistances || [];
            this.hpManagerResistanceType = resList.length > 0 ? resList[0].name : '';
            this.modalHpManagerOpen = true;
        },

        applyHpManagerAction() {
            const amt = Math.max(0, parseInt(this.hpManagerAmount, 10) || 0);
            if (amt <= 0 && this.hpManagerMode !== 'temp') return;

            if (this.hpManagerMode === 'damage') {
                const calc = this.damageCalculation;
                if (calc.hasResistanceReduction) {
                    const resName = this.hpManagerResistanceType || 'Resisted';
                    const note = ` (${calc.normalPart} normal + ${calc.halvedPart} ${resName} [halved from ${calc.resistedPart}])`;
                    this.applyDamage(calc.finalDamage, note);
                } else {
                    this.applyDamage(calc.finalDamage);
                }
            } else if (this.hpManagerMode === 'heal') {
                this.applyHeal(amt);
            } else if (this.hpManagerMode === 'temp') {
                this.applyTempHp(amt);
            }
        },

        applyDamage(amount, note = '') {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            if (amount <= 0) return;

            const prevTemp = this.data.vitals.tempHp || 0;
            let remainingDamage = amount;

            if (prevTemp > 0) {
                if (remainingDamage >= prevTemp) {
                    remainingDamage -= prevTemp;
                    this.data.vitals.tempHp = 0;
                } else {
                    this.data.vitals.tempHp -= remainingDamage;
                    remainingDamage = 0;
                }
            }

            const prevHp = this.data.vitals.currentHp || 0;
            if (remainingDamage > 0) {
                this.data.vitals.currentHp = Math.max(0, prevHp - remainingDamage);
            }

            const curHp = this.data.vitals.currentHp;
            const maxHp = this.data.vitals.maxHp || 1;
            const curTemp = this.data.vitals.tempHp || 0;
            const tempStr = curTemp > 0 ? ` (Temp HP: ${curTemp})` : '';

            this.logEvent('💥', 'Damage Taken', `Took ${amount} damage${note}. Current HP: ${curHp}/${maxHp}${tempStr}.`);
            this.modalHpManagerOpen = false;

            if (this.data.vitals.currentHp === 0) {
                if (this.data.concentration?.active) {
                    const spellName = this.data.concentration.spellName;
                    this.breakConcentration('dropped to 0 HP');
                    this.logEvent('☠️', 'Fell Unconscious', `Dropped to 0 HP. Death saves required.`);
                    this.uiAlert(`You dropped to 0 HP (Unconscious). Concentration on "${spellName}" was lost immediately.`, "Fell Unconscious!", "☠️");
                } else {
                    this.logEvent('☠️', 'Fell Unconscious', `Dropped to 0 HP. Death saves required.`);
                    this.uiAlert("You dropped to 0 HP. You must now make death saving throws on your turns.", "0 Hit Points!", "☠️");
                }
            }

            if (amount > 0 && this.data.concentration?.active) {
                const dc = Math.max(10, Math.floor(amount / 2));
                const conModStr = this.stats?.computedAttrs?.CON?.saveStr || '+0';
                this.uiAlert(
                    `You took ${amount} damage${note}.\n\n⚠️ You must make a CONCENTRATION (CON) SAVING THROW with DC ${dc} to maintain concentration on "${this.data.concentration.spellName}".\n(Your CON save bonus is ${conModStr}).`,
                    "Concentration Check",
                    "🧠"
                );
            } else if (note) {
                this.uiAlert(`Applied ${amount} damage${note}.`, "Damage Applied", "🔥");
            }
        },

        applyHeal(amount) {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            if (amount <= 0) return;

            const max = this.data.vitals.maxHp || 1;
            const prev = this.data.vitals.currentHp || 0;
            this.data.vitals.currentHp = Math.min(max, prev + amount);

            if (prev === 0 && this.data.vitals.currentHp > 0) {
                this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
            }

            this.logEvent('💚', 'Healing Received', `Restored ${amount} HP. Current HP: ${this.data.vitals.currentHp}/${max}.`);
            this.modalHpManagerOpen = false;
        },

        applyTempHp(amount) {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            this.data.vitals.tempHp = amount;
            this.logEvent('🛡️', 'Temp HP', `Set Temporary HP to ${amount}.`);
            this.modalHpManagerOpen = false;
        },

        onDeathSaveChange(type = '', index = 0) {
            this.saveState();
            const fails = (this.data.deathSaves?.failures || []).filter(Boolean).length;
            const succs = (this.data.deathSaves?.successes || []).filter(Boolean).length;
            this.logEvent(
                type === 'failure' ? '☠️' : '✨',
                'Death Save Check',
                `Recorded ${type} (${succs}/3 successes, ${fails}/3 failures).`
            );
            if (fails >= 3) {
                this.uiAlert("You have suffered 3 death saving throw failures. Character is dead according to standard D&D 5e rules.", "Character Deceased", "💀");
            } else if (succs >= 3) {
                this.uiAlert("You succeeded on 3 death saving throws! You are now stable with 0 Hit Points.", "Stabilized!", "✨");
            }
        },

        // Conditions
        showConditionDetail(cond) {
            this.conditionDetailItem = cond;
            this.modalConditionsOpen = true;
        },

        hasCondition(condId) {
            const list = Array.isArray(this.data?.conditions) ? this.data.conditions : [];
            return list.some(c => (typeof c === 'string' ? c : c.id) === condId);
        },

        getConditionSource(condId) {
            const list = Array.isArray(this.data?.conditions) ? this.data.conditions : [];
            const found = list.find(c => (typeof c === 'string' ? c : c.id) === condId);
            return (found && typeof found === 'object' && found.source) ? found.source : 'Custom Effect';
        },

        async toggleCondition(condId) {
            if (!Array.isArray(this.data.conditions)) this.data.conditions = [];
            const idx = this.data.conditions.findIndex(c => (typeof c === 'string' ? c : c.id) === condId);

            if (idx >= 0) {
                const removed = this.data.conditions.splice(idx, 1)[0];
                const condName = typeof removed === 'string' ? removed : (removed.name || removed.id);
                this.logEvent('✨', 'Condition Cleared', `Removed condition: ${condName}.`);
                this.saveState();
            } else {
                const defaultSource = 'Unknown Source';
                const source = await this.uiPrompt(
                    `Enter the source, cause, or spell that inflicted this condition (or leave blank):`,
                    `Inflict Condition`,
                    defaultSource
                );
                if (source === null) return;

                const cObj = (this.allConditions || []).find(c => c.id === condId);
                const condName = cObj ? cObj.name : condId;
                const effectiveSource = source.trim() || 'Unknown Cause';

                this.data.conditions.push({
                    id: condId,
                    name: condName,
                    source: effectiveSource
                });

                if (['incapacitated', 'paralyzed', 'petrified', 'unconscious', 'stunned'].includes(condId)) {
                    if (this.data.concentration?.active) {
                        this.breakConcentration(`inflicted with ${condName}`);
                    }
                }

                this.logEvent('⚠️', 'Condition Gained', `Gained condition: ${condName} (Source: ${effectiveSource}).`);
                this.saveState();
            }
        },

        clearCondition(condId) {
            if (!Array.isArray(this.data.conditions)) return;
            const idx = this.data.conditions.findIndex(c => (typeof c === 'string' ? c : c.id) === condId);
            if (idx >= 0) {
                const removed = this.data.conditions.splice(idx, 1)[0];
                const condName = typeof removed === 'string' ? removed : (removed.name || removed.id);
                this.logEvent('✨', 'Condition Cleared', `Removed condition: ${condName}.`);
                this.saveState();
            }
        },

        clearAllConditions() {
            if (!Array.isArray(this.data.conditions) || this.data.conditions.length === 0) return;
            this.data.conditions = [];
            this.logEvent('✨', 'Conditions Cleared', `Cleared all active conditions.`);
            this.saveState();
        },

        // Concentration
        isConcentratingOn(spellName) {
            return !!(this.data.concentration?.active && this.data.concentration.spellName === spellName);
        },

        setConcentration(spellName) {
            const wasActive = !!this.data.concentration?.active;
            const prevSpell = this.data.concentration?.spellName;

            this.data.concentration = {
                active: true,
                spellName
            };

            if (wasActive && prevSpell !== spellName) {
                this.logEvent('🧠', 'Concentration Replaced', `Ended concentration on "${prevSpell}" to concentrate on "${spellName}".`);
            } else if (!wasActive) {
                this.logEvent('🧠', 'Concentration Started', `Started concentrating on "${spellName}".`);
            }
            this.saveState();
        },

        breakConcentration(reason = '') {
            const wasActive = !!this.data.concentration?.active;
            const prevSpell = this.data.concentration?.spellName;

            this.data.concentration = {
                active: false,
                spellName: ''
            };

            if (wasActive && prevSpell) {
                const title = reason ? 'Concentration Broken' : 'Concentration Dropped';
                const desc = reason ? `Concentration on "${prevSpell}" was broken (${reason}).` : `Stopped concentrating on "${prevSpell}".`;
                this.logEvent('🧠', title, desc);
            }
            this.saveState();
        },

        // Hit dice toggle
        onToggleHitDie(index) {
            const spent = !!this.data.vitals?.hitDiceSpent?.[index];
            this.logEvent(
                '🎲',
                spent ? 'Hit Die Spent' : 'Hit Die Restored',
                `${spent ? 'Marked' : 'Restored'} 1 Hit Die (${this.availableHitDiceCount}/${this.totalHitDiceCount} available).`
            );
        },

        // Rests
        openShortRestModal() {
            this.shortRestClassIndex = 0;
            this.shortRestDiceSelected = 1;
            this.modalShortRestOpen = true;
        },

        async applyShortRest(diceCount) {
            const count = parseInt(diceCount, 10) || 0;
            let availableIndices = [];
            this.data.vitals.hitDiceSpent.forEach((spent, i) => { if (!spent) availableIndices.push(i); });

            if (count > availableIndices.length) {
                await this.uiAlert(`You only have ${availableIndices.length} hit dice available.`, "Notice", "⚠️");
                return;
            }

            for (let i = 0; i < count; i++) {
                this.data.vitals.hitDiceSpent[availableIndices[i]] = true;
            }

            // Recharge short rest slots and resources
            let rechargedResources = [];
            (this.data.magic?.slots || []).forEach(s => {
                if ((s.reset || '').toLowerCase().includes('short')) {
                    if (Array.isArray(s.spent)) s.spent = s.spent.map(() => false);
                    rechargedResources.push(s.level);
                }
            });
            (this.data.combat?.resources || []).forEach(r => {
                if ((r.reset || '').toLowerCase().includes('short')) {
                    if (Array.isArray(r.spent)) r.spent = r.spent.map(() => false);
                    rechargedResources.push(r.name);
                }
            });

            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };

            let details = `Spent ${count} Hit Dice. Restored short rest resources: ${rechargedResources.join(', ') || 'None'}.`;
            this.logEvent('☕', 'Short Rest Completed', details);
            this.modalShortRestOpen = false;
            this.saveState();
            await this.uiAlert(`Short rest completed.\n• Hit Dice spent: ${count}\n• Recharged: ${rechargedResources.join(', ') || 'None'}\n• Death saves cleared.`, "Short Rest Completed", "☕");
        },

        async executeLongRest() {
            const confirmed = await this.uiConfirm("This will restore Hit Points, Spell Slots, class resources, and up to half your total Hit Dice (D&D 5e RAW).", "Take a Long Rest?", "🌙", "Rest");
            if (!confirmed) return;

            this.data.vitals.currentHp = this.data.vitals.maxHp;
            this.data.vitals.tempHp = 0;

            // D&D 5e RAW (PHB p. 186): regain spent Hit Dice up to half total (min 1)
            const totalHd = Array.isArray(this.data.vitals.hitDiceSpent) ? this.data.vitals.hitDiceSpent.length : 1;
            const maxRegained = Math.max(1, Math.floor(totalHd / 2));
            let regainedCount = 0;
            if (Array.isArray(this.data.vitals.hitDiceSpent)) {
                for (let i = 0; i < this.data.vitals.hitDiceSpent.length; i++) {
                    if (this.data.vitals.hitDiceSpent[i] && regainedCount < maxRegained) {
                        this.data.vitals.hitDiceSpent[i] = false;
                        regainedCount++;
                    }
                }
            }

            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
            this.data.concentration = { active: false, spellName: '' };

            (this.data.magic?.slots || []).forEach(s => {
                s.spent = s.spent.map(() => false);
            });
            (this.data.combat?.resources || []).forEach(r => {
                r.spent = r.spent.map(() => false);
            });

            const remainingSpent = (this.data.vitals.hitDiceSpent || []).filter(Boolean).length;
            const hdNote = regainedCount > 0 ? ` Regained ${regainedCount} Hit Dice (${totalHd - remainingSpent}/${totalHd} now available).` : ` All Hit Dice were already available.`;
            this.logEvent('🌙', 'Long Rest', `Full rest. Restored all HP (${this.data.vitals.maxHp}), Spell Slots, and Class Resources.${hdNote}`);
            this.saveState();
            await this.uiAlert(`Long Rest completed.\n• Health and spell slots fully restored.\n• Hit Dice recovered: ${regainedCount} (D&D 5e RAW rule: up to ${maxRegained}).`, "Long Rest", "✨");
        },

        async resetDefaults() {
            const ok = await this.uiConfirm("Reset character sheet to default starting state? All current modifications will be lost.", "Reset Character", "⚠️", "Reset", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            StorageService.remove(STORAGE_KEY);
            if (typeof window !== 'undefined' && window.location?.reload) {
                window.location.reload();
            } else {
                this.data = JSON.parse(JSON.stringify(CHARACTER_DATA));
                this.saveState();
                await this.uiAlert("Character sheet reset to defaults.", "Reset Done", "🔄");
            }
        },

        // Inspiration
        adjustInspiration(delta) {
            if (!this.data.vitals) this.data.vitals = {};
            const cur = Math.max(0, parseInt(this.data.vitals.inspiration, 10) || 0);
            const next = Math.max(0, cur + delta);
            if (next === cur) return;
            this.data.vitals.inspiration = next;
            if (delta > 0) {
                this.logEvent('⭐', 'Heroic Inspiration', `Gained 1 Inspiration point (Total: ${next}).`);
            } else {
                this.logEvent('⭐', 'Heroic Inspiration', `Expended 1 Inspiration point (Remaining: ${next}).`);
            }
            this.saveState();
        },

        // Session Event Log
        logEvent(icon, title, text, comment = '') {
            if (!Array.isArray(this.data.sessionLog)) this.data.sessionLog = [];
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.data.sessionLog.unshift({
                id: Date.now() + Math.random().toString(36).substring(2, 6),
                time,
                icon: icon || '⚡',
                title: title || 'Event',
                text: text || '',
                comment: (comment || '').trim()
            });
            if (this.data.sessionLog.length > 60) {
                this.data.sessionLog.length = 60;
            }
            this.saveState();
        },

        onToggleResourceSlot(resIndex, boxIndex) {
            const r = this.data.combat?.resources?.[resIndex];
            if (!r || !Array.isArray(r.spent)) {
                this.saveState();
                return;
            }
            const spent = !!r.spent[boxIndex];
            const rem = r.spent.filter(x => !x).length;
            const max = r.spent.length;
            this.logEvent(
                spent ? '🔄' : '✨',
                spent ? 'Resource Used' : 'Resource Restored',
                `${spent ? 'Used' : 'Restored'} 1 charge of "${r.name}" (${rem}/${max} available).`
            );
        },

        onToggleSpellSlot(slotIndex, boxIndex) {
            const s = this.data.magic?.slots?.[slotIndex];
            if (!s || !Array.isArray(s.spent)) {
                this.saveState();
                return;
            }
            const spent = !!s.spent[boxIndex];
            const rem = s.spent.filter(x => !x).length;
            const max = s.spent.length;
            this.logEvent(
                spent ? '✨' : '🔄',
                spent ? 'Spell Slot Spent' : 'Spell Slot Restored',
                `${spent ? 'Marked' : 'Restored'} 1 slot of ${s.level} (${rem}/${max} available).`
            );
        },

        async clearSessionLog() {
            const ok = await this.uiConfirm("Are you sure you want to clear the session history log?", "Clear History", "🗑️", "Clear Log", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.sessionLog = [];
            this.saveState();
        },

        removeLogEntry(id) {
            if (!Array.isArray(this.data.sessionLog)) return;
            this.data.sessionLog = this.data.sessionLog.filter(l => l.id !== id);
            this.saveState();
        },

        async editLogComment(id) {
            if (!Array.isArray(this.data.sessionLog)) return;
            const entry = this.data.sessionLog.find(l => l.id === id);
            if (!entry) return;
            const val = await this.uiPrompt(
                `Add note or contextual comment for: "${entry.title} - ${entry.text}"`,
                "Edit Log Note",
                entry.comment || '',
                "e.g. Target failed save, critical hit, used against Dragon..."
            );
            if (val !== null) {
                entry.comment = val.trim();
                this.saveState();
            }
        },

        async addCustomLogEntry() {
            const text = await this.uiPrompt(
                "Enter your custom event, milestone, or story note to record in the session log:",
                "Add Session Note / Entry",
                "",
                "e.g. Discovered the hidden tunnel, Met with the guildmaster...",
                "✍️",
                "Add Entry"
            );
            if (text && text.trim()) {
                this.logEvent('✍️', 'Story / Note', text.trim());
            }
        }
    };
}
