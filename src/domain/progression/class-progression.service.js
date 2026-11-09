import CLASS_COMPENDIUM from "../../dnd-data/class-compendium.json" with { type: "json" };
import DND_RULES from "../../dnd-data/dnd-rules.json" with { type: "json" };
import { normalizeKey, capitalizeWord } from "../../helpers/string.helper.js";
import { hasCharacterFeature } from "../providers/class-feature.provider.js";
import {
    MIN_CHARACTER_LEVEL,
    MAX_CHARACTER_LEVEL,
    DEFAULT_HIT_DIE,
    DEFAULT_BARDIC_DIE,
    DEFAULT_SONG_OF_REST_DIE,
    DEFAULT_MARTIAL_ARTS_DIE,
    ABILITIES
} from "../constants/dnd.constants.js";

const DAMAGE_TYPES = DND_RULES.damageTypes;
const SUBCLASS_ALIASES = Object.fromEntries(
    Object.entries(CLASS_COMPENDIUM).filter(([, v]) => v.subclassAliases).map(([k, v]) => [k, v.subclassAliases])
);

export class ClassProgressionService {
    static CLASS_COMPENDIUM = CLASS_COMPENDIUM;
    static SUBCLASS_ALIASES = SUBCLASS_ALIASES;

    /**
     * Looks up a class in the compendium by key or display name.
     */
    static findCompendiumClass(className) {
        const normClass = normalizeKey(className);
        if (!normClass) return null;

        const classKey = Object.keys(CLASS_COMPENDIUM).find(key => {
            const normKey = normalizeKey(key);
            const normName = normalizeKey(CLASS_COMPENDIUM[key]?.name);
            return normKey === normClass || normName === normClass;
        });
        return classKey ? { key: classKey, obj: CLASS_COMPENDIUM[classKey] } : null;
    }

    /**
     * Resolves canonical subclass metadata, display names, and specializations.
     */
    static resolveSubclassInfo(className, subclassName) {
        if (!subclassName) return null;
        const normSub = normalizeKey(subclassName);
        const normClass = normalizeKey(className || '');

        // 1. Direct class block check
        const classBlock = SUBCLASS_ALIASES[normClass];
        if (classBlock) {
            for (const subKey of Object.keys(classBlock)) {
                const entry = classBlock[subKey];
                if (normalizeKey(subKey) === normSub || normalizeKey(entry.name || '') === normSub) {
                    return { key: subKey, name: entry.name, displayName: entry.name, specialization: null };
                }
                if (entry.specializations) {
                    for (const specKey of Object.keys(entry.specializations)) {
                        const spec = entry.specializations[specKey];
                        if (normalizeKey(specKey) === normSub || normalizeKey(spec.displayName || '') === normSub || normSub.includes(normalizeKey(specKey))) {
                            return {
                                key: subKey,
                                name: entry.name,
                                displayName: spec.displayName || `${entry.name} (${specKey})`,
                                specialization: specKey,
                                specInfo: spec
                            };
                        }
                    }
                }
            }
        }

        // 2. Global search across all classes in SUBCLASS_ALIASES
        for (const cKey of Object.keys(SUBCLASS_ALIASES)) {
            const cBlock = SUBCLASS_ALIASES[cKey];
            for (const subKey of Object.keys(cBlock)) {
                const entry = cBlock[subKey];
                if (normalizeKey(subKey) === normSub || normalizeKey(entry.name || '') === normSub) {
                    return { classKey: cKey, key: subKey, name: entry.name, displayName: entry.name, specialization: null };
                }
                if (entry.specializations) {
                    for (const specKey of Object.keys(entry.specializations)) {
                        const spec = entry.specializations[specKey];
                        if (normalizeKey(specKey) === normSub || normalizeKey(spec.displayName || '') === normSub || normSub.includes(normalizeKey(specKey))) {
                            return {
                                classKey: cKey,
                                key: subKey,
                                name: entry.name,
                                displayName: spec.displayName || `${entry.name} (${specKey})`,
                                specialization: specKey,
                                specInfo: spec
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Resolves subclass compendium entry from class definition.
     */
    static findCompendiumSubclass(classObj, subclassName, className = '') {
        if (!classObj || !classObj.subclasses || !subclassName) return null;
        const normSub = normalizeKey(subclassName);
        if (!normSub) return null;

        const resolved = this.resolveSubclassInfo(className || classObj.name, subclassName);
        const canonicalSub = resolved ? resolved.key : normSub;

        const subclasses = classObj.subclasses;
        const subKey = Object.keys(subclasses).find(key => {
            const normKey = normalizeKey(key);
            const normName = normalizeKey(subclasses[key]?.name);
            if (normKey === canonicalSub || normName === canonicalSub || normKey === normSub || normName === normSub) {
                return true;
            }
            if (normName.includes(canonicalSub) || canonicalSub.includes(normKey)) {
                return true;
            }
            const lvl1Feats = subclasses[key]?.features?.[1] || [];
            return lvl1Feats.some(f => normalizeKey(f).includes(normSub));
        });

        return subKey ? { key: subKey, obj: subclasses[subKey], resolved } : null;
    }

    /**
     * Generates a 20-level progression feature tree for class and subclass.
     */
    static generateProgressionTree(className, subclassName, charProgressionMap = {}) {
        const foundClass = this.findCompendiumClass(className);
        const classObj = foundClass?.obj || null;
        const foundSub = this.findCompendiumSubclass(classObj, subclassName);
        const subObj = foundSub?.obj || null;

        const normClass = normalizeKey(className);
        const charProgKey = Object.keys(charProgressionMap || {}).find(
            k => normalizeKey(k) === normClass || (foundClass && normalizeKey(k) === normalizeKey(foundClass.key))
        );
        const customLevels = Array.isArray(charProgressionMap?.[charProgKey]) ? charProgressionMap[charProgKey] : [];
        const customByLevel = new Map();
        customLevels.forEach(item => {
            if (item && typeof item.level === 'number' && Array.isArray(item.feats) && item.feats.length > 0) {
                customByLevel.set(item.level, item);
            }
        });

        const levels = [];
        for (let lvl = MIN_CHARACTER_LEVEL; lvl <= MAX_CHARACTER_LEVEL; lvl++) {
            if (customByLevel.has(lvl)) {
                const custom = customByLevel.get(lvl);
                levels.push({
                    level: lvl,
                    title: custom.title || `Level ${lvl}`,
                    feats: [...custom.feats]
                });
                continue;
            }

            const feats = [];
            if (classObj?.baseFeatures?.[lvl]) feats.push(...classObj.baseFeatures[lvl]);
            if (subObj?.features?.[lvl]) feats.push(...subObj.features[lvl]);
            if (feats.length > 0) {
                levels.push({ level: lvl, title: `Level ${lvl}`, feats });
            }
        }
        return levels;
    }

    /**
     * Helper to extract the current level of a given class from a character object.
     */
    static getClassLevel(character, targetClassKey) {
        const classes = character?.identity?.classes || [];
        const normTarget = normalizeKey(targetClassKey);
        const match = classes.find(c => {
            const key = this.findCompendiumClass(c?.name)?.key || normalizeKey(c?.name);
            return key === normTarget;
        });
        return match ? (parseInt(match.level, 10) || 0) : 0;
    }

    /**
     * Evaluates class level thresholds for scaling dice (e.g. Bardic Inspiration, Martial Arts).
     */
    static resolveDiceScale(className, scaleName, level) {
        const found = this.findCompendiumClass(className);
        const scale = found?.obj?.diceScales?.[scaleName];
        if (!scale || level <= 0) return null;

        let currentDie = null;
        const thresholds = Object.keys(scale).map(Number).sort((a, b) => a - b);
        for (const threshold of thresholds) {
            if (level >= threshold) currentDie = scale[threshold];
        }
        return currentDie;
    }

    /**
     * Returns the active Bardic Inspiration die string based on bard level.
     */
    static resolveBardicDie(character) {
        const lvl = this.getClassLevel(character, 'bard');
        return this.resolveDiceScale('bard', 'bardicDie', lvl) || DEFAULT_BARDIC_DIE;
    }

    /**
     * Returns the Song of Rest die string if applicable.
     */
    static resolveSongOfRestDie(character) {
        const bardLevel = this.getClassLevel(character, 'bard');
        const die = this.resolveDiceScale('bard', 'songOfRestDie', bardLevel);
        if (die) return die;

        if (hasCharacterFeature(character, ['songofrest'])) {
            return DEFAULT_SONG_OF_REST_DIE;
        }
        return null;
    }

    /**
     * Returns the Rogue Sneak Attack die string (1d6 to 10d6).
     */
    static resolveSneakAttackDie(character) {
        const rogueLevel = this.getClassLevel(character, 'rogue');
        if (rogueLevel > 0) {
            return this.resolveDiceScale('rogue', 'sneakAttackDie', rogueLevel) || `${Math.ceil(rogueLevel / 2)}d6`;
        }
        return null;
    }

    /**
     * Returns the Monk Martial Arts die string (1d4 to 1d10).
     */
    static resolveMartialArtsDie(character) {
        const monkLevel = this.getClassLevel(character, 'monk');
        if (monkLevel > 0) {
            return this.resolveDiceScale('monk', 'martialArtsDie', monkLevel) || DEFAULT_MARTIAL_ARTS_DIE;
        }
        return null;
    }

    /**
     * Returns the Battle Master Fighter Superiority Die string (1d8 to 1d12).
     */
    static resolveSuperiorityDie(character) {
        const fighterLevel = this.getClassLevel(character, 'fighter');
        if (fighterLevel >= 3) {
            return this.resolveDiceScale('fighter', 'superiorityDie', fighterLevel);
        }
        return null;
    }

    /**
     * Returns the Barbarian Rage extra melee damage string (+2 to +4).
     */
    static resolveRageDamage(character) {
        const barbLevel = this.getClassLevel(character, 'barbarian');
        if (barbLevel > 0) {
            return this.resolveDiceScale('barbarian', 'rageDamage', barbLevel);
        }
        return null;
    }

    /**
     * Returns the Psionic Energy Die string (1d6 to 1d12) for Soulknife Rogue or Psi Warrior Fighter.
     */
    static resolvePsionicEnergyDie(character) {
        const rogueLevel = this.getClassLevel(character, 'rogue');
        const fighterLevel = this.getClassLevel(character, 'fighter');
        const maxPsionicLevel = Math.max(rogueLevel, fighterLevel);
        if (maxPsionicLevel >= 3) {
            return this.resolveDiceScale('rogue', 'psionicEnergyDie', maxPsionicLevel) ||
                this.resolveDiceScale('fighter', 'psionicEnergyDie', maxPsionicLevel);
        }
        return null;
    }

    /**
     * Resolves the primary hit die string for a class (e.g. 'd8', 'd10').
     */
    static resolveClassHitDie(cls) {
        if (cls?.hitDie) return cls.hitDie;
        const found = this.findCompendiumClass(cls?.name);
        return found?.obj?.hitDie || DEFAULT_HIT_DIE;
    }

    /**
     * Determines spellcasting ability attribute key (e.g. 'CHA', 'INT', 'WIS').
     */
    static resolveSpellcastingAttrKey(character) {
        if (character?.magic?.spellcastingAttr) return String(character.magic.spellcastingAttr).toUpperCase();
        if (character?.identity?.spellcastingAbility) return String(character.identity.spellcastingAbility).toUpperCase();
        const classes = character?.identity?.classes || [];
        for (const cls of classes) {
            const found = this.findCompendiumClass(cls?.name);
            if (found?.obj?.spellcasting?.ability) {
                return String(found.obj.spellcasting.ability).toUpperCase();
            }
            if (cls?.subclass) {
                const sub = this.findCompendiumSubclass(found?.obj, cls.subclass, cls.name);
                if (sub?.obj?.spellcasting?.ability) {
                    return String(sub.obj.spellcasting.ability).toUpperCase();
                }
            }
        }
        return ABILITIES.CHA;
    }

    /**
     * Resolves Genie Warlock elemental extra damage badge.
     */
    static resolveGenieDamage(character, pb) {
        const traits = character?.combat?.traits || [];
        const genieTrait = traits.find(t => normalizeKey(t.name).includes('genieswrath'));

        const classes = character?.identity?.classes || [];
        const warlockClass = classes.find(c => normalizeKey(c.name) === 'warlock');
        const resolvedSub = warlockClass ? this.resolveSubclassInfo('warlock', warlockClass.subclass) : null;

        if (!genieTrait && (!resolvedSub || resolvedSub.key !== 'genie')) return null;

        let dmgType = resolvedSub?.specInfo?.damageType;
        if (!dmgType && genieTrait) {
            const text = `${genieTrait.badge || ''} ${genieTrait.desc || ''}`;
            const foundDt = DAMAGE_TYPES.find(dt => new RegExp(`\\b${dt.name}\\b`, 'i').test(text));
            dmgType = foundDt ? foundDt.name : 'Elemental';
        }
        if (!dmgType) dmgType = 'Elemental';

        return `+${pb} ${dmgType} damage`;
    }
}
