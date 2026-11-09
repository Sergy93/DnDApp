import { CompendiumStorageService } from '../../services/compendium-storage.service.js';
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
            // Access reactive Alpine properties to establish reactive dependency
            const _ = (this.compendiumRevision || 0) + (this.compendiumLoaded ? 1 : 0);
            const races = CompendiumStorageService.getRaces();
            return Object.keys(races).map(k => ({
                key: k,
                name: races[k].name,
                speed: races[k].speed,
                darkvision: races[k].darkvision,
                hasSubraces: Boolean(races[k].subraces && Object.keys(races[k].subraces).length > 0)
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardSubracesList() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumLoaded ? 1 : 0);
            const rKey = normalizeKey(this.wizardData.race);
            const races = CompendiumStorageService.getRaces();
            const raceObj = races[rKey];
            if (!raceObj || !raceObj.subraces) return [];
            return Object.keys(raceObj.subraces).map(sk => ({
                key: sk,
                name: raceObj.subraces[sk].name,
                traits: raceObj.subraces[sk].traits || []
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardClassesList() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumLoaded ? 1 : 0);
            const classes = CompendiumStorageService.getClasses();
            return Object.keys(classes).map(k => ({
                key: k,
                name: classes[k].name,
                hitDie: classes[k].hitDie || 'd8',
                subclasses: Object.keys(classes[k].subclasses || {})
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardSubclassesList() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumLoaded ? 1 : 0);
            const cKey = normalizeKey(this.wizardData.class);
            const classes = CompendiumStorageService.getClasses();
            const classObj = classes[cKey];
            if (!classObj || !classObj.subclasses) return [];
            return Object.keys(classObj.subclasses).map(sk => ({
                key: sk,
                name: classObj.subclasses[sk].name || capitalizeWord(sk)
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardBackgroundsList() {
            const _ = (this.compendiumRevision || 0) + (this.compendiumLoaded ? 1 : 0);
            const backgrounds = CompendiumStorageService.getBackgrounds();
            return Object.keys(backgrounds).map(k => ({
                key: k,
                name: backgrounds[k].name,
                skills: backgrounds[k].skillProficiencies || []
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get wizardClassRules() {
            const cKey = normalizeKey(this.wizardData.class);
            return CLASS_CREATION_RULES[cKey] || CLASS_CREATION_RULES.fighter;
        },

        get wizardBackgroundSkills() {
            const bgKey = normalizeKey(this.wizardData.background);
            const backgrounds = CompendiumStorageService.getBackgrounds();
            const bgObj = backgrounds[bgKey];
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
                subrace: 'variant',
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
                chosenSkills: ['athletics', 'perception'],
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

        wizardValidateStep(step = this.wizardStep) {
            if (step === 1) {
                if (!this.wizardData.name || !this.wizardData.name.trim()) {
                    return 'Character Name is required.';
                }
                if (!this.wizardData.alignment || !this.wizardData.alignment.trim()) {
                    return 'Moral Alignment is required.';
                }
                if (!this.wizardData.background || !this.wizardData.background.trim()) {
                    return 'Background Origin is required.';
                }
            }
            if (step === 2) {
                if (!this.wizardData.race || !this.wizardData.race.trim()) {
                    return 'Primary Race is required.';
                }
                const subraces = this.wizardSubracesList;
                if (subraces.length > 0) {
                    const validKeys = subraces.map(s => s.key);
                    if (!this.wizardData.subrace || !validKeys.includes(this.wizardData.subrace)) {
                        this.wizardData.subrace = subraces[0].key;
                    }
                }
            }
            if (step === 3) {
                if (!this.wizardData.class || !this.wizardData.class.trim()) {
                    return 'Class is required.';
                }
                const rules = this.wizardClassRules;
                const subclasses = this.wizardSubclassesList;
                if (this.wizardData.level >= rules.subclassLevel) {
                    if (!this.wizardData.subclass && subclasses.length > 0) {
                        this.wizardData.subclass = subclasses[0].name;
                    } else if (!this.wizardData.subclass) {
                        return `Subclass is required for ${capitalizeWord(this.wizardData.class)} at level ${this.wizardData.level}.`;
                    }
                }
                const targetSkills = rules.skillsChooseCount;
                if (this.wizardData.chosenSkills.length < targetSkills) {
                    if (this.wizardData.chosenSkills.length === 0) {
                        const allowed = this.wizardAllowedSkillsList
                            .filter(s => !this.wizardBackgroundSkills.includes(s.id))
                            .slice(0, targetSkills)
                            .map(s => s.id);
                        this.wizardData.chosenSkills = allowed;
                    } else {
                        return `Please choose all ${targetSkills} class skill proficiencies (${this.wizardData.chosenSkills.length}/${targetSkills} selected).`;
                    }
                }
            }
            if (step === 4) {
                if (this.wizardData.scoreMethod === 'pointbuy') {
                    if (this.wizardPointBuyRemaining > 0) {
                        return `You have ${this.wizardPointBuyRemaining} unspent Point Buy points. Allocate all 27 points.`;
                    }
                    if (this.wizardPointBuyRemaining < 0) {
                        return `Point Buy limit exceeded by ${Math.abs(this.wizardPointBuyRemaining)}. Maximum budget is 27 points.`;
                    }
                }
            }
            return null;
        },

        wizardGoToStep(targetStep) {
            if (targetStep < this.wizardStep) {
                this.wizardStep = targetStep;
                return;
            }
            for (let s = this.wizardStep; s < targetStep; s++) {
                if (s === 5 && !this.wizardIsSpellcaster) continue;
                const error = this.wizardValidateStep(s);
                if (error) {
                    this.wizardStep = s;
                    this.uiAlert(error, 'Required Field', '⚠️');
                    return;
                }
            }
            this.wizardStep = targetStep;
        },

        wizardNextStep() {
            const error = this.wizardValidateStep(this.wizardStep);
            if (error) {
                this.uiAlert(error, 'Required Field', '⚠️');
                return;
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

        assignStandardScore(attrKey, newScore) {
            const scoreNum = Number(newScore);
            const oldScore = Number(this.wizardData.standardArrayAssigned[attrKey] || 8);
            if (oldScore === scoreNum) return;

            // Swap value with whichever attribute currently holds scoreNum
            ABILITY_KEYS.forEach(k => {
                if (k !== attrKey && Number(this.wizardData.standardArrayAssigned[k]) === scoreNum) {
                    this.wizardData.standardArrayAssigned[k] = oldScore;
                }
            });
            this.wizardData.standardArrayAssigned[attrKey] = scoreNum;
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
            // Validate all steps before finalizing
            for (let s = 1; s <= 4; s++) {
                const error = this.wizardValidateStep(s);
                if (error) {
                    this.wizardStep = s;
                    await this.uiAlert(error, 'Required Field', '⚠️');
                    return;
                }
            }

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
        },

        slugifyCharacterName(name) {
            return slugifyCharacterName(name);
        },

        capitalizeWord(str) {
            return capitalizeWord(str);
        }
    };
}
