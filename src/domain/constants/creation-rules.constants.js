/**
 * D&D 5e Canonical Character Creation Rules & Reference Tables (PHB, XGE, TCE).
 */

export const CLASS_CREATION_RULES = {
    artificer: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['CON', 'INT'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight_of_hand'],
        subclassLevel: 3,
        spellcastingAttr: 'INT'
    },
    barbarian: {
        hitDie: 'd12',
        hitDieNum: 12,
        savingThrows: ['STR', 'CON'],
        skillsChooseCount: 2,
        skillOptions: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: null
    },
    bard: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['DEX', 'CHA'],
        skillsChooseCount: 3,
        skillOptions: 'all', // Bards can choose ANY 3 skills
        subclassLevel: 3,
        spellcastingAttr: 'CHA'
    },
    cleric: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
        subclassLevel: 1, // Divine Domain at 1st level
        spellcastingAttr: 'WIS'
    },
    druid: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['INT', 'WIS'],
        skillsChooseCount: 2,
        skillOptions: ['animal_handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
        subclassLevel: 2, // Circle at 2nd level
        spellcastingAttr: 'WIS'
    },
    fighter: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['STR', 'CON'],
        skillsChooseCount: 2,
        skillOptions: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: null
    },
    monk: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['STR', 'DEX'],
        skillsChooseCount: 2,
        skillOptions: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
        subclassLevel: 3,
        spellcastingAttr: null
    },
    paladin: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
        subclassLevel: 3,
        spellcastingAttr: 'CHA'
    },
    ranger: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['STR', 'DEX'],
        skillsChooseCount: 3,
        skillOptions: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: 'WIS'
    },
    rogue: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['DEX', 'INT'],
        skillsChooseCount: 4,
        skillOptions: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'],
        subclassLevel: 3,
        spellcastingAttr: null
    },
    sorcerer: {
        hitDie: 'd6',
        hitDieNum: 6,
        savingThrows: ['CON', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
        subclassLevel: 1, // Sorcerous Origin at 1st level
        spellcastingAttr: 'CHA'
    },
    warlock: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
        subclassLevel: 1, // Otherworldly Patron at 1st level
        spellcastingAttr: 'CHA'
    },
    wizard: {
        hitDie: 'd6',
        hitDieNum: 6,
        savingThrows: ['INT', 'WIS'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
        subclassLevel: 2, // Arcane Tradition at 2nd level
        spellcastingAttr: 'INT'
    }
};

/**
 * Traditional Racial Ability Score Increases (PHB/MTF).
 */
export const RACIAL_ASI_MAP = {
    dragonborn: { STR: 2, CHA: 1 },
    dwarf: {
        base: { CON: 2 },
        hill: { WIS: 1 },
        mountain: { STR: 2 },
        duergar: { STR: 1 }
    },
    elf: {
        base: { DEX: 2 },
        high: { INT: 1 },
        wood: { WIS: 1 },
        drow: { CHA: 1 },
        sea: { CON: 1 },
        eladrin: { CHA: 1 },
        shadarkai: { CON: 1 }
    },
    gith: {
        githyanki: { STR: 2, INT: 1 },
        githzerai: { WIS: 2, INT: 1 }
    },
    gnome: {
        base: { INT: 2 },
        forest: { DEX: 1 },
        rock: { CON: 1 },
        deep: { DEX: 1 }
    },
    halfelf: {
        CHA: 2,
        chooseOtherCount: 2,
        chooseOtherBonus: 1
    },
    halforc: { STR: 2, CON: 1 },
    halfling: {
        base: { DEX: 2 },
        lightfoot: { CHA: 1 },
        stout: { CON: 1 }
    },
    human: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
    tiefling: {
        base: { CHA: 2 },
        asmodeus: { INT: 1 },
        baalzebul: { INT: 1 },
        dispater: { DEX: 1 },
        fierna: { WIS: 1 },
        glasya: { DEX: 1 },
        levistus: { CON: 1 },
        mammon: { INT: 1 },
        mephistopheles: { INT: 1 },
        zariel: { STR: 1 }
    },
    customlineage: {
        chooseAnyCount: 1,
        chooseAnyBonus: 2
    }
};

/**
 * Point Buy cost table (8 to 15).
 */
export const POINT_BUY_COSTS = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9
};

export const POINT_BUY_TOTAL_POINTS = 27;

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
