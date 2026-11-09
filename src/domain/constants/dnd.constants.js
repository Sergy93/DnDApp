/**
 * Centralized D&D 5e (2014 PHB / XGE / TCE / MTF) mechanical constants.
 * Avoids magic numbers and hardcoded strings across domain calculators, providers, and services.
 */

// ==========================================
// 1. ABILITY SCORES, KEYS & MODIFIERS
// ==========================================
export const DEFAULT_ABILITY_SCORE = 10;
export const ABILITY_MODIFIER_OFFSET = 10;
export const ABILITY_MODIFIER_DIVISOR = 2;
export const MAX_STANDARD_ABILITY_SCORE = 20;

export const ABILITIES = Object.freeze({
    STR: 'STR',
    DEX: 'DEX',
    CON: 'CON',
    INT: 'INT',
    WIS: 'WIS',
    CHA: 'CHA'
});

export const ABILITY_KEYS = Object.freeze(Object.values(ABILITIES));

export const ABILITY_NAMES = Object.freeze({
    [ABILITIES.STR]: 'Strength',
    [ABILITIES.DEX]: 'Dexterity',
    [ABILITIES.CON]: 'Constitution',
    [ABILITIES.INT]: 'Intelligence',
    [ABILITIES.WIS]: 'Wisdom',
    [ABILITIES.CHA]: 'Charisma'
});

export const ABILITY_FULL_TO_KEY = Object.freeze({
    strength: ABILITIES.STR,
    dexterity: ABILITIES.DEX,
    constitution: ABILITIES.CON,
    intelligence: ABILITIES.INT,
    wisdom: ABILITIES.WIS,
    charisma: ABILITIES.CHA
});

/**
 * Normalizes any string into a canonical 3-letter uppercase ability key.
 * @param {string} key - e.g. 'str', 'Dexterity', 'STR'
 * @returns {string|null} Canonical key ('STR', 'DEX', etc.) or null if invalid.
 */
export function normalizeAbilityKey(key) {
    if (!key) return null;
    const clean = String(key).trim().toLowerCase();
    if (ABILITY_FULL_TO_KEY[clean]) return ABILITY_FULL_TO_KEY[clean];
    const upper = clean.toUpperCase();
    return ABILITIES[upper] || null;
}

/**
 * Standard D&D 5e ability modifier formula: floor((score - 10) / 2).
 * @param {number|string} score
 * @returns {number}
 */
export function calculateAbilityModifier(score) {
    const val = typeof score === 'number' ? score : (parseInt(score, 10) || DEFAULT_ABILITY_SCORE);
    return Math.floor((val - ABILITY_MODIFIER_OFFSET) / ABILITY_MODIFIER_DIVISOR);
}

// ==========================================
// 2. CHARACTER LEVEL & PROFICIENCY BONUS
// ==========================================
export const MIN_CHARACTER_LEVEL = 1;
export const MAX_CHARACTER_LEVEL = 20;
export const BASE_PROFICIENCY_BONUS = 2;
export const PROFICIENCY_LEVEL_STEP = 4;
export const EXPERTISE_MULTIPLIER = 2;
export const JACK_OF_ALL_TRADES_DIVISOR = 2;
export const MIN_RESOURCE_USES = 1;

export const PROFICIENCY_LEVELS = Object.freeze({
    NONE: '',
    HALF: 'half',
    PROFICIENT: 'C',
    EXPERTISE: 'P'
});

// ==========================================
// 3. ARMOR CLASS & EQUIPMENT
// ==========================================
export const BASE_UNARMORED_AC = 10;
export const DRACONIC_RESILIENCE_BASE_AC = 13;
export const MEDIUM_ARMOR_MAX_DEX_BONUS = 2;
export const DEFAULT_SHIELD_AC_BONUS = 2;
export const DEFENSE_FIGHTING_STYLE_BONUS = 1;

export const ARMOR_TYPES = Object.freeze({
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy',
    SHIELD: 'shield',
    ACCESSORY: 'accessory'
});

export const BODY_ARMOR_TYPES = Object.freeze([
    ARMOR_TYPES.LIGHT,
    ARMOR_TYPES.MEDIUM,
    ARMOR_TYPES.HEAVY
]);

export const HEAVY_ARMOR_STR_REQUIREMENTS = Object.freeze({
    ring_mail: 0,
    chain_mail: 13,
    splint: 15,
    plate: 15
});

export const HEAVY_ARMOR_STR_PENALTY_SPEED_REDUCTION = 10; // -10 ft. if STR too low

export const WEAPON_ATTR_MODES = Object.freeze({
    STR: 'str',
    DEX: 'dex',
    FINESSE: 'finesse',
    CHA: 'cha',
    INT: 'int',
    WIS: 'wis'
});

export const MAX_ATTUNEMENT_SLOTS = 3;

// ==========================================
// 4. SKILLS & PASSIVE CHECKS
// ==========================================
export const BASE_PASSIVE_SCORE = 10;
export const PASSIVE_ADVANTAGE_BONUS = 5;
export const DEFAULT_MIN_ROLL_THRESHOLD = 10;

export const SKILL_IDS = Object.freeze({
    ACROBATICS: 'acrobatics',
    ANIMAL_HANDLING: 'animal_handling',
    ARCANA: 'arcana',
    ATHLETICS: 'athletics',
    DECEPTION: 'deception',
    HISTORY: 'history',
    INSIGHT: 'insight',
    INTIMIDATION: 'intimidation',
    INVESTIGATION: 'investigation',
    MEDICINE: 'medicine',
    NATURE: 'nature',
    PERCEPTION: 'perception',
    PERFORMANCE: 'performance',
    PERSUASION: 'persuasion',
    RELIGION: 'religion',
    SLEIGHT_OF_HAND: 'sleight_of_hand',
    STEALTH: 'stealth',
    SURVIVAL: 'survival'
});

export const DND_5E_SKILLS = Object.freeze([
    { id: SKILL_IDS.ACROBATICS, name: 'Acrobatics', attr: ABILITIES.DEX },
    { id: SKILL_IDS.ANIMAL_HANDLING, name: 'Animal Handling', attr: ABILITIES.WIS },
    { id: SKILL_IDS.ARCANA, name: 'Arcana', attr: ABILITIES.INT },
    { id: SKILL_IDS.ATHLETICS, name: 'Athletics', attr: ABILITIES.STR },
    { id: SKILL_IDS.DECEPTION, name: 'Deception', attr: ABILITIES.CHA },
    { id: SKILL_IDS.HISTORY, name: 'History', attr: ABILITIES.INT },
    { id: SKILL_IDS.INSIGHT, name: 'Insight', attr: ABILITIES.WIS },
    { id: SKILL_IDS.INTIMIDATION, name: 'Intimidation', attr: ABILITIES.CHA },
    { id: SKILL_IDS.INVESTIGATION, name: 'Investigation', attr: ABILITIES.INT },
    { id: SKILL_IDS.MEDICINE, name: 'Medicine', attr: ABILITIES.WIS },
    { id: SKILL_IDS.NATURE, name: 'Nature', attr: ABILITIES.INT },
    { id: SKILL_IDS.PERCEPTION, name: 'Perception', attr: ABILITIES.WIS },
    { id: SKILL_IDS.PERFORMANCE, name: 'Performance', attr: ABILITIES.CHA },
    { id: SKILL_IDS.PERSUASION, name: 'Persuasion', attr: ABILITIES.CHA },
    { id: SKILL_IDS.RELIGION, name: 'Religion', attr: ABILITIES.INT },
    { id: SKILL_IDS.SLEIGHT_OF_HAND, name: 'Sleight of Hand', attr: ABILITIES.DEX },
    { id: SKILL_IDS.STEALTH, name: 'Stealth', attr: ABILITIES.DEX },
    { id: SKILL_IDS.SURVIVAL, name: 'Survival', attr: ABILITIES.WIS }
]);

// ==========================================
// 5. REST & ACTION TYPES
// ==========================================
export const ACTION_TYPES = Object.freeze({
    ACTION: 'action',
    BONUS_ACTION: 'bonus',
    REACTION: 'reaction',
    SPECIAL: 'special'
});

export const REST_TYPES = Object.freeze({
    SHORT: 'short',
    LONG: 'long',
    SHORT_OR_LONG: 'short/long'
});

// ==========================================
// 6. SPELLCASTING & SLOTS
// ==========================================
export const BASE_SPELL_SAVE_DC = 8;
export const CANTRIP_LEVEL = 0;
export const MAX_SPELL_LEVEL = 9;
export const CANTRIP_SCALING_TIERS = Object.freeze({
    TIER_1: 5,
    TIER_2: 11,
    TIER_3: 17
});

/**
 * Standard D&D 5e Spell Save DC formula: 8 + PB + abilityMod + itemBonus.
 * @param {number} pb
 * @param {number} mod
 * @param {number} [bonus=0]
 * @returns {number}
 */
export function calculateBaseSpellDC(pb, mod, bonus = 0) {
    return BASE_SPELL_SAVE_DC + (parseInt(pb, 10) || BASE_PROFICIENCY_BONUS) + (parseInt(mod, 10) || 0) + (parseInt(bonus, 10) || 0);
}

// Multiclass Spellcaster Progression Divisors
export const HALF_CASTER_DIVISOR = 2;
export const THIRD_CASTER_DIVISOR = 3;

// ==========================================
// 7. CLASS FEATURES & SCALING TABLES
// ==========================================
export const LAY_ON_HANDS_HP_PER_LEVEL = 5;
export const PSIONIC_DICE_PB_MULTIPLIER = 2;
export const WILD_SHAPE_DEFAULT_USES = 2;
export const CHANNEL_DIVINITY_THRESHOLDS = Object.freeze({
    TIER_1_LEVEL: 2,
    TIER_2_LEVEL: 6,
    TIER_3_LEVEL: 18,
    TIER_1_USES: 1,
    TIER_2_USES: 2,
    TIER_3_USES: 3
});
export const BARBARIAN_RAGE_USES_TABLE = Object.freeze([
    { minLevel: 20, uses: 99 }, // Unlimited
    { minLevel: 17, uses: 6 },
    { minLevel: 12, uses: 5 },
    { minLevel: 6, uses: 4 },
    { minLevel: 3, uses: 3 },
    { minLevel: 1, uses: 2 }
]);
export const BATTLE_MASTER_SUPERIORITY_DICE_TABLE = Object.freeze([
    { minLevel: 15, uses: 6 },
    { minLevel: 7, uses: 5 },
    { minLevel: 3, uses: 4 }
]);

// ==========================================
// 8. RACIAL & VITAL DEFAULTS
// ==========================================
export const DEFAULT_HIT_DIE = 'd8';
export const DEFAULT_BARDIC_DIE = '1d6';
export const DEFAULT_SONG_OF_REST_DIE = '1d6';
export const DEFAULT_MARTIAL_ARTS_DIE = '1d4';
export const DEFAULT_WALK_SPEED = '30 ft.';
export const STANDARD_DARKVISION_RANGE = 60;
export const SUPERIOR_DARKVISION_RANGE = 120;
export const HILL_DWARF_HP_PER_LEVEL = 1;
export const DRACONIC_SORCERER_HP_PER_LEVEL = 1;
export const DEATH_SAVES_TRACK_LENGTH = 3;

// Dragonborn Draconic Ancestry Damage Map (PHB)
export const DRAGONBORN_ANCESTRY_RESISTANCE_MAP = Object.freeze({
    black: 'acid',
    copper: 'acid',
    blue: 'lightning',
    bronze: 'lightning',
    brass: 'fire',
    gold: 'fire',
    red: 'fire',
    green: 'poison',
    silver: 'cold',
    white: 'cold'
});

// ==========================================
// 9. SPELL SCHOOLS MAP
// ==========================================
export const SCHOOL_MAP = Object.freeze({
    A: 'Abjuration',
    C: 'Conjuration',
    D: 'Divination',
    E: 'Enchantment',
    V: 'Evocation',
    I: 'Illusion',
    N: 'Necromancy',
    T: 'Transmutation'
});

