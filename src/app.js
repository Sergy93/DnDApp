// ================= FILEREADER SAFETY =================
const SafeFileReader = (typeof window !== 'undefined' && window.FileReader)
    ? window.FileReader
    : (typeof FileReader !== 'undefined' ? FileReader : null);

const STORAGE_KEY = 'character_dnd_v21';

import DND_RULES from "./dnd-data/dnd-rules.json" with { type: "json" };
import CHARACTER_DATA from "./character.json" with { type: "json" };
import CLASS_COMPENDIUM from "./dnd-data/class-compendium.json" with { type: "json" };
import BACKGROUND_COMPENDIUM from "./dnd-data/background-compendium.json" with { type: "json" };

import { normalizeKey, capitalizeWord } from "./helpers/string.helper.js";
import { TemplateHelper } from "./helpers/template.helper.js";
import { ItemBonusHelper } from "./helpers/item-bonus.helper.js";
import { collectActionFeatures } from "./helpers/action-collector.helper.js";
import { createMemo } from "./helpers/memo.helper.js";
import { StorageService } from "./services/storage.service.js";
import { calculateAttributes, resolveAttributeMod } from "./domain/calculators/attributes.calculator.js";
import { calculateSkills } from "./domain/calculators/skills.calculator.js";
import { resolveCharacterResistances } from "./domain/calculators/resistances.calculator.js";
import { CharacterSanitizerService } from "./domain/character/character-sanitizer.service.js";
import { ClassFeatureProvider } from "./domain/providers/class-feature.provider.js";
import { RaceProvider } from "./domain/providers/race.provider.js";
import { SpellService } from "./domain/spells/spell.service.js";
import { ClassProgressionService } from "./domain/progression/class-progression.service.js";
import { ClassSyncService } from "./domain/progression/class-sync.service.js";
import { calculateArmorClass } from "./domain/calculators/ac.calculator.js";
import { calculateWeapons } from "./domain/calculators/weapons.calculator.js";
import { calculateSpellStats } from "./domain/calculators/spell-stats.calculator.js";
import { calculateInitiative } from "./domain/calculators/initiative.calculator.js";
import { calculateMovementAndSenses, getArmorMinStr } from "./domain/calculators/movement-senses.calculator.js";
import { calculateSpellPreparation } from "./domain/calculators/spell-preparation.calculator.js";
import { composeSlices } from "./helpers/slice.helper.js";
import { getAllEquippedItems } from "./domain/items/equipped-items.helper.js";
import { createQuestsSlice } from "./ui/slices/quests.slice.js";
import { createProgressionSlice } from "./ui/slices/progression.slice.js";
import { createVitalsSlice } from "./ui/slices/vitals.slice.js";
import { createInventorySlice } from "./ui/slices/inventory.slice.js";
import { createSpellsSlice } from "./ui/slices/spells.slice.js";
import * as DND_CONSTANTS from "./domain/constants/dnd.constants.js";
import {
    DEFAULT_ABILITY_SCORE,
    ABILITY_MODIFIER_OFFSET,
    ABILITY_MODIFIER_DIVISOR,
    MIN_CHARACTER_LEVEL,
    BASE_PROFICIENCY_BONUS,
    PROFICIENCY_LEVEL_STEP,
    MIN_RESOURCE_USES,
    BASE_PASSIVE_SCORE,
    PASSIVE_ADVANTAGE_BONUS,
    DEFAULT_HIT_DIE,
    DND_5E_SKILLS
} from "./domain/constants/dnd.constants.js";


const DND_CONDITIONS = DND_RULES.conditions;
const DAMAGE_TYPES = DND_RULES.damageTypes;
const SPELL_SLOTS_TABLES = DND_RULES.spellSlotsTables;
const SUBCLASS_ALIASES = Object.fromEntries(
    Object.entries(CLASS_COMPENDIUM).filter(([, v]) => v.subclassAliases).map(([k, v]) => [k, v.subclassAliases])
);
const CLASS_FEATURES_SYNC = Object.fromEntries(
    Object.entries(CLASS_COMPENDIUM).filter(([, v]) => v.featuresSync).map(([k, v]) => [k, v.featuresSync])
);

export {
    DND_CONSTANTS,
    DND_CONDITIONS,
    DAMAGE_TYPES,
    DND_5E_SKILLS,
    normalizeKey,
    capitalizeWord,
    findCompendiumClass,
    resolveSubclassInfo,
    findCompendiumSubclass,
    generateProgressionTree,
    resolveAttributeMod,
    calculateExpectedSlots,
    syncCharacterSpellSlots,
    resolveDiceScale,
    resolveBardicDie,
    resolveSneakAttackDie,
    resolveMartialArtsDie,
    resolveSuperiorityDie,
    resolveRageDamage,
    resolvePsionicEnergyDie,
    detectClassFeaturesToSync,
    applyClassFeaturesSync,
    getResourceMaxUses,
    sanitizeTracking,
    parseCharacterFileContent,
    hasCharacterFeature,
    resolveGenieDamage,
    getAllEquippedItems,
    resolveCharacterResistances,
    resolveClassHitDie,
    resolveSpellcastingAttrKey,
    resolveSongOfRestDie,
    computeStats,
    calculateInitiative,
    calculateMovementAndSenses,
    getArmorMinStr,
    calculateSpellPreparation,
    clean5eToolsText,
    parse5eToolsSpell,
    buildSpellsCompendium,
    findSpellInCompendium,
    getCantripScalingTier,
    resolveScaledSpellDamage,
    calculateSlotDamage,
    resolveSpellData,
    loadInitialData,
    createCharacterSheet,
    TemplateHelper,
    ItemBonusHelper,
    StorageService,
    ClassFeatureProvider,
    RaceProvider,
    SpellService,
    ClassProgressionService,
    ClassSyncService
};

const findCompendiumClass = ClassProgressionService.findCompendiumClass.bind(ClassProgressionService);
const resolveSubclassInfo = ClassProgressionService.resolveSubclassInfo.bind(ClassProgressionService);
const findCompendiumSubclass = ClassProgressionService.findCompendiumSubclass.bind(ClassProgressionService);
const generateProgressionTree = ClassProgressionService.generateProgressionTree.bind(ClassProgressionService);
const resolveDiceScale = ClassProgressionService.resolveDiceScale.bind(ClassProgressionService);
const resolveBardicDie = ClassProgressionService.resolveBardicDie.bind(ClassProgressionService);
const resolveSneakAttackDie = ClassProgressionService.resolveSneakAttackDie.bind(ClassProgressionService);
const resolveMartialArtsDie = ClassProgressionService.resolveMartialArtsDie.bind(ClassProgressionService);
const resolveSuperiorityDie = ClassProgressionService.resolveSuperiorityDie.bind(ClassProgressionService);
const resolveRageDamage = ClassProgressionService.resolveRageDamage.bind(ClassProgressionService);
const resolvePsionicEnergyDie = ClassProgressionService.resolvePsionicEnergyDie.bind(ClassProgressionService);

const calculateExpectedSlots = ClassSyncService.calculateExpectedSlots.bind(ClassSyncService);
const syncCharacterSpellSlots = ClassSyncService.syncCharacterSpellSlots.bind(ClassSyncService);
const detectClassFeaturesToSync = ClassSyncService.detectClassFeaturesToSync.bind(ClassSyncService);
const applyClassFeaturesSync = (d) => ClassSyncService.applyClassFeaturesSync(d, sanitizeTracking);
const getResourceMaxUses = ClassSyncService.resolveResourceMaxUses.bind(ClassSyncService);
const sanitizeTracking = (d) => CharacterSanitizerService.sanitize(d);

function loadInitialData() {
    const base = JSON.parse(JSON.stringify(CHARACTER_DATA));
    const loaded = StorageService.load(STORAGE_KEY, null);
    if (!loaded) return sanitizeTracking(base);
    return sanitizeTracking(loaded);
}

function parseCharacterFileContent(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Empty file');
    }
    return JSON.parse(rawText.trim());
}

// ================= STATS COMPUTATION =================
function hasCharacterFeature(d, keywords = []) {
    const normKeywords = keywords.map(normalizeKey).filter(Boolean);
    if (normKeywords.length === 0) return false;

    const traits = d?.combat?.traits || [];
    for (const t of traits) {
        const text = normalizeKey(`${t.name || ''} ${t.desc || ''}`);
        if (normKeywords.some(kw => text.includes(kw))) return true;
    }

    const classes = d?.identity?.classes || [];
    for (const cls of classes) {
        const lvl = cls.level || 1;
        const tree = generateProgressionTree(cls.name, cls.subclass, d?.progression);
        for (const node of tree) {
            if (node.level <= lvl) {
                const featsText = normalizeKey((node.feats || []).join(' '));
                if (normKeywords.some(kw => featsText.includes(kw))) return true;
            }
        }
    }
    return false;
}

const resolveGenieDamage = ClassProgressionService.resolveGenieDamage.bind(ClassProgressionService);






const resolveClassHitDie = ClassProgressionService.resolveClassHitDie.bind(ClassProgressionService);
const resolveSpellcastingAttrKey = ClassProgressionService.resolveSpellcastingAttrKey.bind(ClassProgressionService);
const resolveSongOfRestDie = ClassProgressionService.resolveSongOfRestDie.bind(ClassProgressionService);

function computeStats(d) {
    const classes = d?.identity?.classes || [];
    const totalLevel = classes.reduce((acc, c) => acc + (c.level || 0), 0) || MIN_CHARACTER_LEVEL;
    const pb = Math.floor((totalLevel - MIN_CHARACTER_LEVEL) / PROFICIENCY_LEVEL_STEP) + BASE_PROFICIENCY_BONUS;

    const raceInfo = RaceProvider.resolveRace(d?.identity?.race);
    const bonusHpFromRace = (raceInfo.bonusHpPerLevel || 0) * totalLevel;

    const skillRules = ClassFeatureProvider.resolveSkillRules(d, pb, hasCharacterFeature);
    const { jackOfAllTrades, hasJackOfAllTrades } = skillRules;

    const allEquipped = getAllEquippedItems(d);

    const computedAttrs = calculateAttributes(d?.attributes, allEquipped, pb);

    const computedSkills = calculateSkills(
        d?.skills,
        computedAttrs,
        pb,
        skillRules,
        allEquipped
    );

    const percSkill = computedSkills.find(s => s.id === 'perception');
    const percAdvBonus = percSkill?.hasAdvantage ? PASSIVE_ADVANTAGE_BONUS : 0;
    const passivePerception = BASE_PASSIVE_SCORE + (percSkill ? percSkill.valNum : (computedAttrs.WIS.mod + jackOfAllTrades)) + percAdvBonus;
    
    const initiativeData = calculateInitiative(
        computedAttrs,
        pb,
        d,
        allEquipped
    );
    const { initNum, initStr, initDesc, initBreakdown } = initiativeData;

    const { ac: calculatedAc, armorDesc, ignoresHeavyArmorStrPenalty } = calculateArmorClass(
        d?.inventory?.armors,
        d?.inventory?.story,
        computedAttrs,
        d
    );

    const movementAndSenses = calculateMovementAndSenses(
        d,
        computedAttrs,
        raceInfo,
        d?.inventory?.armors,
        allEquipped
    );

    const spellPrep = calculateSpellPreparation(
        d,
        computedAttrs,
        d?.magic?.spells
    );

    const computedWeapons = calculateWeapons(d?.inventory?.weapons, computedAttrs, pb, d);

    const spellcastingAttrKey = resolveSpellcastingAttrKey(d);
    const { spellDC, spellAtkStr } = calculateSpellStats(
        spellcastingAttrKey,
        computedAttrs,
        pb,
        allEquipped
    );

    const bardicUses = Math.max(MIN_RESOURCE_USES, computedAttrs.CHA.mod);
    const hitDiceList = classes.map(c => `${c.level} ${resolveClassHitDie(c)}`).join(' + ');
    const songOfRestDie = resolveSongOfRestDie(d);
    const bardicDie = resolveBardicDie(d);
    const sneakAttackDie = resolveSneakAttackDie(d);
    const martialArtsDie = resolveMartialArtsDie(d);
    const superiorityDie = resolveSuperiorityDie(d);
    const rageDamage = resolveRageDamage(d);
    const psionicDie = resolvePsionicEnergyDie(d);

    const genieDamage = resolveGenieDamage(d, pb);
    const combatBadges = [];
    (d?.combat?.traits || []).forEach(t => {
        if (t.badge) {
            let badgeText = TemplateHelper.interpolate(t.badge, {
                pb,
                bardicDie,
                songOfRestDie,
                sneakAttackDie,
                martialArtsDie,
                superiorityDie,
                rageDamage,
                psionicDie
            });
            combatBadges.push({
                icon: t.badgeIcon || '⚡',
                text: badgeText,
                title: t.name || 'Trait'
            });
        }
    });
    if (genieDamage && !combatBadges.some(b => b.text.includes(genieDamage) || (b.title && b.title.includes("Genie's Wrath")))) {
        combatBadges.push({
            icon: '🌩️',
            text: genieDamage,
            title: "Genie's Wrath"
        });
    }

    return {
        totalLevel,
        pb,
        pbStr: `+${pb}`,
        hasJackOfAllTrades,
        jackOfAllTrades,
        computedAttrs,
        computedSkills,
        passivePerception,
        initNum,
        initStr,
        initDesc,
        initBreakdown,
        speedStr: movementAndSenses.speedStr,
        finalWalkSpeed: movementAndSenses.finalWalkSpeed,
        heavyArmorPenalty: movementAndSenses.heavyArmorPenalty,
        heavyArmorWarning: movementAndSenses.heavyArmorWarning,
        heavyArmorViolatedItem: movementAndSenses.heavyArmorViolatedItem,
        speedDesc: movementAndSenses.speedDesc,
        movementModes: movementAndSenses.movementModes,
        senses: movementAndSenses.senses,
        spellPrep,
        ac: calculatedAc,
        armorDesc,
        ignoresHeavyArmorStrPenalty,
        spellStat: spellcastingAttrKey,
        spellcastingAttrKey,
        spellAtkStr,
        spellDC,
        genieDamage,
        combatBadges,
        songOfRestDie,
        bardicDie,
        sneakAttackDie,
        martialArtsDie,
        superiorityDie,
        rageDamage,
        psionicDie,
        bardicUses,
        bonusHpFromRace,
        hitDiceList,
        hitDiceBreakdown: classes.map(c => `${c.level} ${capitalizeWord(c.name)}`).join(' + '),
        classesSummary: classes.map(c => `${capitalizeWord(c.name)}${c.subclass ? ` (${capitalizeWord(c.subclass)})` : ''} ${c.level}`).join(' / '),
        computedWeapons,
        raceInfo,
        resistances: resolveCharacterResistances(d)
    };
}


// ================= SPELL PARSER & COMPENDIUM =================
const clean5eToolsText = SpellService.clean5eToolsText.bind(SpellService);
const parse5eToolsSpell = SpellService.parse5eToolsSpell.bind(SpellService);
const buildSpellsCompendium = (sources = []) => SpellService.buildSpellsCompendium(sources);
const findSpellInCompendium = SpellService.findSpellInCompendium.bind(SpellService);
const getCantripScalingTier = SpellService.getCantripScalingTier.bind(SpellService);
const resolveScaledSpellDamage = SpellService.resolveScaledSpellDamage.bind(SpellService);
const calculateSlotDamage = SpellService.calculateSlotDamage.bind(SpellService);
const resolveSpellData = SpellService.resolveSpellData.bind(SpellService);

// ================= COMPONENTE ALPINE.JS =================
function createCharacterSheet() {
    const memoizedStats = createMemo(
        function() {
            return computeStats(this.data);
        },
        function() {
            const classesSig = (this.data?.identity?.classes || []).map(c => `${c.name}:${c.level}:${c.subclass}`).join(',');
            const attrsSig = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(k => this.data?.attributes?.[k]?.score || DEFAULT_ABILITY_SCORE).join(',');
            return `${this.equipRevision}|${this.data?.identity?.race}|${classesSig}|${attrsSig}`;
        }
    );

    const memoizedCombatResources = createMemo(
        function() {
            const _rev = this.equipRevision;
            const bardicDie = this.stats.bardicDie || '1d8';
            const pb = this.stats.pb || BASE_PROFICIENCY_BONUS;
            const vesselHours = pb * 2;
            const equippedItemNames = new Set((this.allEquipped || []).map(i => normalizeKey(i.name)));

            return (this.data.combat?.resources || []).map((r, idx) => {
                if (r.sourceItem && !equippedItemNames.has(normalizeKey(r.sourceItem))) {
                    return null;
                }

                let displayName = TemplateHelper.interpolate(r.name || 'Resource', {
                    pb,
                    bardicDie,
                    songOfRestDie: this.stats.songOfRestDie,
                    sneakAttackDie: this.stats.sneakAttackDie,
                    martialArtsDie: this.stats.martialArtsDie,
                    superiorityDie: this.stats.superiorityDie,
                    rageDamage: this.stats.rageDamage,
                    psionicDie: this.stats.psionicDie,
                    vesselHours
                });
                let displayReset = r.reset || 'Rest';
                const norm = normalizeKey(r.name || '');

                if (r.id === 'insp_bard' || norm.includes('bardicinspiration')) {
                    displayName = `Bardic Inspiration (${bardicDie})`;
                    const bardClass = (this.data.identity?.classes || []).find(c => normalizeKey(c?.name) === 'bard');
                    const bardLvl = bardClass ? (parseInt(bardClass.level, 10) || 0) : 0;
                    if (bardLvl >= 5) {
                        displayReset = 'Short/Long Rest';
                    }
                } else if (r.id === 'genie_vessel' || norm.includes('geniesvessel')) {
                    displayName = `Genie's Vessel (${vesselHours}h)`;
                }

                return {
                    ...r,
                    originalIndex: idx,
                    displayName,
                    displayReset
                };
            }).filter(Boolean);
        },
        function() {
            const rCount = this.data.combat?.resources?.length || 0;
            return `${this.equipRevision}|${this.stats.bardicDie}|${this.stats.pb}|${rCount}`;
        }
    );

    const memoizedTraits = createMemo(
        function() {
            const bardicDie = this.stats.bardicDie || '1d8';
            const pb = this.stats.pb || BASE_PROFICIENCY_BONUS;
            const songOfRestDie = this.stats.songOfRestDie || '1d6';
            const spellDC = this.stats.spellDC || 15;
            const spellAtk = this.stats.spellAtkStr || '+7';
            const vesselHours = pb * 2;
            const interpCtx = {
                pb,
                spellDC,
                spellAtk,
                bardicDie,
                songOfRestDie,
                sneakAttackDie: this.stats.sneakAttackDie,
                martialArtsDie: this.stats.martialArtsDie,
                superiorityDie: this.stats.superiorityDie,
                rageDamage: this.stats.rageDamage,
                psionicDie: this.stats.psionicDie,
                vesselHours
            };

            return (this.data.combat?.traits || []).map((t, idx) => {
                const displayName = TemplateHelper.interpolate(t.name || '', interpCtx);
                const displayDesc = TemplateHelper.interpolate(t.desc, interpCtx);

                return {
                    ...t,
                    originalIndex: idx,
                    displayName,
                    displayDesc
                };
            });
        },
        function() {
            const tCount = this.data.combat?.traits?.length || 0;
            const tNames = (this.data.combat?.traits || []).map(t => t.name).join(',');
            return `${this.equipRevision}|${this.stats.bardicDie}|${this.stats.songOfRestDie}|${this.stats.pb}|${this.stats.spellDC}|${this.stats.spellAtkStr}|${tCount}|${tNames}`;
        }
    );

    const base = {
        data: loadInitialData(),
        activeTab: 'profile',
        compendiumCount: 0,

        modalDialog: {
            open: false,
            title: '',
            message: '',
            icon: 'ℹ️',
            showCancel: false,
            showInput: false,
            inputValue: '',
            inputPlaceholder: '',
            confirmText: 'OK',
            cancelText: 'Cancel',
            confirmClass: 'bg-brand-600 hover:bg-brand-500',
            resolve: null
        },

        init() {
            if (SpellService.spellsCompendium.length > 0) {
                this.compendiumCount = SpellService.spellsCompendium.length;
            } else {
                SpellService.loadCompendium().then(count => {
                    this.compendiumCount = count;
                });
            }
        },

        // Reactive Getters (Memoized)
        get stats() {
            return memoizedStats.call(this);
        },

        get allDamageTypesList() {
            return DAMAGE_TYPES;
        },

        get allSkillsList() {
            return DND_5E_SKILLS;
        },

        get availableCompendiumClasses() {
            return Object.keys(CLASS_COMPENDIUM || {}).map(k => ({
                key: k,
                name: CLASS_COMPENDIUM[k].name,
                hitDie: CLASS_COMPENDIUM[k].hitDie || 'd8'
            })).sort((a, b) => a.name.localeCompare(b.name));
        },

        get computedCombatResources() {
            return memoizedCombatResources.call(this);
        },

        get computedTraits() {
            return memoizedTraits.call(this);
        },

        // Persistence
        saveState() {
            StorageService.save(STORAGE_KEY, this.data);
        },

        // Dialogs / Alerts
        uiAlert(message, title = "Notice", icon = "ℹ️") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: false,
                    showInput: false,
                    inputValue: "",
                    inputPlaceholder: "",
                    confirmText: "Got it",
                    cancelText: "Cancel",
                    confirmClass: "bg-brand-600 hover:bg-brand-500",
                    resolve
                };
            });
        },

        uiConfirm(message, title = "Confirmation", icon = "❓", confirmText = "Confirm", confirmClass = "bg-brand-600 hover:bg-brand-500") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: true,
                    showInput: false,
                    inputValue: "",
                    inputPlaceholder: "",
                    confirmText,
                    cancelText: "Cancel",
                    confirmClass,
                    resolve
                };
            });
        },

        uiPrompt(message, title = "Input Required", defaultValue = "", placeholder = "", icon = "❓", confirmText = "Apply") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: true,
                    showInput: true,
                    inputValue: defaultValue,
                    inputPlaceholder: placeholder,
                    confirmText,
                    cancelText: "Cancel",
                    confirmClass: "bg-brand-600 hover:bg-brand-500",
                    resolve
                };
            });
        },

        resolveDialog(result) {
            if (this.modalDialog.resolve) {
                if (this.modalDialog.showInput) {
                    this.modalDialog.resolve(result ? (this.modalDialog.inputValue || '').trim() : null);
                } else {
                    this.modalDialog.resolve(result);
                }
            }
            this.modalDialog.open = false;
        },

        getArmorMinStr(armor) {
            return getArmorMinStr(armor);
        },

        // Export / Import compatible with JSON (and legacy JS format)
        exportJSON() {
            const jsonStr = JSON.stringify(this.data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "character.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        importJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new SafeFileReader();
            reader.onload = async (e) => {
                try {
                    const parsed = parseCharacterFileContent(e.target.result);
                    this.data = sanitizeTracking(parsed);
                    this.saveState();
                    await this.uiAlert("Character sheet imported and synchronized successfully.", "Character Loaded", "👤");
                } catch (err) {
                    await this.uiAlert("Invalid file format. Please import a valid character.json file.", "Error", "❌");
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }
    };

    return composeSlices(
        base,
        createQuestsSlice(),
        createProgressionSlice(),
        createVitalsSlice(),
        createInventorySlice(),
        createSpellsSlice()
    );
}

if (typeof document !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        Alpine.data('characterSheet', createCharacterSheet);
    });
}
