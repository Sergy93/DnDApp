import DND_RULES from "../../dnd-data/dnd-rules.json" with { type: "json" };
import { normalizeKey, capitalizeWord } from "../../helpers/string.helper.js";
import { ClassProgressionService } from "./class-progression.service.js";
import {
    MIN_CHARACTER_LEVEL,
    MAX_CHARACTER_LEVEL,
    BASE_PROFICIENCY_BONUS,
    DEFAULT_ABILITY_SCORE,
    ABILITY_MODIFIER_OFFSET,
    ABILITY_MODIFIER_DIVISOR,
    HALF_CASTER_DIVISOR,
    THIRD_CASTER_DIVISOR,
    MIN_RESOURCE_USES,
    LAY_ON_HANDS_HP_PER_LEVEL,
    PSIONIC_DICE_PB_MULTIPLIER,
    CHANNEL_DIVINITY_THRESHOLDS,
    BARBARIAN_RAGE_USES_TABLE,
    BATTLE_MASTER_SUPERIORITY_DICE_TABLE,
    REST_TYPES
} from "../constants/dnd.constants.js";

const SPELL_SLOTS_TABLES = DND_RULES.spellSlotsTables;

export class ClassSyncService {
    static _featuresSync = null;

    static get CLASS_FEATURES_SYNC() {
        if (!this._featuresSync || Object.keys(this._featuresSync).length === 0) {
            const comp = ClassProgressionService.CLASS_COMPENDIUM || {};
            this._featuresSync = Object.fromEntries(
                Object.entries(comp).filter(([, v]) => v.featuresSync).map(([k, v]) => [k, v.featuresSync])
            );
        }
        return this._featuresSync || {};
    }

    static set CLASS_FEATURES_SYNC(val) {
        this._featuresSync = val;
    }

    static setCompendium(classes = {}) {
        this._featuresSync = Object.fromEntries(
            Object.entries(classes).filter(([, v]) => v.featuresSync).map(([k, v]) => [k, v.featuresSync])
        );
    }

    /**
     * Resolves maximum uses for a tactical resource based on static count, ability mod, PB, or class pool formula.
     * @param {Object} res - Resource entry.
     * @param {Object} attributes - Character raw attributes.
     * @param {number} [pb=BASE_PROFICIENCY_BONUS] - Proficiency bonus.
     * @param {Object} [character=null] - Optional full character object for class-level pool formulas.
     * @returns {number}
     */
    static resolveResourceMaxUses(res, attributes, pb = BASE_PROFICIENCY_BONUS, character = null) {
        if (typeof res?.uses === 'number' && res.uses > 0) return res.uses;
        if (res?.usesKey) {
            const u = String(res.usesKey).toUpperCase();
            if (u === 'PB') return Math.max(MIN_RESOURCE_USES, pb);
            if (u === 'PB_X2') return Math.max(PSIONIC_DICE_PB_MULTIPLIER, pb * PSIONIC_DICE_PB_MULTIPLIER);

            if (u === 'MONK_LEVEL') {
                const lvl = ClassProgressionService.getClassLevel(character, 'monk');
                return Math.max(MIN_RESOURCE_USES, lvl || res.levelFallback || 2);
            }
            if (u === 'SORCERER_LEVEL') {
                const lvl = ClassProgressionService.getClassLevel(character, 'sorcerer');
                return Math.max(MIN_RESOURCE_USES, lvl || res.levelFallback || 2);
            }
            if (u === 'PALADIN_LAY_ON_HANDS') {
                const lvl = ClassProgressionService.getClassLevel(character, 'paladin') || MIN_CHARACTER_LEVEL;
                return Math.max(LAY_ON_HANDS_HP_PER_LEVEL, lvl * LAY_ON_HANDS_HP_PER_LEVEL);
            }
            if (u === 'BARBARIAN_RAGES') {
                const lvl = ClassProgressionService.getClassLevel(character, 'barbarian') || MIN_CHARACTER_LEVEL;
                const match = BARBARIAN_RAGE_USES_TABLE.find(row => lvl >= row.minLevel);
                return match ? match.uses : 2;
            }
            if (u === 'CHANNEL_DIVINITY') {
                const clericLvl = ClassProgressionService.getClassLevel(character, 'cleric');
                if (clericLvl >= CHANNEL_DIVINITY_THRESHOLDS.TIER_3_LEVEL) return CHANNEL_DIVINITY_THRESHOLDS.TIER_3_USES;
                if (clericLvl >= CHANNEL_DIVINITY_THRESHOLDS.TIER_2_LEVEL) return CHANNEL_DIVINITY_THRESHOLDS.TIER_2_USES;
                return CHANNEL_DIVINITY_THRESHOLDS.TIER_1_USES;
            }
            if (u === 'SUPERIORITY_DICE') {
                const fighterLvl = ClassProgressionService.getClassLevel(character, 'fighter') || 3;
                const match = BATTLE_MASTER_SUPERIORITY_DICE_TABLE.find(row => fighterLvl >= row.minLevel);
                return match ? match.uses : 4;
            }

            // Standard ability modifier lookup (STR, DEX, CON, INT, WIS, CHA)
            const rawAttr = attributes?.[u];
            const score = typeof rawAttr?.score === 'number'
                ? rawAttr.score
                : (parseInt(rawAttr?.score, 10) || DEFAULT_ABILITY_SCORE);
            const mod = Math.floor((score - ABILITY_MODIFIER_OFFSET) / ABILITY_MODIFIER_DIVISOR);
            return Math.max(MIN_RESOURCE_USES, mod);
        }
        if (Array.isArray(res?.spent) && res.spent.length > 0) return res.spent.length;
        return MIN_RESOURCE_USES;
    }

    /**
     * Resolves dynamic display name and reset condition for tactical resources.
     * Centralizes 5e class-specific scaling rules (e.g. Bardic Inspiration reset tier at Bard 5).
     * @param {Object} res - Resource definition.
     * @param {Object} character - Character data.
     * @param {Object} stats - Computed character stats.
     * @param {Object} [interpCtx=null] - Interpolation context.
     * @returns {{ displayName: string, displayReset: string }}
     */
    static resolveResourceDisplay(res, character, stats, interpCtx = null) {
        if (!res) return { displayName: 'Resource', displayReset: 'Rest' };
        const norm = normalizeKey(res.name || '');
        const bardicDie = stats?.bardicDie || '1d8';
        const pb = stats?.pb || BASE_PROFICIENCY_BONUS;
        const vesselHours = pb * 2;

        let displayName = res.name || 'Resource';
        let displayReset = res.reset || 'Rest';

        if (res.id === 'insp_bard' || norm.includes('bardicinspiration')) {
            displayName = `Bardic Inspiration (${bardicDie})`;
            const bardLvl = ClassProgressionService.getClassLevel(character, 'bard') || 0;
            if (bardLvl >= 5) {
                displayReset = 'Short/Long Rest';
            }
        } else if (res.id === 'genie_vessel' || norm.includes('geniesvessel')) {
            displayName = `Genie's Vessel (${vesselHours}h)`;
        }

        return { displayName, displayReset };
    }

    /**
     * Calculates expected spell slots based on multiclass and pact spellcasting rules.
     */
    static calculateExpectedSlots(classes = []) {
        const list = [];
        const pactCasters = [];
        const nonPactCasters = [];

        classes.forEach(c => {
            const lvl = parseInt(c?.level, 10) || 0;
            if (lvl <= 0) return;
            const found = ClassProgressionService.findCompendiumClass(c?.name);
            let casterType = found?.obj?.spellcasting?.casterType;
            if (!casterType && c?.subclass) {
                const foundSub = ClassProgressionService.findCompendiumSubclass(found?.obj, c.subclass, c.name);
                casterType = foundSub?.obj?.spellcasting?.casterType;
            }

            if (casterType === 'pact') {
                pactCasters.push({ name: c.name, level: lvl });
            } else if (casterType) {
                nonPactCasters.push({ type: casterType, name: c.name, level: lvl });
            }
        });

        pactCasters.forEach(pc => {
            const pLvl = Math.min(MAX_CHARACTER_LEVEL, Math.max(MIN_CHARACTER_LEVEL, pc.level));
            const pInfo = SPELL_SLOTS_TABLES.warlockPactSlots?.[pLvl];
            if (pInfo) {
                list.push({
                    id: 'pact',
                    level: `Pact (${capitalizeWord(pc.name)} ${pLvl})`,
                    max: pInfo.count,
                    reset: REST_TYPES.SHORT
                });
            }
        });

        const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
        if (nonPactCasters.length === 1) {
            const caster = nonPactCasters[0];
            const lvl = Math.min(MAX_CHARACTER_LEVEL, Math.max(MIN_CHARACTER_LEVEL, caster.level));
            const tableMap = {
                full: SPELL_SLOTS_TABLES.fullCaster,
                half: SPELL_SLOTS_TABLES.halfCaster,
                artificer: SPELL_SLOTS_TABLES.artificer,
                third: SPELL_SLOTS_TABLES.thirdCaster
            };
            const counts = tableMap[caster.type]?.[lvl] || [];
            const classTag = ` (${capitalizeWord(caster.name)})`;
            counts.forEach((max, idx) => {
                if (max > 0) {
                    list.push({
                        id: `lvl${idx + 1}`,
                        level: `${ordinals[idx]} Level${classTag}`,
                        max: max,
                        reset: REST_TYPES.LONG
                    });
                }
            });
        } else if (nonPactCasters.length > 1) {
            let combinedLvl = 0;
            nonPactCasters.forEach(c => {
                if (c.type === 'full') combinedLvl += c.level;
                else if (c.type === 'half') combinedLvl += Math.floor(c.level / HALF_CASTER_DIVISOR);
                else if (c.type === 'artificer') combinedLvl += Math.ceil(c.level / HALF_CASTER_DIVISOR);
                else if (c.type === 'third') combinedLvl += Math.floor(c.level / THIRD_CASTER_DIVISOR);
            });
            if (combinedLvl > 0) {
                const counts = SPELL_SLOTS_TABLES.multiclassSpellSlots?.[Math.min(MAX_CHARACTER_LEVEL, combinedLvl)] || [];
                counts.forEach((max, idx) => {
                    if (max > 0) {
                        list.push({
                            id: `lvl${idx + 1}`,
                            level: `${ordinals[idx]} Level`,
                            max: max,
                            reset: REST_TYPES.LONG
                        });
                    }
                });
            }
        }
        return list;
    }

    /**
     * Synchronizes character spell slots array with expected multiclass/pact slots.
     */
    static syncCharacterSpellSlots(character) {
        if (!character || !character.identity || !Array.isArray(character.identity.classes)) return;
        const expected = this.calculateExpectedSlots(character.identity.classes);
        if (!character.magic) character.magic = { slots: [], spells: [] };
        if (!Array.isArray(character.magic.slots)) character.magic.slots = [];

        const existingMap = new Map();
        character.magic.slots.forEach(s => {
            if (s.id) existingMap.set(s.id, s);
        });

        const newSlots = [];
        expected.forEach(exp => {
            const exist = existingMap.get(exp.id);
            existingMap.delete(exp.id);
            const max = exp.max;
            const spent = [];
            for (let i = 0; i < max; i++) {
                spent.push(Boolean(exist && Array.isArray(exist.spent) && exist.spent[i] === true));
            }
            newSlots.push({
                id: exp.id,
                level: exp.level,
                max: max,
                reset: exp.reset,
                spent: spent
            });
        });

        // Retain custom slots that the user manually created
        existingMap.forEach(customSlot => {
            if (!String(customSlot.id).startsWith('lvl') && customSlot.id !== 'pact') {
                newSlots.push(customSlot);
            }
        });

        character.magic.slots = newSlots;
    }

    /**
     * Scans character classes against featuresSync rules to detect newly unlocked or stale features.
     */
    static detectClassFeaturesToSync(character) {
        const classes = character?.identity?.classes || [];
        const newResources = [];
        const newTraits = [];
        const staleResourceIds = new Set();
        const staleTraitNames = new Set();
        const existingResourceIds = new Set((character.combat?.resources || []).map(r => r.id));
        const existingTraitNames = new Set((character.combat?.traits || []).map(t => normalizeKey(t.name)));

        classes.forEach(cls => {
            const found = ClassProgressionService.findCompendiumClass(cls.name);
            const classKey = found?.key || normalizeKey(cls.name);
            const currentLvl = parseInt(cls.level, 10) || 1;

            const classRules = this.CLASS_FEATURES_SYNC?.[classKey];
            if (!classRules) return;

            // 1. Base class features
            if (classRules.base) {
                (classRules.base.traits || []).forEach(trait => {
                    const reqLvl = trait.minLevel || 1;
                    const traitNorm = normalizeKey(trait.name);
                    if (currentLvl >= reqLvl && !existingTraitNames.has(traitNorm)) {
                        newTraits.push(JSON.parse(JSON.stringify(trait)));
                        existingTraitNames.add(traitNorm);
                    } else if (currentLvl < reqLvl && existingTraitNames.has(traitNorm)) {
                        staleTraitNames.add(traitNorm);
                    }
                });
                (classRules.base.resources || []).forEach(res => {
                    const reqLvl = res.minLevel || 1;
                    if (currentLvl >= reqLvl && !existingResourceIds.has(res.id)) {
                        newResources.push(JSON.parse(JSON.stringify(res)));
                        existingResourceIds.add(res.id);
                    } else if (currentLvl < reqLvl && existingResourceIds.has(res.id)) {
                        staleResourceIds.add(res.id);
                    }
                });
            }

            // 2. Subclass features
            if (cls.subclass && classRules.subclasses) {
                const resolvedSub = ClassProgressionService.resolveSubclassInfo(cls.name, cls.subclass);
                const targetSubKey = resolvedSub?.key || normalizeKey(cls.subclass || '');
                const matchingSubKey = Object.keys(classRules.subclasses).find(sk => {
                    const normSk = normalizeKey(sk);
                    return normSk === targetSubKey || targetSubKey.includes(normSk) || normSk.includes(targetSubKey);
                });

                if (matchingSubKey && classRules.subclasses[matchingSubKey]) {
                    const subData = classRules.subclasses[matchingSubKey];
                    (subData.traits || []).forEach(trait => {
                        const reqLvl = trait.minLevel || 1;
                        const traitNorm = normalizeKey(trait.name);
                        if (currentLvl >= reqLvl && !existingTraitNames.has(traitNorm)) {
                            newTraits.push(JSON.parse(JSON.stringify(trait)));
                            existingTraitNames.add(traitNorm);
                        } else if (currentLvl < reqLvl && existingTraitNames.has(traitNorm)) {
                            staleTraitNames.add(traitNorm);
                        }
                    });
                    (subData.resources || []).forEach(res => {
                        const reqLvl = res.minLevel || 1;
                        if (currentLvl >= reqLvl && !existingResourceIds.has(res.id)) {
                            newResources.push(JSON.parse(JSON.stringify(res)));
                            existingResourceIds.add(res.id);
                        } else if (currentLvl < reqLvl && existingResourceIds.has(res.id)) {
                            staleResourceIds.add(res.id);
                        }
                    });
                }
            }
        });

        return { newResources, newTraits, staleResourceIds, staleTraitNames };
    }

    /**
     * Applies class features synchronization to character data.
     * @param {Object} character - Character data.
     * @param {Function} [sanitizeFn] - Optional tracking sanitizer callback.
     * @returns {Object} Sync result summary.
     */
    static applyClassFeaturesSync(character, sanitizeFn = null) {
        this.syncCharacterSpellSlots(character);
        const syncResult = this.detectClassFeaturesToSync(character);
        const { newResources, newTraits, staleResourceIds, staleTraitNames } = syncResult;

        character.combat = character.combat || {};
        character.combat.resources = character.combat.resources || [];
        character.combat.traits = character.combat.traits || [];

        if (staleResourceIds.size > 0) {
            character.combat.resources = character.combat.resources.filter(r => !staleResourceIds.has(r.id));
        }
        if (staleTraitNames.size > 0) {
            character.combat.traits = character.combat.traits.filter(t => !staleTraitNames.has(normalizeKey(t.name)));
        }
        if (newResources.length > 0) {
            character.combat.resources.push(...newResources);
        }
        if (newTraits.length > 0) {
            character.combat.traits.push(...newTraits);
        }

        if (typeof sanitizeFn === 'function') {
            sanitizeFn(character);
        }
        return syncResult;
    }
}
