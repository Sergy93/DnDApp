import BACKGROUND_COMPENDIUM from '../../dnd-data/background-compendium.json' with { type: "json" };
import { capitalizeWord, normalizeKey } from '../../helpers/string.helper.js';
import { ClassProgressionService } from '../../domain/progression/class-progression.service.js';
import { ClassSyncService } from '../../domain/progression/class-sync.service.js';
import { createMemo } from '../../helpers/memo.helper.js';
import {
    ABILITY_KEYS,
    DEFAULT_ABILITY_SCORE,
    ABILITY_MODIFIER_OFFSET,
    ABILITY_MODIFIER_DIVISOR,
    DEFAULT_HIT_DIE
} from '../../domain/constants/dnd.constants.js';
import { DND_5E_FEATS, findFeat } from '../../domain/constants/feats.constants.js';

/**
 * Progression, Level Up, Backgrounds Compendium, and Class Feature Sync state slice.
 */
export function createProgressionSlice() {
    const memoizedProgressionTrees = createMemo(
        function() {
            const activeClasses = this.data?.identity?.classes || [];
            return activeClasses.map(cls => ({
                name: capitalizeWord(cls.name),
                subclass: cls.subclass ? capitalizeWord(cls.subclass) : '',
                currentLevel: cls.level || 1,
                tree: ClassProgressionService.generateProgressionTree(cls.name, cls.subclass, this.data?.progression)
            }));
        },
        function() {
            const charId = this.data?.id || '';
            const classesSig = (this.data?.identity?.classes || []).map(c => `${c.name}:${c.subclass}:${c.level}`).join(',');
            return `${charId}|${classesSig}`;
        }
    );

    return {
        modalLevelUpOpen: false,
        modalClassProgressionOpen: false,
        classDetailTarget: null,
        levelUpForm: {
            classes: [],
            maxHp: 10,
            attributes: {},
            newClassName: '',
            newClassSubclass: '',
            newClassHitDie: 'd8',
            asiOrFeatMode: 'asi',
            selectedFeatId: '',
            selectedFeatAsi: ''
        },

        get availableFeats() {
            return DND_5E_FEATS;
        },

        get levelUpSelectedFeat() {
            return findFeat(this.levelUpForm.selectedFeatId);
        },

        // Background Compendium
        allBackgrounds: BACKGROUND_COMPENDIUM,
        modalBackgroundsOpen: false,
        backgroundSearchQuery: '',
        backgroundDetailItem: null,

        get progressionTrees() {
            return memoizedProgressionTrees.call(this);
        },

        get filteredBackgrounds() {
            const q = normalizeKey(this.backgroundSearchQuery || '');
            const list = Object.entries(this.allBackgrounds || {}).map(([key, bg]) => ({ key, ...bg }));
            if (!q) return list;
            return list.filter(bg => {
                const name = normalizeKey(bg.name || '');
                const skill = normalizeKey(bg.skillProficiencies || '');
                const feat = normalizeKey(bg.feature?.name || '');
                return name.includes(q) || skill.includes(q) || feat.includes(q);
            });
        },

        showCurrentBackgroundDetail() {
            const currentName = this.data.identity?.background || '';
            const norm = normalizeKey(currentName);
            const foundKey = Object.keys(this.allBackgrounds || {}).find(k => {
                const bg = this.allBackgrounds[k];
                return normalizeKey(bg.name) === norm || norm.includes(normalizeKey(bg.name)) || normalizeKey(bg.name).includes(norm);
            });
            if (foundKey) {
                this.backgroundDetailItem = this.allBackgrounds[foundKey];
            } else {
                this.backgroundDetailItem = Object.values(this.allBackgrounds || {})[0] || null;
            }
            this.modalBackgroundsOpen = true;
        },

        selectBackground(bg) {
            this.backgroundDetailItem = bg;
        },

        openLevelUpModal() {
            this.levelUpForm.classes = JSON.parse(JSON.stringify(this.data.identity?.classes || []));
            this.levelUpForm.maxHp = this.data.vitals?.maxHp || 10;
            this.levelUpForm.attributes = {};
            ABILITY_KEYS.forEach(k => {
                this.levelUpForm.attributes[k] = this.data.attributes?.[k]?.score || DEFAULT_ABILITY_SCORE;
            });
            this.levelUpForm.newClassName = '';
            this.levelUpForm.newClassSubclass = '';
            this.levelUpForm.newClassHitDie = 'd8';
            this.levelUpForm.asiOrFeatMode = 'asi';
            this.levelUpForm.selectedFeatId = '';
            this.levelUpForm.selectedFeatAsi = '';
            this.modalLevelUpOpen = true;
        },

        levelUpClass(cIdx, delta = 1) {
            const cls = this.levelUpForm.classes[cIdx];
            if (!cls) return;
            const current = cls.level || 1;
            const target = Math.max(1, Math.min(20, current + delta));
            if (target === current) return;
            cls.level = target;

            const hitDieFaces = parseInt(String(cls.hitDie || ClassProgressionService.resolveClassHitDie(cls)).replace('d', ''), 10) || 8;
            const avgRoll = Math.floor(hitDieFaces / 2) + 1;
            const conMod = Math.floor(((this.levelUpForm.attributes.CON || DEFAULT_ABILITY_SCORE) - ABILITY_MODIFIER_OFFSET) / ABILITY_MODIFIER_DIVISOR);
            const hpChange = Math.max(1, avgRoll + conMod);

            if (delta > 0) {
                this.levelUpForm.maxHp = (parseInt(this.levelUpForm.maxHp, 10) || 0) + hpChange;
            } else if (delta < 0) {
                this.levelUpForm.maxHp = Math.max(1, (parseInt(this.levelUpForm.maxHp, 10) || 0) - hpChange);
            }
        },

        onNewClassSelected() {
            const found = ClassProgressionService.findCompendiumClass(this.levelUpForm.newClassName);
            if (found?.obj?.hitDie) {
                this.levelUpForm.newClassHitDie = found.obj.hitDie;
            }
        },

        addNewClassToLevelUpForm() {
            const name = this.levelUpForm.newClassName.trim();
            if (!name) return;
            const compClass = ClassProgressionService.findCompendiumClass(name);
            const resolvedHitDie = compClass?.obj?.hitDie || this.levelUpForm.newClassHitDie || DEFAULT_HIT_DIE;
            this.levelUpForm.classes.push({
                name: capitalizeWord(name),
                subclass: capitalizeWord(this.levelUpForm.newClassSubclass.trim()),
                level: 1,
                hitDie: resolvedHitDie
            });
            this.levelUpForm.newClassName = '';
            this.levelUpForm.newClassSubclass = '';
            this.levelUpForm.newClassHitDie = DEFAULT_HIT_DIE;
        },

        removeClassFromLevelUpForm(cIdx) {
            if (this.levelUpForm.classes.length <= 1) return;
            this.levelUpForm.classes.splice(cIdx, 1);
        },

        handleSaveLevelUp() {
            this.data.identity.classes = JSON.parse(JSON.stringify(this.levelUpForm.classes)).map(c => ({
                ...c,
                name: capitalizeWord(c.name),
                subclass: c.subclass ? capitalizeWord(c.subclass) : ''
            }));
            const newMaxHp = parseInt(this.levelUpForm.maxHp, 10) || this.data.vitals.maxHp;
            this.data.vitals.maxHp = newMaxHp;
            if (this.data.vitals.currentHp > newMaxHp) {
                this.data.vitals.currentHp = newMaxHp;
            }

            ABILITY_KEYS.forEach(k => {
                if (this.data.attributes[k]) {
                    this.data.attributes[k].score = parseInt(this.levelUpForm.attributes[k], 10) || DEFAULT_ABILITY_SCORE;
                }
            });

            // If Feat was chosen instead of manual ASI
            let featAddedMsg = '';
            if (this.levelUpForm.asiOrFeatMode === 'feat' && this.levelUpForm.selectedFeatId) {
                const feat = findFeat(this.levelUpForm.selectedFeatId);
                if (feat) {
                    this.data.combat = this.data.combat || {};
                    this.data.combat.traits = this.data.combat.traits || [];
                    const featName = `Feat: ${feat.name}`;
                    if (!this.data.combat.traits.some(t => t.name.toLowerCase() === featName.toLowerCase())) {
                        this.data.combat.traits.push({
                            name: featName,
                            desc: feat.desc
                        });
                    }

                    // Apply half-feat ASI if specified
                    if (feat.asi && this.levelUpForm.selectedFeatAsi) {
                        const attrKey = String(this.levelUpForm.selectedFeatAsi).toUpperCase();
                        if (this.data.attributes[attrKey]) {
                            this.data.attributes[attrKey].score += (feat.asi.amount || 1);
                        }
                    }

                    // If Tough feat, grant +2 HP per level
                    if (feat.id === 'tough') {
                        const totalLvl = (this.data.identity?.classes || []).reduce((a, b) => a + (b.level || 0), 0);
                        const toughBonus = 2 * totalLvl;
                        this.data.vitals.maxHp += toughBonus;
                        this.data.vitals.currentHp = Math.min(this.data.vitals.maxHp, this.data.vitals.currentHp + toughBonus);
                    }

                    featAddedMsg = ` Learned Feat: ${feat.name}.`;
                }
            }

            // 1. Sync Spell Slots & 2. Auto-sync class features & clean stale
            const { newResources, newTraits } = ClassSyncService.applyClassFeaturesSync(this.data);
            this.equipRevision++;
            this.modalLevelUpOpen = false;

            const totalLevel = (this.data.identity?.classes || []).reduce((a, b) => a + (b.level || 0), 0);
            const addedNames = [...newResources.map(r => r.name), ...newTraits.map(t => t.name)];
            let alertMsg = `Advanced to Level ${totalLevel}! HP, Hit Dice, and Spell Slots have been automatically synchronized.${featAddedMsg}`;
            if (addedNames.length > 0) {
                alertMsg += `\n\n✨ Unlocked new class features added:\n• ` + addedNames.join('\n• ');
            }
            this.logEvent('⭐', 'Level Up', `Reached Level ${totalLevel}. Max HP: ${this.data.vitals.maxHp}.${featAddedMsg}${addedNames.length > 0 ? ` Unlocked: ${addedNames.join(', ')}.` : ''}`);
            this.uiAlert(alertMsg, "Level Up Complete", "🎉");
        },

        syncClassFeatures() {
            const { newResources, newTraits } = ClassSyncService.applyClassFeaturesSync(this.data);
            const addedCount = newResources.length + newTraits.length;
            this.equipRevision++;
            this.saveState();

            if (addedCount > 0) {
                const names = [...newResources.map(r => r.name), ...newTraits.map(t => t.name)].join(', ');
                this.logEvent('✨', 'Features Synchronized', `Added: ${names}.`);
                this.uiAlert(`Synchronized ${addedCount} unlocked class features and spell slots:\n• ${names}`, "Features Synchronized", "✨");
            } else {
                this.uiAlert("All class features, tactical resources, and spell slots are already up to date with your current levels.", "Already Up to Date", "✅");
            }
        }
    };
}
