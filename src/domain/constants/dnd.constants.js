/**
 * Centralized D&D 5e (2014 PHB / XGE / TCE / MTF) mechanical constants.
 * Avoids magic numbers across domain calculators, providers, and services.
 */

// Ability Scores & Modifiers
export const DEFAULT_ABILITY_SCORE = 10;
export const ABILITY_MODIFIER_OFFSET = 10;
export const ABILITY_MODIFIER_DIVISOR = 2;
export const MAX_STANDARD_ABILITY_SCORE = 20;
export const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// Character Level & Proficiency Bonus
export const MIN_CHARACTER_LEVEL = 1;
export const MAX_CHARACTER_LEVEL = 20;
export const BASE_PROFICIENCY_BONUS = 2;
export const PROFICIENCY_LEVEL_STEP = 4;
export const EXPERTISE_MULTIPLIER = 2;
export const JACK_OF_ALL_TRADES_DIVISOR = 2;
export const MIN_RESOURCE_USES = 1;

// Armor Class (AC) Formulas
export const BASE_UNARMORED_AC = 10;
export const DRACONIC_RESILIENCE_BASE_AC = 13;
export const MEDIUM_ARMOR_MAX_DEX_BONUS = 2;
export const DEFAULT_SHIELD_AC_BONUS = 2;
export const DEFENSE_FIGHTING_STYLE_BONUS = 1;

// Skills & Passive Checks
export const BASE_PASSIVE_SCORE = 10;
export const PASSIVE_ADVANTAGE_BONUS = 5;
export const DEFAULT_MIN_ROLL_THRESHOLD = 10;

export const DND_5E_SKILLS = [
    { id: 'acrobatics', name: 'Acrobatics', attr: 'DEX' },
    { id: 'animal_handling', name: 'Animal Handling', attr: 'WIS' },
    { id: 'arcana', name: 'Arcana', attr: 'INT' },
    { id: 'athletics', name: 'Athletics', attr: 'STR' },
    { id: 'deception', name: 'Deception', attr: 'CHA' },
    { id: 'history', name: 'History', attr: 'INT' },
    { id: 'insight', name: 'Insight', attr: 'WIS' },
    { id: 'intimidation', name: 'Intimidation', attr: 'CHA' },
    { id: 'investigation', name: 'Investigation', attr: 'INT' },
    { id: 'medicine', name: 'Medicine', attr: 'WIS' },
    { id: 'nature', name: 'Nature', attr: 'INT' },
    { id: 'perception', name: 'Perception', attr: 'WIS' },
    { id: 'performance', name: 'Performance', attr: 'CHA' },
    { id: 'persuasion', name: 'Persuasion', attr: 'CHA' },
    { id: 'religion', name: 'Religion', attr: 'INT' },
    { id: 'sleight_of_hand', name: 'Sleight of Hand', attr: 'DEX' },
    { id: 'stealth', name: 'Stealth', attr: 'DEX' },
    { id: 'survival', name: 'Survival', attr: 'WIS' }
];

export const MAX_ATTUNEMENT_SLOTS = 3;

// Spellcasting
export const BASE_SPELL_SAVE_DC = 8;
export const CANTRIP_LEVEL = 0;
export const MAX_SPELL_LEVEL = 9;
export const CANTRIP_SCALING_TIERS = {
    TIER_1: 5,
    TIER_2: 11,
    TIER_3: 17
};

// Multiclass Spellcaster Progression Divisors
export const HALF_CASTER_DIVISOR = 2;
export const THIRD_CASTER_DIVISOR = 3;

// Class Feature Pools & Scaling Thresholds
export const LAY_ON_HANDS_HP_PER_LEVEL = 5;
export const PSIONIC_DICE_PB_MULTIPLIER = 2;
export const WILD_SHAPE_DEFAULT_USES = 2;
export const CHANNEL_DIVINITY_THRESHOLDS = {
    TIER_1_LEVEL: 2,
    TIER_2_LEVEL: 6,
    TIER_3_LEVEL: 18,
    TIER_1_USES: 1,
    TIER_2_USES: 2,
    TIER_3_USES: 3
};
export const BARBARIAN_RAGE_USES_TABLE = [
    { minLevel: 20, uses: 99 }, // Unlimited
    { minLevel: 17, uses: 6 },
    { minLevel: 12, uses: 5 },
    { minLevel: 6, uses: 4 },
    { minLevel: 3, uses: 3 },
    { minLevel: 1, uses: 2 }
];
export const BATTLE_MASTER_SUPERIORITY_DICE_TABLE = [
    { minLevel: 15, uses: 6 },
    { minLevel: 7, uses: 5 },
    { minLevel: 3, uses: 4 }
];

// Racial & Vital Defaults
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
export const DRAGONBORN_ANCESTRY_RESISTANCE_MAP = {
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
};
