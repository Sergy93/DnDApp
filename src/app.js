// ================= FILEREADER SAFETY =================
const SafeFileReader = (typeof window !== 'undefined' && window.FileReader)
    ? window.FileReader
    : (typeof FileReader !== 'undefined' ? FileReader : null);

import { STORAGE_KEYS } from "./domain/constants/storage.constants.js";
const STORAGE_KEY = STORAGE_KEYS.LEGACY_CHARACTER;

import DND_RULES from "./dnd-data/dnd-rules.json" with { type: "json" };
import CHARACTER_DATA from "./character.json" with { type: "json" };
import CLASS_COMPENDIUM from "./dnd-data/class-compendium.json" with { type: "json" };
import BACKGROUND_COMPENDIUM from "./dnd-data/background-compendium.json" with { type: "json" };
import RACE_COMPENDIUM from "./dnd-data/race-compendium.json" with { type: "json" };
import SPELL_COMPENDIUM from "./dnd-data/spell-compendium.json" with { type: "json" };
import { CompendiumStorageService } from "./services/compendium-storage.service.js";

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
import { CharacterStorageService, slugifyCharacterName } from "./services/character-storage.service.js";
import { CharacterRouterService } from "./services/character-router.service.js";
import { CharacterSyncService, SYNC_STATUS } from "./services/character-sync.service.js";
import { composeSlices } from "./helpers/slice.helper.js";
import { getAllEquippedItems } from "./domain/items/equipped-items.helper.js";
import { createQuestsSlice } from "./ui/slices/quests.slice.js";
import { createProgressionSlice } from "./ui/slices/progression.slice.js";
import { createVitalsSlice } from "./ui/slices/vitals.slice.js";
import { createInventorySlice } from "./ui/slices/inventory.slice.js";
import { createSpellsSlice } from "./ui/slices/spells.slice.js";
import { createWizardSlice } from "./ui/slices/wizard.slice.js";
import { CharacterBuilderService } from "./domain/character/character-builder.service.js";
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
    DND_5E_SKILLS,
    ABILITY_KEYS,
    ABILITIES,
    SKILL_IDS,
    BASE_SPELL_SAVE_DC
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
    CharacterStorageService,
    slugifyCharacterName,
    CharacterRouterService,
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
    ClassSyncService,
    CharacterBuilderService,
    createWizardSlice
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
    const isClient = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    if (!isClient) {
        return sanitizeTracking(base);
    }

    // 1. Ensure legacy storage is migrated into multi-character registry
    const { activeId, activeSlug } = CharacterStorageService.migrateLegacyStorage(base);

    // 2. Check if URL hash specifies a character slug
    const urlSlug = CharacterRouterService.getSlugFromHash();
    if (urlSlug) {
        const fromSlug = CharacterStorageService.getCharacterBySlug(urlSlug);
        if (fromSlug) {
            CharacterStorageService.setActiveCharacterId(fromSlug.id);
            return sanitizeTracking(fromSlug);
        }
    }

    // 3. Load active character from multi-character storage
    const activeChar = CharacterStorageService.getCharacterById(activeId);
    if (activeChar) {
        return sanitizeTracking(activeChar);
    }

    // Fallback: save base and return
    const saved = CharacterStorageService.saveCharacter(base, { makeActive: true });
    return sanitizeTracking(saved.characterData);
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

    const computedAttrs = calculateAttributes(d?.attributes, allEquipped, pb, d);

    const computedSkills = calculateSkills(
        d?.skills,
        computedAttrs,
        pb,
        skillRules,
        allEquipped
    );

    const percSkill = computedSkills.find(s => s.id === SKILL_IDS.PERCEPTION);
    const percAdvBonus = percSkill?.hasAdvantage ? PASSIVE_ADVANTAGE_BONUS : 0;
    const passivePerception = BASE_PASSIVE_SCORE + (percSkill ? percSkill.valNum : ((computedAttrs[ABILITIES.WIS]?.mod || 0) + jackOfAllTrades)) + percAdvBonus;
    
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

// Synchronously populate SpellService with bundled compendium so all spells are immediately available offline
if (SPELL_COMPENDIUM) {
    SpellService.buildSpellsCompendium([SPELL_COMPENDIUM]);
}

// ================= COMPONENTE ALPINE.JS =================
function createCharacterSheet() {
    const memoizedStats = createMemo(
        function() {
            return computeStats(this.data);
        },
        function() {
            const charId = this.data?.id || '';
            const charName = this.data?.identity?.name || '';
            const classesSig = (this.data?.identity?.classes || []).map(c => `${c.name}:${c.level}:${c.subclass}`).join(',');
            const attrsSig = ABILITY_KEYS.map(k => `${this.data?.attributes?.[k]?.score}:${this.data?.attributes?.[k]?.profSave}`).join(',');
            const equippedSig = (getAllEquippedItems(this.data)).map(i => `${i.name}:${i.equipped}:${JSON.stringify(i.statBonuses || {})}:${(i.advantageSkills || []).join(',')}:${(i.advantageAttrs || []).join(',')}:${(i.advantageSaves || []).join(',')}`).join(';');
            return `${charId}|${charName}|${this.equipRevision}|${this.data?.identity?.race}|${classesSig}|${attrsSig}|${equippedSig}`;
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
            const spellDC = this.stats.spellDC || (BASE_SPELL_SAVE_DC + pb);
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
        CONSTANTS: DND_CONSTANTS,
        data: loadInitialData(),
        activeTab: 'profile',
        currentView: 'sheet',
        syncStatus: 'synced',
        syncError: null,
        userProfile: null,
        isLoggedIn: false,
        compendiumCount: 0,
        charactersRegistry: [],
        activeCharacterId: null,
        characterSwitcherOpen: false,
        compendiumStorage: CompendiumStorageService,
        compendiumLoaded: false,

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
            this.charactersRegistry = CharacterStorageService.getRegistry();
            this.activeCharacterId = this.data?.id || CharacterStorageService.getActiveCharacterId();

            // Initialize Offline-First IndexedDB Compendium
            CompendiumStorageService.isPopulated().then(populated => {
                if (!populated) {
                    CompendiumStorageService.seedPayload({
                        classes: CLASS_COMPENDIUM,
                        races: RACE_COMPENDIUM,
                        backgrounds: BACKGROUND_COMPENDIUM,
                        spells: SPELL_COMPENDIUM
                    }).then(() => {
                        this.compendiumLoaded = true;
                    }).catch(() => {});
                } else {
                    this.compendiumLoaded = true;
                }
                CompendiumStorageService.syncFromRemote().catch(() => {});
            }).catch(() => {});

            CharacterSyncService.initListeners();
            this.syncStatus = CharacterSyncService.getStatus();
            CharacterSyncService.onStatusChange((status, err) => {
                this.syncStatus = status;
                this.syncError = err;
            });

            const storedProfile = CharacterSyncService.getUserProfile();
            if (storedProfile) {
                this.userProfile = storedProfile;
                this.isLoggedIn = Boolean(storedProfile.email);
            }
            if (typeof fetch !== 'undefined') {
                CharacterSyncService.checkAuth().then(auth => {
                    if (auth && auth.user) {
                        this.userProfile = auth.user;
                        this.isLoggedIn = auth.authenticated;
                    }
                }).catch(() => {});
            }

            const route = CharacterRouterService.parseRoute();
            const loggedOut = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dnd_logged_out') === 'true';
            const hasCharacters = this.charactersRegistry.length > 0;

            if (route.view === 'login') {
                if (!loggedOut && (hasCharacters || this.isLoggedIn)) {
                    const activeSlug = this.data?.slug || this.charactersRegistry[0]?.slug || 'dorian';
                    CharacterRouterService.navigateToSlug(activeSlug, true);
                    this.currentView = 'sheet';
                } else {
                    this.currentView = 'login';
                }
            } else if (route.view === 'create') {
                this.currentView = 'create';
                this.openNewHeroWizard();
            } else if (route.view === 'sheet') {
                this.currentView = 'sheet';
                if (route.slug && route.slug !== this.data?.slug) {
                    this.loadCharacterBySlug(route.slug);
                } else if (this.data?.slug && typeof window !== 'undefined') {
                    CharacterRouterService.navigateToSlug(this.data.slug, true);
                }
            } else {
                const activeSlug = this.data?.slug || this.charactersRegistry[0]?.slug || 'dorian';
                CharacterRouterService.navigateToSlug(activeSlug, true);
                this.currentView = 'sheet';
            }

            CharacterRouterService.onRouteChanged((newSlug, newRoute) => {
                if (newRoute?.view === 'login') {
                    this.currentView = 'login';
                } else if (newRoute?.view === 'create') {
                    this.currentView = 'create';
                    this.openNewHeroWizard();
                } else if (newRoute?.view === 'sheet') {
                    this.currentView = 'sheet';
                    if (newSlug && newSlug !== this.data?.slug) {
                        this.loadCharacterBySlug(newSlug);
                    }
                }
            });

            if (typeof navigator !== 'undefined' && navigator.onLine) {
                CharacterSyncService.syncNow().then(() => {
                    this.charactersRegistry = CharacterStorageService.getRegistry();
                }).catch(() => {});
            }

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
            CharacterStorageService.saveCharacter(this.data, { makeActive: true });
            StorageService.save(STORAGE_KEY, this.data);
            this.charactersRegistry = CharacterStorageService.getRegistry();
            this.activeCharacterId = this.data?.id;
            CharacterSyncService.scheduleSync(1500);
        },

        async forceSync() {
            const res = await CharacterSyncService.syncNow();
            this.charactersRegistry = CharacterStorageService.getRegistry();
            const active = CharacterStorageService.getActiveCharacter();
            if (active && active.id === this.data?.id) {
                this.data = sanitizeTracking(active);
                this.equipRevision++;
            }
            if (res.success) {
                await this.uiAlert(`Sincronización completada con Cloudflare D1 (${res.updated} actualizados, ${res.deleted} borrados).`, "Sincronizado", "☁️");
            } else if (res.error === 'Offline') {
                await this.uiAlert("Estás en modo offline. Los cambios se guardan localmente y se sincronizarán al reconectar.", "Modo Offline", "📡");
            } else {
                await this.uiAlert(`Aviso de sincronización: ${res.error || 'Error de red'}. Los datos locales están a salvo.`, "Aviso", "⚠️");
            }
        },

        async loginWithGoogle() {
            try {
                const auth = await CharacterSyncService.checkAuth();
                if (auth.authenticated && auth.user) {
                    this.userProfile = auth.user;
                    this.isLoggedIn = true;
                    if (typeof sessionStorage !== 'undefined') {
                        sessionStorage.removeItem('dnd_logged_out');
                    }
                    const activeSlug = this.data?.slug || this.charactersRegistry[0]?.slug || 'dorian';
                    CharacterRouterService.navigateToSlug(activeSlug);
                    this.currentView = 'sheet';
                    await this.forceSync();
                    return;
                }
            } catch (e) {}

            const email = await this.uiPrompt("Introduce tu correo de Google para identificarte:", "Google OAuth / Cloudflare Access", "Google Identity", "usuario@gmail.com", "👤", "Continuar");
            if (email && email.trim()) {
                const profile = { id: email.trim().toLowerCase(), email: email.trim().toLowerCase() };
                CharacterSyncService.setUserProfile(profile);
                this.userProfile = profile;
                this.isLoggedIn = true;
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('dnd_logged_out');
                }
                const activeSlug = this.data?.slug || this.charactersRegistry[0]?.slug || 'dorian';
                CharacterRouterService.navigateToSlug(activeSlug);
                this.currentView = 'sheet';
                CharacterSyncService.syncNow().then(() => {
                    this.charactersRegistry = CharacterStorageService.getRegistry();
                }).catch(() => {});
            }
        },

        continueAsGuest() {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('dnd_logged_out');
            }
            const activeSlug = this.data?.slug || this.charactersRegistry[0]?.slug || 'dorian';
            CharacterRouterService.navigateToSlug(activeSlug);
            this.currentView = 'sheet';
        },

        logout() {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('dnd_logged_out', 'true');
            }
            CharacterSyncService.setUserProfile(null);
            this.userProfile = null;
            this.isLoggedIn = false;
            CharacterRouterService.navigateToLogin();
            this.currentView = 'login';
        },

        loadCharacterBySlug(slug) {
            const charData = CharacterStorageService.getCharacterBySlug(slug);
            if (charData) {
                this.saveState();
                this.data = sanitizeTracking(charData);
                this.activeCharacterId = charData.id;
                this.charactersRegistry = CharacterStorageService.getRegistry();
                this.equipRevision++;
                CharacterRouterService.navigateToSlug(charData.slug);
            } else {
                this.uiAlert(`Character "${slug}" not found in local storage.`, "Not Found", "⚠️");
            }
        },

        switchCharacter(id) {
            if (!id || id === this.data?.id) {
                this.characterSwitcherOpen = false;
                return;
            }
            this.saveState();
            const target = CharacterStorageService.getCharacterById(id);
            if (target) {
                this.data = sanitizeTracking(target);
                this.activeCharacterId = target.id;
                this.charactersRegistry = CharacterStorageService.getRegistry();
                this.equipRevision++;
                CharacterRouterService.navigateToSlug(target.slug);
                this.characterSwitcherOpen = false;
            }
        },

        createNewCharacter() {
            this.characterSwitcherOpen = false;
            this.currentView = 'create';
            CharacterRouterService.navigateToCreate();
            this.openNewHeroWizard();
        },

        async deleteCurrentCharacter() {
            if (this.charactersRegistry.length <= 1) {
                await this.uiAlert("Cannot delete the only existing character. Create or import another character first.", "Notice", "⚠️");
                return;
            }
            const name = this.data.identity?.name || this.data.slug || 'character';
            const ok = await this.uiConfirm(`Are you sure you want to delete "${name}"? This cannot be undone.`, "Delete Character", "🗑️", "Delete", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            const charId = this.data.id;
            CharacterStorageService.deleteCharacter(charId);
            this.charactersRegistry = CharacterStorageService.getRegistry();
            CharacterSyncService.scheduleSync(500);

            const next = this.charactersRegistry[0];
            if (next) {
                const loaded = CharacterStorageService.getCharacterById(next.id);
                this.data = sanitizeTracking(loaded);
                this.activeCharacterId = loaded.id;
                CharacterRouterService.navigateToSlug(loaded.slug);
            }
            this.characterSwitcherOpen = false;
            await this.uiAlert(`Character "${name}" deleted.`, "Deleted", "🗑️");
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
            const fileName = (this.data?.slug || slugifyCharacterName(this.data?.identity?.name) || 'character') + '.json';
            a.download = fileName;
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
                    const sanitized = sanitizeTracking(parsed);
                    const saved = CharacterStorageService.saveCharacter(sanitized, { makeActive: true });
                    this.data = sanitizeTracking(saved.characterData);
                    this.activeCharacterId = saved.id;
                    this.charactersRegistry = CharacterStorageService.getRegistry();
                    this.equipRevision++;
                    CharacterRouterService.navigateToSlug(saved.slug);
                    this.saveState();
                    await this.uiAlert(`Character "${saved.characterData.identity?.name || saved.slug}" loaded at /#/c/${saved.slug}.`, "Character Imported", "👤");
                } catch (err) {
                    await this.uiAlert("Invalid file format. Please import a valid character.json file.", "Error", "❌");
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        slugifyCharacterName(name) {
            return slugifyCharacterName(name);
        },

        capitalizeWord(word) {
            return capitalizeWord(word);
        }
    };

    return composeSlices(
        base,
        createQuestsSlice(),
        createProgressionSlice(),
        createVitalsSlice(),
        createInventorySlice(),
        createSpellsSlice(),
        createWizardSlice()
    );
}

if (typeof window !== 'undefined') {
    window.slugifyCharacterName = slugifyCharacterName;
    window.capitalizeWord = capitalizeWord;
}

if (typeof document !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        Alpine.data('characterSheet', createCharacterSheet);
    });
}
