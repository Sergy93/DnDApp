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
        spellcastingAttr: 'INT',
        primaryAbility: 'INT',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Intelligence governs your spellcasting DC, infusion limit, and tool expertise. Prioritize INT, then CON for HP and concentration.'
    },
    barbarian: {
        hitDie: 'd12',
        hitDieNum: 12,
        savingThrows: ['STR', 'CON'],
        skillsChooseCount: 2,
        skillOptions: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: null,
        primaryAbility: 'STR',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Strength powers your melee rage damage and athletics. Constitution boosts Unarmored Defense and maximum hit points.'
    },
    bard: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['DEX', 'CHA'],
        skillsChooseCount: 3,
        skillOptions: 'all', // Bards can choose ANY 3 skills
        subclassLevel: 3,
        spellcastingAttr: 'CHA',
        primaryAbility: 'CHA',
        secondaryAbilities: 'DEX, CON',
        descriptionHint: 'Charisma powers your spell save DC, spell attack rolls, and number of Bardic Inspiration uses. Dexterity boosts AC and finesse weapons.'
    },
    cleric: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
        subclassLevel: 1, // Divine Domain at 1st level
        spellcastingAttr: 'WIS',
        primaryAbility: 'WIS',
        secondaryAbilities: 'STR or CON',
        descriptionHint: 'Wisdom is your divine spellcasting ability and determines your prepared spells count. Strength or Constitution aids armor and survival.'
    },
    druid: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['INT', 'WIS'],
        skillsChooseCount: 2,
        skillOptions: ['animal_handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
        subclassLevel: 2, // Circle at 2nd level
        spellcastingAttr: 'WIS',
        primaryAbility: 'WIS',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Wisdom drives your natural spellcasting and prepared spells list. Constitution is vital for concentration while Wild Shaped or casting.'
    },
    fighter: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['STR', 'CON'],
        skillsChooseCount: 2,
        skillOptions: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: null,
        primaryAbility: 'STR or DEX',
        secondaryAbilities: 'CON',
        descriptionHint: 'Choose Strength for heavy armor and great weapons, or Dexterity for archery and rapier finesse. Constitution provides martial staying power.'
    },
    monk: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['STR', 'DEX'],
        skillsChooseCount: 2,
        skillOptions: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
        subclassLevel: 3,
        spellcastingAttr: null,
        primaryAbility: 'DEX & WIS',
        secondaryAbilities: 'CON',
        descriptionHint: 'Dexterity fuels martial arts attacks and Unarmored AC. Wisdom powers Ki save DC and adds to Unarmored Defense.'
    },
    paladin: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
        subclassLevel: 3,
        spellcastingAttr: 'CHA',
        primaryAbility: 'STR & CHA',
        secondaryAbilities: 'CON',
        descriptionHint: 'Strength powers divine smite melee attacks and heavy armor. Charisma enhances spellcasting, aura saves, and Channel Divinity.'
    },
    ranger: {
        hitDie: 'd10',
        hitDieNum: 10,
        savingThrows: ['STR', 'DEX'],
        skillsChooseCount: 3,
        skillOptions: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
        subclassLevel: 3,
        spellcastingAttr: 'WIS',
        primaryAbility: 'DEX & WIS',
        secondaryAbilities: 'CON',
        descriptionHint: 'Dexterity powers archery, finesse weapons, and stealth. Wisdom governs spell save DC and survival tracking.'
    },
    rogue: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['DEX', 'INT'],
        skillsChooseCount: 4,
        skillOptions: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'],
        subclassLevel: 3,
        spellcastingAttr: null,
        primaryAbility: 'DEX',
        secondaryAbilities: 'CON, INT or CHA',
        descriptionHint: 'Dexterity is vital for Sneak Attack, Stealth, Sleight of Hand, and AC. Secondary scores support Arcane Trickster (INT) or Swashbuckler (CHA).'
    },
    sorcerer: {
        hitDie: 'd6',
        hitDieNum: 6,
        savingThrows: ['CON', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
        subclassLevel: 1, // Sorcerous Origin at 1st level
        spellcastingAttr: 'CHA',
        primaryAbility: 'CHA',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Charisma is your innate spellcasting power, dictating spell attack bonus and save DC. Constitution protects concentration and hit points.'
    },
    warlock: {
        hitDie: 'd8',
        hitDieNum: 8,
        savingThrows: ['WIS', 'CHA'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
        subclassLevel: 1, // Otherworldly Patron at 1st level
        spellcastingAttr: 'CHA',
        primaryAbility: 'CHA',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Charisma is your patron pact spellcasting ability. Dexterity boosts light armor AC, and Constitution preserves concentration.'
    },
    wizard: {
        hitDie: 'd6',
        hitDieNum: 6,
        savingThrows: ['INT', 'WIS'],
        skillsChooseCount: 2,
        skillOptions: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
        subclassLevel: 2, // Arcane Tradition at 2nd level
        spellcastingAttr: 'INT',
        primaryAbility: 'INT',
        secondaryAbilities: 'CON, DEX',
        descriptionHint: 'Intelligence is your spellcasting ability and determines spell save DC and prepared spells count. Constitution maintains concentration and HP.'
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

/**
 * Canonical 5e Classes reference metadata for synchronous UI rendering (0ms startup latency).
 */
export const CANONICAL_CREATION_CLASSES = Object.freeze({
    artificer: {
        name: 'Artificer',
        hitDie: 'd8',
        subclasses: {
            alchemist: { name: 'Alchemist' },
            armorer: { name: 'Armorer' },
            artillerist: { name: 'Artillerist' },
            battlesmith: { name: 'Battle Smith' }
        }
    },
    barbarian: {
        name: 'Barbarian',
        hitDie: 'd12',
        subclasses: {
            berserker: { name: 'Path of the Berserker' },
            totemwarrior: { name: 'Path of the Totem Warrior' },
            ancestralguardian: { name: 'Path of the Ancestral Guardian' },
            stormherald: { name: 'Path of the Storm Herald' },
            zealot: { name: 'Path of the Zealot' },
            beast: { name: 'Path of the Beast' },
            wildmagic: { name: 'Path of Wild Magic' }
        }
    },
    bard: {
        name: 'Bard',
        hitDie: 'd8',
        subclasses: {
            lore: { name: 'College of Lore' },
            valor: { name: 'College of Valor' },
            glamour: { name: 'College of Glamour' },
            swords: { name: 'College of Swords' },
            whispers: { name: 'College of Whispers' },
            creation: { name: 'College of Creation' },
            eloquence: { name: 'College of Eloquence' }
        }
    },
    cleric: {
        name: 'Cleric',
        hitDie: 'd8',
        subclasses: {
            knowledge: { name: 'Knowledge Domain' },
            life: { name: 'Life Domain' },
            light: { name: 'Light Domain' },
            nature: { name: 'Nature Domain' },
            tempest: { name: 'Tempest Domain' },
            trickery: { name: 'Trickery Domain' },
            war: { name: 'War Domain' },
            forge: { name: 'Forge Domain' },
            grave: { name: 'Grave Domain' },
            order: { name: 'Order Domain' },
            peace: { name: 'Peace Domain' },
            twilight: { name: 'Twilight Domain' }
        }
    },
    druid: {
        name: 'Druid',
        hitDie: 'd8',
        subclasses: {
            land: { name: 'Circle of the Land' },
            moon: { name: 'Circle of the Moon' },
            dreams: { name: 'Circle of Dreams' },
            shepherd: { name: 'Circle of the Shepherd' },
            spores: { name: 'Circle of Spores' },
            stars: { name: 'Circle of Stars' },
            wildfire: { name: 'Circle of Wildfire' }
        }
    },
    fighter: {
        name: 'Fighter',
        hitDie: 'd10',
        subclasses: {
            battlemaster: { name: 'Battle Master' },
            champion: { name: 'Champion' },
            eldritchknight: { name: 'Eldritch Knight' },
            arcanearcher: { name: 'Arcane Archer' },
            cavalier: { name: 'Cavalier' },
            samurai: { name: 'Samurai' },
            psiwarrior: { name: 'Psi Warrior' },
            runeknight: { name: 'Rune Knight' }
        }
    },
    monk: {
        name: 'Monk',
        hitDie: 'd8',
        subclasses: {
            openhand: { name: 'Way of the Open Hand' },
            shadow: { name: 'Way of Shadow' },
            fourelements: { name: 'Way of the Four Elements' },
            drunkenmaster: { name: 'Way of the Drunken Master' },
            kensei: { name: 'Way of the Kensei' },
            sunsoul: { name: 'Way of the Sun Soul' },
            mercy: { name: 'Way of Mercy' },
            astralself: { name: 'Way of the Astral Self' }
        }
    },
    paladin: {
        name: 'Paladin',
        hitDie: 'd10',
        subclasses: {
            devotion: { name: 'Oath of Devotion' },
            ancients: { name: 'Oath of the Ancients' },
            vengeance: { name: 'Oath of Vengeance' },
            conquest: { name: 'Oath of Conquest' },
            redemption: { name: 'Oath of Redemption' },
            glory: { name: 'Oath of Glory' },
            watchers: { name: 'Oath of the Watchers' }
        }
    },
    ranger: {
        name: 'Ranger',
        hitDie: 'd10',
        subclasses: {
            hunter: { name: 'Hunter' },
            beastmaster: { name: 'Beast Master' },
            gloomstalker: { name: 'Gloom Stalker' },
            horizonwalker: { name: 'Horizon Walker' },
            monsterslayer: { name: 'Monster Slayer' },
            feywanderer: { name: 'Fey Wanderer' },
            swarmkeeper: { name: 'Swarmkeeper' }
        }
    },
    rogue: {
        name: 'Rogue',
        hitDie: 'd8',
        subclasses: {
            thief: { name: 'Thief' },
            assassin: { name: 'Assassin' },
            arcanetrickster: { name: 'Arcane Trickster' },
            inquisitive: { name: 'Inquisitive' },
            mastermind: { name: 'Mastermind' },
            scout: { name: 'Scout' },
            swashbuckler: { name: 'Swashbuckler' },
            phantom: { name: 'Phantom' },
            soulknife: { name: 'Soulknife' }
        }
    },
    sorcerer: {
        name: 'Sorcerer',
        hitDie: 'd6',
        subclasses: {
            draconic: { name: 'Draconic Bloodline' },
            wild: { name: 'Wild Magic' },
            divinesoul: { name: 'Divine Soul' },
            shadow: { name: 'Shadow Magic' },
            storm: { name: 'Storm Sorcery' },
            aberrantmind: { name: 'Aberrant Mind' },
            clockworksoul: { name: 'Clockwork Soul' }
        }
    },
    warlock: {
        name: 'Warlock',
        hitDie: 'd8',
        subclasses: {
            archfey: { name: 'The Archfey' },
            fiend: { name: 'The Fiend' },
            greatoldone: { name: 'The Great Old One' },
            celestial: { name: 'The Celestial' },
            hexblade: { name: 'The Hexblade' },
            fathomless: { name: 'The Fathomless' },
            genie: { name: 'The Genie' }
        }
    },
    wizard: {
        name: 'Wizard',
        hitDie: 'd6',
        subclasses: {
            abjuration: { name: 'School of Abjuration' },
            conjuration: { name: 'School of Conjuration' },
            divination: { name: 'School of Divination' },
            enchantment: { name: 'School of Enchantment' },
            evocation: { name: 'School of Evocation' },
            illusion: { name: 'School of Illusion' },
            necromancy: { name: 'School of Necromancy' },
            transmutation: { name: 'School of Transmutation' },
            war: { name: 'War Magic' },
            bladesinging: { name: 'Bladesinging' },
            scribes: { name: 'Order of Scribes' }
        }
    }
});

/**
 * Canonical 5e Races reference metadata for synchronous UI rendering.
 */
export const CANONICAL_CREATION_RACES = Object.freeze({
    dragonborn: { name: 'Dragonborn', speed: '30 ft.', darkvision: 0, subraces: {} },
    dwarf: {
        name: 'Dwarf',
        speed: '25 ft.',
        darkvision: 60,
        subraces: {
            hill: { name: 'Hill Dwarf' },
            mountain: { name: 'Mountain Dwarf' },
            duergar: { name: 'Duergar' }
        }
    },
    elf: {
        name: 'Elf',
        speed: '30 ft.',
        darkvision: 60,
        subraces: {
            high: { name: 'High Elf' },
            wood: { name: 'Wood Elf' },
            drow: { name: 'Drow' },
            eladrin: { name: 'Eladrin' },
            sea: { name: 'Sea Elf' },
            shadarkai: { name: 'Shadar-kai' }
        }
    },
    gith: {
        name: 'Gith',
        speed: '30 ft.',
        darkvision: 0,
        subraces: {
            githyanki: { name: 'Githyanki' },
            githzerai: { name: 'Githzerai' }
        }
    },
    gnome: {
        name: 'Gnome',
        speed: '25 ft.',
        darkvision: 60,
        subraces: {
            rock: { name: 'Rock Gnome' },
            forest: { name: 'Forest Gnome' },
            deep: { name: 'Deep Gnome (Svirfneblin)' }
        }
    },
    halfelf: { name: 'Half-Elf', speed: '30 ft.', darkvision: 60, subraces: {} },
    halforc: { name: 'Half-Orc', speed: '30 ft.', darkvision: 60, subraces: {} },
    halfling: {
        name: 'Halfling',
        speed: '25 ft.',
        darkvision: 0,
        subraces: {
            lightfoot: { name: 'Lightfoot Halfling' },
            stout: { name: 'Stout Halfling' }
        }
    },
    human: {
        name: 'Human',
        speed: '30 ft.',
        darkvision: 0,
        subraces: {
            variant: { name: 'Variant Human' }
        }
    },
    tiefling: {
        name: 'Tiefling',
        speed: '30 ft.',
        darkvision: 60,
        subraces: {
            asmodeus: { name: 'Asmodeus Bloodline' },
            baalzebul: { name: 'Baalzebul Bloodline' },
            dispater: { name: 'Dispater Bloodline' },
            fierna: { name: 'Fierna Bloodline' },
            glasya: { name: 'Glasya Bloodline' },
            levistus: { name: 'Levistus Bloodline' },
            mammon: { name: 'Mammon Bloodline' },
            mephistopheles: { name: 'Mephistopheles Bloodline' },
            zariel: { name: 'Zariel Bloodline' }
        }
    },
    customlineage: { name: 'Custom Lineage', speed: '30 ft.', darkvision: 60, subraces: {} }
});

/**
 * Canonical 5e Backgrounds reference metadata for synchronous UI rendering.
 */
export const CANONICAL_CREATION_BACKGROUNDS = Object.freeze({
    acolyte: { name: 'Acolyte', skillProficiencies: ['insight', 'religion'] },
    charlatan: { name: 'Charlatan', skillProficiencies: ['deception', 'sleight_of_hand'] },
    criminal: { name: 'Criminal', skillProficiencies: ['deception', 'stealth'] },
    custombackground: { name: 'Custom Background', skillProficiencies: [] },
    entertainer: { name: 'Entertainer', skillProficiencies: ['acrobatics', 'performance'] },
    folkhero: { name: 'Folk Hero', skillProficiencies: ['animal_handling', 'survival'] },
    guildartisan: { name: 'Guild Artisan', skillProficiencies: ['insight', 'persuasion'] },
    hermit: { name: 'Hermit', skillProficiencies: ['medicine', 'religion'] },
    noble: { name: 'Noble', skillProficiencies: ['history', 'persuasion'] },
    outlander: { name: 'Outlander', skillProficiencies: ['athletics', 'survival'] },
    sage: { name: 'Sage', skillProficiencies: ['arcana', 'history'] },
    sailor: { name: 'Sailor', skillProficiencies: ['athletics', 'perception'] },
    soldier: { name: 'Soldier', skillProficiencies: ['athletics', 'intimidation'] },
    urchin: { name: 'Urchin', skillProficiencies: ['sleight_of_hand', 'stealth'] },
    variantcriminalspy: { name: 'Variant Criminal (Spy)', skillProficiencies: ['deception', 'stealth'] },
    variantentertainergladiator: { name: 'Variant Entertainer (Gladiator)', skillProficiencies: ['acrobatics', 'performance'] },
    variantguildartisanguildmerchant: { name: 'Variant Guild Artisan (Guild Merchant)', skillProficiencies: ['insight', 'persuasion'] },
    variantnobleknight: { name: 'Variant Noble (Knight)', skillProficiencies: ['history', 'persuasion'] },
    variantnobleretainers: { name: 'Variant Noble (Retainers)', skillProficiencies: ['history', 'persuasion'] },
    variantsailorpirate: { name: 'Variant Sailor (Pirate)', skillProficiencies: ['athletics', 'perception'] }
});
