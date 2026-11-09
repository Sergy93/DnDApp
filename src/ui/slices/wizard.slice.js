import RACE_COMPENDIUM from '../../dnd-data/race-compendium.json' with { type: "json" };
import CLASS_COMPENDIUM from '../../dnd-data/class-compendium.json' with { type: "json" };
import BACKGROUND_COMPENDIUM from '../../dnd-data/background-compendium.json' with { type: "json" };
import { CharacterBuilderService } from '../../domain/character/character-builder.service.js';
import { CharacterStorageService } from '../../services/character-storage.service.js';
import { CharacterRouterService } from '../../services/character-router.service.js';
import { DND_5E_SKILLS, ABILITY_KEYS, calculateAbilityModifier, DEFAULT_ABILITY_SCORE } from '../../domain/constants/dnd.constants.js';
import {
    CLASS_CREATION_RULES,
    POINT_BUY_COSTS,
    POINT_BUY_TOTAL_POINTS,
    STANDARD_ARRAY
} from '../../domain/constants/creation-rules.constants.js';
import { normalizeKey, capitalizeWord } from '../../helpers/string.helper.js';

export function createWizardSlice() {
    return {
        wizardOpen: false,
        wizardStep: 1,

        wizardData: {
            name: '',
            alignment: 'Neutral Good',
            background: 'Folk Hero',
            race: 'human',
            subrace: '',
            asiMode: 'traditional',
            flexibleAsi: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
            class: 'fighter',
            subclass: '',
            level: 1,
            scoreMethod: 'standard', // 'standard' | 'pointbuy' | 'roll4d6' | 'manual'
            baseAttributes: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
            standardArrayAssigned: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
            pointBuyScores: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 },
            rolledAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            manualAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            chosenSkills: [],
            chosenSpells: []
        },

        // ================= WIZARD COMPUTED GETTERS =================
        get wizardRacesList() {
            return Object.keys(RACE_COMPENDIUM).map(k => ({
                key: k,
                name: RACE_COMPENDIUM[k].name,
                speed: RACE_COMPENDIUM[k].speed,
                darkvision: RACE_COMPENDIUM[k].darkvision,
                hasSubraces: Boolean(RACE_COMPENDIUM[k].subraces && Object.keys(RACE_COMPENDIUM[k].subraces).length > 0)
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardSubracesList() {
            const rKey = normalizeKey(this.wizardData.race);
            const raceObj = RACE_COMPENDIUM[rKey];
            if (!raceObj || !raceObj.subraces) return [];
            return Object.keys(raceObj.subraces).map(sk => ({
                key: sk,
                name: raceObj.subraces[sk].name,
                traits: raceObj.subraces[sk].traits || []
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardClassesList() {
            return Object.keys(CLASS_COMPENDIUM).map(k => ({
                key: k,
                name: CLASS_COMPENDIUM[k].name,
                hitDie: CLASS_COMPENDIUM[k].hitDie || 'd8',
                subclasses: Object.keys(CLASS_COMPENDIUM[k].subclasses || {})
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardSubclassesList() {
            const cKey = normalizeKey(this.wizardData.class);
            const classObj = CLASS_COMPENDIUM[cKey];
            if (!classObj || !classObj.subclasses) return [];
            return Object.keys(classObj.subclasses).map(sk => ({
                key: sk,
                name: classObj.subclasses[sk].name || capitalizeWord(sk)
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardBackgroundsList() {
            return Object.keys(BACKGROUND_COMPENDIUM).map(k => ({
                key: k,
                name: BACKGROUND_COMPENDIUM[k].name,
                skills: BACKGROUND_COMPENDIUM[k].skillProficiencies || []
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardClassRules() {
            const cKey = normalizeKey(this.wizardData.class);
            return CLASS_CREATION_RULES[cKey] || CLASS_CREATION_RULES.fighter;
        },

        get wizardBackgroundSkills() {
            const bgKey = normalizeKey(this.wizardData.background);
            const bgObj = BACKGROUND_COMPENDIUM[bgKey];
            return (bgObj?.skillProficiencies || []).map(s => normalizeKey(s));
        },

        get wizardAllowedSkillsList() {
            const rules = this.wizardClassRules;
            if (rules.skillOptions === 'all') {
                return DND_5E_SKILLS;
            }
            const allowedSet = new Set(rules.skillOptions || []);
            return DND_5E_SKILLS.filter(s => allowedSet.has(s.id));
        },

        get wizardPointBuyRemaining() {
            let spent = 0;
            ABILITY_KEYS.forEach(k => {
                const score = this.wizardData.pointBuyScores[k] || 8;
                spent += POINT_BUY_COSTS[score] ?? 0;
            });
            return POINT_BUY_TOTAL_POINTS - spent;
        },

        get wizardRacialAsi() {
            return CharacterBuilderService.resolveRacialAsi(
                this.wizardData.race,
                this.wizardData.subrace,
                this.wizardData.asiMode,
                this.wizardData.flexibleAsi
            );
        },

        get wizardFinalAttributes() {
            let base = {};
            if (this.wizardData.scoreMethod === 'pointbuy') base = this.wizardData.pointBuyScores;
            else if (this.wizardData.scoreMethod === 'roll4d6') base = this.wizardData.rolledAttributes;
            else if (this.wizardData.scoreMethod === 'manual') base = this.wizardData.manualAttributes;
            else base = this.wizardData.standardArrayAssigned;

            const final = {};
            const asi = this.wizardRacialAsi;

            ABILITY_KEYS.forEach(k => {
                const b = parseInt(base[k], 10) || DEFAULT_ABILITY_SCORE;
                const r = asi[k] || 0;
                const score = b + r;
                const mod = calculateAbilityModifier(score);
                final[k] = {
                    base: b,
                    racial: r,
                    score,
                    mod,
                    modStr: mod >= 0 ? `+${mod}` : `${mod}`
                };
            });

            return final;
        },

        get wizardIsSpellcaster() {
            return Boolean(this.wizardClassRules.spellcastingAttr);
        },

        // ================= WIZARD ACTIONS =================
        openNewHeroWizard() {
            this.wizardStep = 1;
            this.wizardData = {
                name: '',
                alignment: 'Neutral Good',
                background: 'Folk Hero',
                race: 'human',
                subrace: '',
                asiMode: 'traditional',
                flexibleAsi: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
                class: 'fighter',
                subclass: '',
                level: 1,
                scoreMethod: 'standard',
                baseAttributes: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
                standardArrayAssigned: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
                pointBuyScores: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 },
                rolledAttributes: { STR: 12, DEX: 12, CON: 12, INT: 12, WIS: 12, CHA: 12 },
                manualAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                chosenSkills: [],
                chosenSpells: []
            };
            this.wizardOpen = true;
            this.currentView = 'create';
            CharacterRouterService.navigateToCreate();
        },

        closeNewHeroWizard() {
            this.wizardOpen = false;
            this.currentView = 'sheet';
            const activeSlug = this.data?.slug || this.charactersRegistry?.[0]?.slug || 'dorian';
            CharacterRouterService.navigateToSlug(activeSlug);
        },

        wizardNextStep() {
            if (this.wizardStep === 1) {
                if (!this.wizardData.name.trim()) {
                    this.wizardData.name = 'Hero';
                }
            }
            if (this.wizardStep < 6) {
                // Skip magic step if not a spellcaster
                if (this.wizardStep === 4 && !this.wizardIsSpellcaster) {
                    this.wizardStep = 6;
                } else {
                    this.wizardStep++;
                }
            }
        },

        wizardPrevStep() {
            if (this.wizardStep > 1) {
                if (this.wizardStep === 6 && !this.wizardIsSpellcaster) {
                    this.wizardStep = 4;
                } else {
                    this.wizardStep--;
                }
            }
        },

        onWizardRaceChange() {
            const subraces = this.wizardSubracesList;
            this.wizardData.subrace = subraces.length > 0 ? subraces[0].key : '';
        },

        onWizardClassChange() {
            const subclasses = this.wizardSubclassesList;
            this.wizardData.subclass = (this.wizardData.level >= this.wizardClassRules.subclassLevel && subclasses.length > 0)
                ? subclasses[0].name
                : '';
            this.wizardData.chosenSkills = [];
            this.wizardData.chosenSpells = [];
        },

        adjustPointBuy(attrKey, delta) {
            const current = this.wizardData.pointBuyScores[attrKey] || 8;
            const target = current + delta;
            if (target < 8 || target > 15) return;

            const currentCost = POINT_BUY_COSTS[current];
            const targetCost = POINT_BUY_COSTS[target];
            const diff = targetCost - currentCost;

            if (diff > this.wizardPointBuyRemaining) return;

            this.wizardData.pointBuyScores[attrKey] = target;
        },

        roll4d6Attributes() {
            ABILITY_KEYS.forEach(k => {
                const rolls = [
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ];
                rolls.sort((a, b) => a - b);
                const sum = rolls[1] + rolls[2] + rolls[3]; // drop lowest
                this.wizardData.rolledAttributes[k] = sum;
            });
        },

        toggleWizardSkill(skillId) {
            const normId = normalizeKey(skillId);
            // Ignore background skills (already granted)
            if (this.wizardBackgroundSkills.includes(normId)) return;

            const idx = this.wizardData.chosenSkills.indexOf(normId);
            if (idx >= 0) {
                this.wizardData.chosenSkills.splice(idx, 1);
            } else {
                if (this.wizardData.chosenSkills.length < this.wizardClassRules.skillsChooseCount) {
                    this.wizardData.chosenSkills.push(normId);
                }
            }
        },

        isWizardSkillSelected(skillId) {
            const normId = normalizeKey(skillId);
            return this.wizardBackgroundSkills.includes(normId) || this.wizardData.chosenSkills.includes(normId);
        },

        async finalizeAndCreateHero() {
            // Determine active base attributes map based on selected method
            let baseAttrs = {};
            if (this.wizardData.scoreMethod === 'pointbuy') baseAttrs = this.wizardData.pointBuyScores;
            else if (this.wizardData.scoreMethod === 'roll4d6') baseAttrs = this.wizardData.rolledAttributes;
            else if (this.wizardData.scoreMethod === 'manual') baseAttrs = this.wizardData.manualAttributes;
            else baseAttrs = this.wizardData.standardArrayAssigned;

            const payload = {
                name: this.wizardData.name.trim() || 'New Hero',
                alignment: this.wizardData.alignment,
                background: this.wizardData.background,
                race: this.wizardData.race,
                subrace: this.wizardData.subrace,
                asiMode: this.wizardData.asiMode,
                flexibleAsi: this.wizardData.flexibleAsi,
                class: this.wizardData.class,
                subclass: this.wizardData.subclass,
                level: this.wizardData.level,
                baseAttributes: baseAttrs,
                chosenSkills: this.wizardData.chosenSkills,
                backgroundSkills: this.wizardBackgroundSkills,
                chosenSpells: this.wizardData.chosenSpells
            };

            const newCharacter = CharacterBuilderService.buildCharacter(payload);
            const saved = CharacterStorageService.saveCharacter(newCharacter, { makeActive: true });

            this.data = saved.characterData;
            this.activeCharacterId = saved.id;
            this.charactersRegistry = CharacterStorageService.getRegistry();
            this.equipRevision++;
            CharacterRouterService.navigateToSlug(saved.slug);

            this.wizardOpen = false;
            this.currentView = 'sheet';
            await this.uiAlert(`Hero "${saved.characterData.identity.name}" has stepped into the realm at /#/c/${saved.slug}!`, "Hero Summoned", "✨");
        }
    };
}
