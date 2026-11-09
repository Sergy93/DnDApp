import { normalizeKey } from '../../helpers/string.helper.js';
import {
    MIN_CHARACTER_LEVEL,
    CANTRIP_LEVEL,
    CANTRIP_SCALING_TIERS,
    ACTION_TYPES,
    normalizeAbilityKey
} from '../constants/dnd.constants.js';

export class SpellService {
    static spellsCompendium = [];
    static loadPromise = null;
    static isLoaded = false;

    /**
     * Asynchronously loads the spell compendium from static assets via fetch.
     * @param {string} [url='dnd-data/spell-compendium.json'] - Path to pre-compiled spell JSON.
     * @returns {Promise<number>} Number of loaded spells.
     */
    static async loadCompendium(url = 'dnd-data/spell-compendium.json') {
        if (this.isLoaded && this.spellsCompendium.length > 0) {
            return this.spellsCompendium.length;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = (async () => {
            try {
                // First try offline IndexedDB store if available
                if (typeof window !== 'undefined' && window.indexedDB) {
                    try {
                        const { CompendiumStorageService } = await import('../../services/compendium-storage.service.js');
                        const dbSpells = await CompendiumStorageService.getAll('spells');
                        if (Array.isArray(dbSpells) && dbSpells.length > 0) {
                            this.buildSpellsCompendium([dbSpells]);
                            this.isLoaded = true;
                            return this.spellsCompendium.length;
                        }
                    } catch (_) {}
                }

                if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        this.buildSpellsCompendium([data]);
                        this.isLoaded = true;
                    }
                }
            } catch (err) {
                console.warn('[SpellService] Could not fetch spell compendium:', err);
            }
            return this.spellsCompendium.length;
        })();

        return this.loadPromise;
    }

    /**
     * Cleans 5eTools special notation tags (e.g. {@scaledamage ...}, {@spell ...}).
     * @param {string|Array|Object} text - Raw text or structure.
     * @returns {string} Clean plain text.
     */
    static clean5eToolsText(text) {
        if (!text) return '';
        if (Array.isArray(text)) return text.map(this.clean5eToolsText.bind(this)).filter(Boolean).join('\n\n');
        if (typeof text === 'object') {
            const title = text.name ? `${text.name}:\n` : '';
            if (text.entries) return (title + this.clean5eToolsText(text.entries)).trim();
            if (text.items) return (title + text.items.map(this.clean5eToolsText.bind(this)).join('\n')).trim();
            return JSON.stringify(text);
        }
        return String(text).replace(/\{@([a-zA-Z]+) ([^}]+)\}/gi, (_, tag, content) => {
            const parts = content.split('|');
            const t = tag.toLowerCase();
            if (t === 'scaledamage' || t === 'scaledice') return parts[2] || parts[0];
            return parts[0];
        });
    }

    /**
     * Parses a raw 5eTools spell JSON document into normalized spell object.
     * @param {Object} raw - Raw 5eTools spell.
     * @returns {Object|null}
     */
    static parse5eToolsSpell(raw) {
        if (!raw || typeof raw !== 'object' || !raw.name) return null;
        try {
            let actionType = ACTION_TYPES.ACTION;
            const at = String(raw.actionType || '').toLowerCase();
            if (at.includes('bonus')) actionType = ACTION_TYPES.BONUS_ACTION;
            else if (at.includes('react')) actionType = ACTION_TYPES.REACTION;
            else {
                const timeList = Array.isArray(raw.time) ? raw.time : (raw.time ? [raw.time] : []);
                for (const t of timeList) {
                    const unit = String(t.unit || t || '').toLowerCase();
                    if (unit.includes('bonus')) actionType = ACTION_TYPES.BONUS_ACTION;
                    if (unit.includes('react')) actionType = ACTION_TYPES.REACTION;
                }
            }

            let conc = false;
            if (raw.conc === true || raw.concentration === true) conc = true;
            const durationList = Array.isArray(raw.duration) ? raw.duration : (raw.duration ? [raw.duration] : []);
            for (const d of durationList) {
                if (d.concentration === true || String(d.type || '').toLowerCase().includes('conc')) conc = true;
            }

            let rangeStr = 'Self';
            if (raw.range?.distance) {
                rangeStr = `${raw.range.distance.amount || ''} ${raw.range.distance.type || 'ft'}`.trim();
            } else if (raw.range?.type) {
                rangeStr = raw.range.type === 'touch' ? 'Touch' : (raw.range.type === 'self' ? 'Self' : raw.range.type);
            }

            let saveStat = '';
            let useSpellDc = false;
            if (Array.isArray(raw.savingThrow) && raw.savingThrow.length > 0) {
                useSpellDc = true;
                saveStat = normalizeAbilityKey(raw.savingThrow[0]) || String(raw.savingThrow[0]).toUpperCase();
            }

            const descEntries = this.clean5eToolsText(raw.entries || '');
            const higherLevelEntries = raw.entriesHigherLevel ? this.clean5eToolsText(raw.entriesHigherLevel) : '';
            const fullDesc = [descEntries, higherLevelEntries].filter(Boolean).join('\n\n');

            const isHealing = (Array.isArray(raw.miscTags) && raw.miscTags.includes('HL')) ||
                /regains?\s+(?:hit points equal to|\d+d\d+)/i.test(descEntries) ||
                /\b(?:heal|cure|healing)\b/i.test(raw.name);
            const isTeleport = Array.isArray(raw.miscTags) && raw.miscTags.includes('TP');
            const hasDamageInflict = Array.isArray(raw.damageInflict) && raw.damageInflict.length > 0;

            let damageStr = '—';
            if (isHealing) {
                const healMatch = descEntries.match(/(\d+d\d+)/i);
                const hasMod = /spellcasting ability modifier/i.test(descEntries);
                if (healMatch) {
                    damageStr = hasMod ? `${healMatch[1]} + MOD` : healMatch[1];
                } else {
                    damageStr = 'Heal';
                }
            } else if (!isTeleport) {
                const dmgMatch = descEntries.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
                if (dmgMatch && (hasDamageInflict || raw.spellAttack || useSpellDc)) {
                    damageStr = dmgMatch[1];
                }
            }

            const multiBeamCantrip = /more than one beam|two beams at 5th level/i.test(descEntries);

            // Extract higher level scaling formula (At Higher Levels / scaledamage / scaledice)
            let higherLevelScale = null;
            if (raw.entriesHigherLevel) {
                const rawHlStr = JSON.stringify(raw.entriesHigherLevel);
                const mScale = rawHlStr.match(/@scaledamage ([^}]+)/) || rawHlStr.match(/@scaledice ([^}]+)/);
                if (mScale) {
                    const parts = mScale[1].split('|');
                    higherLevelScale = parts[2] || parts[0];
                } else {
                    const mDmg = higherLevelEntries.match(/(?:damage|healing) increases by (\d+d\d+)/i);
                    if (mDmg) higherLevelScale = mDmg[1];
                }
            }

            return {
                name: raw.name,
                sourceBook: raw.source || '5eTools',
                level: typeof raw.level === 'number' ? raw.level : (parseInt(raw.level, 10) || 0),
                actionType,
                range: rangeStr,
                duration: conc ? 'Concentration' : (raw.duration?.[0]?.type === 'instant' ? 'Instantaneous' : '1 min'),
                useSpellDc,
                saveStat: saveStat.trim(),
                conc,
                isHealing,
                damage: damageStr,
                scalingLevelDice: raw.scalingLevelDice || null,
                multiBeamCantrip,
                higherLevelScale,
                desc: fullDesc || 'No description available.'
            };
        } catch (err) {
            return null;
        }
    }

    /**
     * Builds and deduplicates the spell compendium from provided sources.
     * If no sources are passed and compendium is already populated, returns current count.
     * @param {Array<Object>} [rawSources=[]] - Array of raw or compiled spell sources.
     * @returns {number} Count of loaded spells.
     */
    static buildSpellsCompendium(rawSources = []) {
        if ((!rawSources || rawSources.length === 0) && this.spellsCompendium.length > 0) {
            return this.spellsCompendium.length;
        }

        const flatSpells = rawSources.flatMap(source => {
            if (Array.isArray(source)) return source;
            if (source && Array.isArray(source.spell)) return source.spell;
            return [];
        });

        const map = new Map();
        flatSpells.forEach(item => {
            if (!item || !item.name) return;
            // If already pre-compiled, consume directly; otherwise parse raw 5eTools format
            const parsed = (item.desc && item.actionType) ? item : this.parse5eToolsSpell(item);
            if (parsed && parsed.name && !map.has(normalizeKey(parsed.name))) {
                map.set(normalizeKey(parsed.name), parsed);
            }
        });

        this.spellsCompendium = Array.from(map.values());
        this.isLoaded = this.spellsCompendium.length > 0;
        return this.spellsCompendium.length;
    }

    /**
     * Finds a spell by exact or fuzzy name in the loaded compendium.
     * @param {string} name - Spell name to search.
     * @returns {Object|null}
     */
    static findSpellInCompendium(name) {
        if (!name || this.spellsCompendium.length === 0) return null;
        const target = normalizeKey(name);

        let found = this.spellsCompendium.find(s => normalizeKey(s.name) === target);
        if (found) return found;

        return this.spellsCompendium.find(s => {
            const sKey = normalizeKey(s.name);
            return sKey && (target.includes(sKey) || sKey.includes(target));
        }) || null;
    }

    /**
     * Returns cantrip scaling tier and multiplier for character level.
     * @param {number} totalLevel
     * @returns {{ tier: string, multiplier: number }}
     */
    static getCantripScalingTier(totalLevel = MIN_CHARACTER_LEVEL) {
        if (totalLevel >= CANTRIP_SCALING_TIERS.TIER_3) return { tier: String(CANTRIP_SCALING_TIERS.TIER_3), multiplier: 4 };
        if (totalLevel >= CANTRIP_SCALING_TIERS.TIER_2) return { tier: String(CANTRIP_SCALING_TIERS.TIER_2), multiplier: 3 };
        if (totalLevel >= CANTRIP_SCALING_TIERS.TIER_1) return { tier: String(CANTRIP_SCALING_TIERS.TIER_1), multiplier: 2 };
        return { tier: String(MIN_CHARACTER_LEVEL), multiplier: 1 };
    }

    /**
     * Computes scaled cantrip or base spell damage based on level.
     */
    static resolveScaledSpellDamage(comp, charSpell, totalLevel = MIN_CHARACTER_LEVEL, lvlNum = MIN_CHARACTER_LEVEL) {
        const baseDmg = charSpell?.damage || comp?.damage || '—';
        if (lvlNum !== CANTRIP_LEVEL) return baseDmg;

        const { tier, multiplier } = this.getCantripScalingTier(totalLevel);

        if (comp?.scalingLevelDice) {
            const list = Array.isArray(comp.scalingLevelDice) ? comp.scalingLevelDice : [comp.scalingLevelDice];
            const scaledParts = list
                .map(item => item?.scaling?.[tier] || item?.scaling?.['1'])
                .filter(Boolean);
            if (scaledParts.length > 0) return scaledParts.join(' / ');
        }

        if (baseDmg === '—') return '—';

        if (comp?.multiBeamCantrip) {
            return multiplier > 1 ? `${multiplier}×${baseDmg}` : baseDmg;
        }

        if (multiplier > 1 && /5th level/i.test(comp?.desc || '')) {
            return baseDmg.replace(/^(\d+)d(\d+)/i, (_, count, faces) => `${(parseInt(count, 10) || 1) * multiplier}d${faces}`);
        }

        return baseDmg;
    }

    /**
     * Calculates scaled damage when upcasting a spell with a higher level slot.
     */
    static calculateSlotDamage(baseDmg, scaleDice, baseLevel, targetLevel) {
        if (!baseDmg || baseDmg === '—' || !scaleDice || targetLevel <= baseLevel) return baseDmg;
        const diff = targetLevel - baseLevel;
        const baseMatch = baseDmg.match(/^(\d+)d(\d+)(.*)$/i);
        const scaleMatch = scaleDice.match(/^(\d+)d(\d+)/i);
        if (baseMatch && scaleMatch && baseMatch[2] === scaleMatch[2]) {
            const total = (parseInt(baseMatch[1], 10) || 0) + (parseInt(scaleMatch[1], 10) || 1) * diff;
            return `${total}d${baseMatch[2]}${baseMatch[3]}`;
        }
        return `${baseDmg} (+${diff}×${scaleDice})`;
    }

    /**
     * Resolves all display, scaling, and compendium data for a character spell.
     */
    static resolveSpellData(charSpell, totalLevel = 1, maxCastLevel = 3, spellAttrMod = null) {
        const comp = this.findSpellInCompendium(charSpell.name) || {};

        let lvlNum = 1;
        const rawLvl = charSpell.level !== undefined ? charSpell.level : comp.level;
        if (rawLvl === 0 || rawLvl === "0" || rawLvl === "T") lvlNum = 0;
        else lvlNum = parseInt(rawLvl, 10) || 1;

        const actionType = charSpell.actionType || comp.actionType || ACTION_TYPES.ACTION;
        const conc = charSpell.conc !== undefined ? !!charSpell.conc : !!comp.conc;
        const isHealing = charSpell.isHealing !== undefined ? !!charSpell.isHealing : !!comp.isHealing;
        let damage = this.resolveScaledSpellDamage(comp, charSpell, totalLevel, lvlNum);
        if (damage && damage.includes('MOD')) {
            const modNum = typeof spellAttrMod === 'number' ? spellAttrMod : 0;
            damage = damage.replace(/MOD/g, modNum >= 0 ? `${modNum}` : `${modNum}`);
        }
        const higherLevelScale = charSpell.higherLevelScale || comp.higherLevelScale || null;

        // Calculate scaling for higher available slots
        const slotScaling = [];
        if (lvlNum > 0 && higherLevelScale && damage !== '—') {
            const topLevel = Math.max(lvlNum, maxCastLevel);
            for (let sl = lvlNum + 1; sl <= topLevel; sl++) {
                slotScaling.push({
                    slotLevel: sl,
                    label: `Lvl ${sl}`,
                    damage: this.calculateSlotDamage(damage, higherLevelScale, lvlNum, sl)
                });
            }
        }

        const baseDesc = comp.desc || charSpell.desc || 'Description not available in loaded compendiums.';
        const finalDesc = (charSpell.desc && comp.desc && charSpell.desc !== comp.desc)
            ? `${baseDesc}\n\n*Character Note:* ${charSpell.desc}`
            : baseDesc;

        return {
            name: charSpell.name,
            source: charSpell.source || 'Spell',
            sourceType: charSpell.sourceType || 'other',
            sourceBook: comp.sourceBook || '',
            level: lvlNum,
            actionType,
            range: charSpell.range || comp.range || 'Self',
            duration: charSpell.duration || comp.duration || (conc ? 'Concentration' : 'Instantaneous'),
            useSpellDc: charSpell.useSpellDc !== undefined ? charSpell.useSpellDc : (comp.useSpellDc !== undefined ? comp.useSpellDc : false),
            saveStat: (charSpell.saveStat || comp.saveStat || '').trim(),
            conc,
            isHealing,
            damage,
            higherLevelScale,
            slotScaling,
            isFavorite: !!charSpell.favorite,
            isItemGranted: !!charSpell.isItemGranted || charSpell.sourceType === 'item',
            desc: finalDesc
        };
    }
}
