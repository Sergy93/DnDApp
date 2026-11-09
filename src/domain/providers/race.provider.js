import RACE_COMPENDIUM from "../../dnd-data/race-compendium.json" with { type: "json" };
import { normalizeKey } from "../../helpers/string.helper.js";
import {
    DEFAULT_WALK_SPEED,
    STANDARD_DARKVISION_RANGE,
    HILL_DWARF_HP_PER_LEVEL,
    DRAGONBORN_ANCESTRY_RESISTANCE_MAP
} from "../constants/dnd.constants.js";

/**
 * Provider responsible for resolving race and species traits, resistances,
 * innate spells, speeds, senses, and bonus HP from the race compendium.
 */
export class RaceProvider {
    /**
     * Finds base race and subrace from a race string (e.g. "Tiefling (Glasya)", "Wood Elf", "Hill Dwarf").
     * @param {string} raceStr - Raw race name from sheet.
     * @returns {{ baseKey: string|null, baseObj: Object|null, subraceKey: string|null, subraceObj: Object|null }}
     */
    static findRace(raceStr = '') {
        const norm = normalizeKey(raceStr);
        if (!norm) {
            return { baseKey: null, baseObj: null, subraceKey: null, subraceObj: null };
        }

        // 1. Check direct base key or base name match
        for (const [bKey, bObj] of Object.entries(RACE_COMPENDIUM)) {
            const normBaseKey = normalizeKey(bKey);
            const normBaseName = normalizeKey(bObj.name);

            // Check if subraces match directly (e.g. "wood elf", "glasya", "hill dwarf")
            if (bObj.subraces) {
                for (const [sKey, sObj] of Object.entries(bObj.subraces)) {
                    const normSubKey = normalizeKey(sKey);
                    const normSubName = normalizeKey(sObj.name);
                    if (!normSubKey) continue;

                    if (
                        norm === normSubName ||
                        norm === `${normSubKey}${normBaseKey}` ||
                        norm === `${normBaseKey}${normSubKey}` ||
                        norm.includes(normSubName) ||
                        (norm.includes(normBaseKey) && norm.includes(normSubKey))
                    ) {
                        return { baseKey: bKey, baseObj: bObj, subraceKey: sKey, subraceObj: sObj };
                    }
                }
            }

            if (norm === normBaseKey || norm === normBaseName || norm.startsWith(normBaseKey) || norm.endsWith(normBaseKey)) {
                return { baseKey: bKey, baseObj: bObj, subraceKey: null, subraceObj: null };
            }
        }

        return { baseKey: null, baseObj: null, subraceKey: null, subraceObj: null };
    }

    /**
     * Resolves the full composite racial data for a character.
     * @param {string} raceStr - Character race name.
     * @returns {Object} Composite race data with merged traits, resistances, senses, speed, and bonusHpPerLevel.
     */
    static resolveRace(raceStr = '') {
        const { baseKey, baseObj, subraceKey, subraceObj } = this.findRace(raceStr);
        if (!baseObj) {
            return {
                name: raceStr || 'Unknown',
                baseKey: null,
                subraceKey: null,
                speed: DEFAULT_WALK_SPEED,
                senses: '',
                darkvision: 0,
                resistances: [],
                languages: ['Common'],
                traits: [],
                innateSpells: [],
                bonusHpPerLevel: 0
            };
        }

        const name = subraceObj?.name || baseObj.name || raceStr;
        const speed = subraceObj?.speed || baseObj.speed || DEFAULT_WALK_SPEED;
        const senses = subraceObj?.senses || baseObj.senses || '';
        const darkvision = subraceObj?.darkvision ?? baseObj.darkvision ?? (senses.toLowerCase().includes('darkvision') ? STANDARD_DARKVISION_RANGE : 0);

        // Merge resistances without duplicates
        const resSet = new Set([
            ...(baseObj.resistances || []),
            ...(subraceObj?.resistances || [])
        ]);

        // Dragonborn Draconic Ancestry resistance resolution (e.g. "Dragonborn (Red)", "Gold Dragonborn")
        if (baseKey === 'dragonborn') {
            const normRace = normalizeKey(raceStr);
            for (const [color, dmgType] of Object.entries(DRAGONBORN_ANCESTRY_RESISTANCE_MAP)) {
                if (normRace.includes(color)) {
                    resSet.add(dmgType);
                }
            }
        }

        // Merge traits
        const traits = [
            ...(baseObj.traits || []),
            ...(subraceObj?.traits || [])
        ];

        // Merge innate spells
        const innateSpells = [
            ...(baseObj.innateSpells || []),
            ...(subraceObj?.innateSpells || [])
        ];

        const languages = [
            ...(baseObj.languages || []),
            ...(subraceObj?.languages || [])
        ];

        // Hill Dwarf: Dwarven Toughness (+1 HP per level)
        const isHillDwarf = baseKey === 'dwarf' && subraceKey === 'hill';
        const bonusHpPerLevel = isHillDwarf ? HILL_DWARF_HP_PER_LEVEL : 0;

        return {
            name,
            baseKey,
            subraceKey,
            speed,
            senses,
            darkvision,
            resistances: Array.from(resSet),
            languages: Array.from(new Set(languages)),
            traits,
            innateSpells,
            bonusHpPerLevel
        };
    }

    /**
     * Returns damage resistance IDs granted innately by the race.
     * @param {string} raceStr - Character race name.
     * @returns {Array<string>} Array of damage type IDs (e.g. ['fire']).
     */
    static getResistances(raceStr = '') {
        return this.resolveRace(raceStr).resistances;
    }

    /**
     * Returns racial traits list.
     * @param {string} raceStr - Character race name.
     * @returns {Array<Object>}
     */
    static getTraits(raceStr = '') {
        return this.resolveRace(raceStr).traits;
    }

    /**
     * Returns innate racial spells.
     * @param {string} raceStr - Character race name.
     * @returns {Array<Object>}
     */
    static getInnateSpells(raceStr = '') {
        return this.resolveRace(raceStr).innateSpells;
    }
}
