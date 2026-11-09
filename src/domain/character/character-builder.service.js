import { CharacterSanitizerService } from './character-sanitizer.service.js';
import { CharacterStorageService } from '../../services/character-storage.service.js';
import { RaceProvider } from '../providers/race.provider.js';
import { ClassFeatureProvider } from '../providers/class-feature.provider.js';
import { ClassSyncService } from '../progression/class-sync.service.js';
import {
    DND_5E_SKILLS,
    ABILITY_KEYS,
    ABILITIES,
    DEFAULT_WALK_SPEED,
    calculateAbilityModifier,
    SKILL_IDS,
    PROFICIENCY_LEVELS
} from '../constants/dnd.constants.js';
import {
    CLASS_CREATION_RULES,
    RACIAL_ASI_MAP
} from '../constants/creation-rules.constants.js';
import { CLASS_STARTING_EQUIPMENT } from '../constants/equipment-packages.constants.js';
import { findFeat } from '../constants/feats.constants.js';
import { normalizeKey, capitalizeWord } from '../../helpers/string.helper.js';

export class CharacterBuilderService {
    /**
     * Resolves the racial ability score bonuses for a character based on mode.
     * 
     * @param {string} raceKey - Race canonical key.
     * @param {string} [subraceKey=null] - Subrace key.
     * @param {string} [asiMode='traditional'] - 'traditional' or 'flexible'.
     * @param {Object} [flexibleChoices={}] - Map of attribute to bonus if flexible mode (e.g. { CHA: 2, DEX: 1 }).
     * @returns {Object} Map of attribute bonuses (e.g. { STR: 0, DEX: 2, CON: 0, INT: 1, WIS: 0, CHA: 0 }).
     */
    static resolveRacialAsi(raceKey, subraceKey = null, asiMode = 'traditional', flexibleChoices = {}) {
        const bonuses = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
        const normRace = normalizeKey(raceKey);

        if (asiMode === 'flexible') {
            for (const [attr, val] of Object.entries(flexibleChoices || {})) {
                const canon = String(attr).toUpperCase();
                if (bonuses[canon] !== undefined) {
                    bonuses[canon] += parseInt(val, 10) || 0;
                }
            }
            return bonuses;
        }

        // Traditional ASI
        const map = RACIAL_ASI_MAP[normRace];
        if (!map) return bonuses;

        // Direct flat bonuses (e.g. human, dragonborn, halforc)
        ABILITY_KEYS.forEach(k => {
            if (typeof map[k] === 'number') bonuses[k] += map[k];
        });

        // Base bonuses
        if (map.base) {
            ABILITY_KEYS.forEach(k => {
                if (typeof map.base[k] === 'number') bonuses[k] += map.base[k];
            });
        }

        // Subrace bonuses
        const normSub = normalizeKey(subraceKey);
        if (normSub) {
            let subAsi = map[normSub];
            if (!subAsi) {
                const matchedKey = Object.keys(map).find(k => k !== 'base' && (normSub.includes(k) || k.includes(normSub)));
                if (matchedKey) subAsi = map[matchedKey];
            }
            if (subAsi) {
                ABILITY_KEYS.forEach(k => {
                    if (typeof subAsi[k] === 'number') bonuses[k] += subAsi[k];
                });
            }
        }

        // Handle Half-Elf choice bonuses if flexible not chosen
        if (normRace === 'halfelf' && map.chooseOtherCount) {
            for (const [attr, val] of Object.entries(flexibleChoices || {})) {
                const canon = String(attr).toUpperCase();
                if (canon !== ABILITIES.CHA && bonuses[canon] !== undefined) {
                    bonuses[canon] += parseInt(val, 10) || 0;
                }
            }
        }

        return bonuses;
    }

    /**
     * Calculates starting HP for level 1+ based on Hit Die and CON modifier.
     * 
     * @param {string} classKey - Class key.
     * @param {number} conMod - Constitution modifier.
     * @param {number} [level=1] - Starting level.
     * @param {boolean} [isHillDwarf=false] - Hill dwarf HP per level trait.
     * @returns {number} Maximum HP.
     */
    static calculateStartingHp(classKey, conMod, level = 1, isHillDwarf = false) {
        const normClass = normalizeKey(classKey);
        const rules = CLASS_CREATION_RULES[normClass] || { hitDieNum: 8 };
        const maxDie = rules.hitDieNum;
        const avgPerLevel = Math.floor(maxDie / 2) + 1;

        const lvl1Hp = Math.max(1, maxDie + conMod + (isHillDwarf ? 1 : 0));
        if (level <= 1) return lvl1Hp;

        const subsequentHp = Math.max(1, avgPerLevel + conMod + (isHillDwarf ? 1 : 0));
        return lvl1Hp + ((level - 1) * subsequentHp);
    }

    /**
     * Assembles a complete, sanitized D&D 5e character object from wizard data.
     * 
     * @param {Object} wizardData - Form data collected by the wizard.
     * @returns {Object} Complete character sheet matching character.json schema.
     */
    static buildCharacter(wizardData = {}) {
        const name = (wizardData.name || 'New Hero').trim();
        const alignment = wizardData.alignment || 'Neutral';
        const background = wizardData.background || 'Folk Hero';

        const raceKey = wizardData.race || 'human';
        const subraceKey = wizardData.subrace || null;
        let raceQuery = capitalizeWord(raceKey);
        if (subraceKey) {
            raceQuery = `${capitalizeWord(subraceKey)} ${capitalizeWord(raceKey)}`;
        }
        const raceInfo = RaceProvider.resolveRace(raceQuery);

        const classKey = normalizeKey(wizardData.class || 'fighter');
        const classRules = CLASS_CREATION_RULES[classKey] || CLASS_CREATION_RULES.fighter;
        const level = Math.max(1, Math.min(20, parseInt(wizardData.level, 10) || 1));
        const subclass = (level >= classRules.subclassLevel && wizardData.subclass) ? wizardData.subclass : '';

        // 1. Calculate Attributes (Base + Racial ASI)
        const baseAttrs = wizardData.baseAttributes || {
            STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
        };
        const racialAsi = this.resolveRacialAsi(raceKey, subraceKey, wizardData.asiMode || 'traditional', wizardData.flexibleAsi || {});

        const finalAttributes = {};
        const savingThrows = new Set(classRules.savingThrows);

        ABILITY_KEYS.forEach(k => {
            const baseScore = parseInt(baseAttrs[k], 10) || 10;
            const racialBonus = racialAsi[k] || 0;
            const finalScore = baseScore + racialBonus;
            finalAttributes[k] = {
                score: finalScore,
                profSave: savingThrows.has(k)
            };
        });

        // 2. CON Modifier & HP
        const conMod = calculateAbilityModifier(finalAttributes[ABILITIES.CON]?.score);
        const isHillDwarf = normalizeKey(raceKey) === 'dwarf' && Boolean(normalizeKey(subraceKey).includes('hill'));
        let maxHp = this.calculateStartingHp(classKey, conMod, level, isHillDwarf);

        // 3. Skills setup
        // Combine background skills + chosen class skills + racial proficiencies
        const chosenProficientSkills = new Set(
            (wizardData.chosenSkills || []).map(s => normalizeKey(s))
        );
        (wizardData.backgroundSkills || []).forEach(s => chosenProficientSkills.add(normalizeKey(s)));
        if (normalizeKey(raceKey) === 'elf') {
            chosenProficientSkills.add(SKILL_IDS.PERCEPTION);
        }

        const skills = DND_5E_SKILLS.map(s => {
            const isProf = chosenProficientSkills.has(normalizeKey(s.id));
            return {
                id: s.id,
                name: s.name,
                attr: s.attr,
                profType: isProf ? PROFICIENCY_LEVELS.PROFICIENT : PROFICIENCY_LEVELS.NONE
            };
        });

        // 4. Hit Dice
        const hitDiceSpent = Array(level).fill(false);

        // 5. Speed & Movement
        const baseSpeed = raceInfo.speed || DEFAULT_WALK_SPEED;

        // 6. Racial damage resistances
        const damageResistances = Array.from(new Set(raceInfo.resistances || []));

        // 7. Spells & Spell Slots
        const chosenSpells = (wizardData.chosenSpells || []).map(sp => {
            if (typeof sp === 'string') return { name: sp, prepared: true };
            return {
                name: sp.name,
                prepared: sp.level === 0 ? true : (sp.prepared !== false)
            };
        });

        // Initial class object
        const classObj = {
            name: capitalizeWord(classKey),
            level,
            subclass: subclass ? capitalizeWord(subclass) : ''
        };

        const expectedSlots = ClassSyncService.calculateExpectedSlots([classObj]);

        // 8. Starting Equipment Package Resolution
        let weapons = wizardData.startingWeapons || [];
        let armors = wizardData.startingArmors || [];
        let tools = wizardData.startingTools || [];
        let consumables = [
            { name: 'Potion of Healing', qty: 2 },
            { name: 'Rations (1 day)', qty: 5 },
            { name: 'Waterskin', qty: 1 }
        ];

        // If specific starting equipment selections are made or default package is used
        const classEquip = CLASS_STARTING_EQUIPMENT[classKey];
        if (classEquip?.choices && (!wizardData.startingWeapons || wizardData.startingWeapons.length === 0)) {
            weapons = [];
            armors = [];
            tools = [];
            const selectedIndices = wizardData.selectedEquipment || {};

            classEquip.choices.forEach((choice, choiceIdx) => {
                const optIdx = selectedIndices[choiceIdx] !== undefined ? selectedIndices[choiceIdx] : 0;
                const opt = choice.options[optIdx] || choice.options[0];
                if (opt?.items) {
                    opt.items.forEach(item => {
                        if (item.type === 'weapon') weapons.push({ ...item });
                        else if (item.type === 'armor') armors.push({ ...item });
                        else if (item.type === 'consumable') consumables.push({ ...item });
                        else tools.push({ ...item });
                    });
                }
            });
        }

        // 9. Feat & Half-Feat Resolution
        const traits = [
            ...(raceInfo.traits || []).map(t => typeof t === 'string' ? { name: t, desc: '' } : t)
        ];

        if (wizardData.chosenFeat) {
            const feat = findFeat(wizardData.chosenFeat);
            if (feat) {
                traits.push({
                    name: `Feat: ${feat.name}`,
                    desc: feat.desc
                });

                // Apply half-feat stat bonus
                if (feat.asi && wizardData.chosenFeatAsi) {
                    const attrKey = String(wizardData.chosenFeatAsi).toUpperCase();
                    if (finalAttributes[attrKey]) {
                        finalAttributes[attrKey].score += feat.asi.amount || 1;
                        finalAttributes[attrKey].mod = calculateAbilityModifier(finalAttributes[attrKey].score);
                    }
                }

                // If Tough feat is selected, grant +2 HP per level
                if (feat.id === 'tough') {
                    maxHp += 2 * level;
                }
            }
        }

        // 10. Compile raw character draft
        const rawCharacter = {
            id: CharacterStorageService.generateUniqueId(),
            identity: {
                name,
                race: raceInfo.name || capitalizeWord(raceKey),
                alignment,
                background,
                classes: [classObj]
            },
            attributes: finalAttributes,
            vitals: {
                currentHp: maxHp,
                maxHp,
                tempHp: 0,
                speed: baseSpeed,
                darkvision: raceInfo.darkvision ? `${raceInfo.darkvision} ft.` : '',
                inspiration: false,
                hitDiceSpent,
                deathSaves: { successes: [false, false, false], failures: [false, false, false] },
                conditions: [],
                damageResistances
            },
            skills,
            combat: {
                traits,
                resources: [],
                sessionLogs: [
                    {
                        id: 'log_start',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        icon: '✨',
                        title: 'Hero Awakens',
                        text: `${name} begins their journey as a Level ${level} ${classObj.name}!`
                    }
                ]
            },
            inventory: {
                wealth: {
                    pp: 0,
                    gp: wizardData.startingGold || 15,
                    ep: 0,
                    sp: 0,
                    cp: 0
                },
                weapons,
                armors,
                consumables,
                tools,
                story: []
            },
            magic: {
                slots: expectedSlots,
                spells: chosenSpells,
                favorites: []
            },
            quests: [
                {
                    title: 'The Adventure Begins',
                    location: 'Local Tavern',
                    description: 'Explore the world, seek out quests, and forge your legend.',
                    isMain: true,
                    completed: false
                }
            ]
        };

        // 9. Synchronize class features and traits for chosen starting level
        ClassSyncService.applyClassFeaturesSync(rawCharacter, (d) => CharacterSanitizerService.sanitize(d));

        // 10. Pass through sanitizer for 100% schema integrity
        return CharacterSanitizerService.sanitize(rawCharacter);
    }
}
