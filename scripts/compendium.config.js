import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, '..', '5etools-v2.37.0', 'data');

/**
 * Array único de siglas de libros a importar desde 5eTools:
 * - PHB: Player's Handbook (2014)
 * - XGE: Xanathar's Guide to Everything
 * - TCE: Tasha's Cauldron of Everything
 * - MTF: Mordenkainen's Tome of Foes (incluye las variantes de Tiefling como Glasya, la raza de Dorian)
 */
export const ALLOWED_SOURCES = [
    'PHB',
    'XGE',
    'TCE',
    'MTF'
];

export const COMPENDIUM_CONFIG = {
    // Lista única de fuentes permitidas para todos los compendios
    allowedSources: ALLOWED_SOURCES,

    // Configuración de conjuros
    spells: {
        sourcesDir: path.resolve(DATA_DIR, 'spells'),
        sourceFiles: ALLOWED_SOURCES.map(s => `spells-${s.toLowerCase()}.json`),
        outputFile: path.resolve(ROOT_DIR, 'src', 'dnd-data', 'spell-compendium.json'),
        coreFields: [
            'name',
            'source',
            'level',
            'school',
            'actionType',
            'range',
            'duration',
            'conc',
            'isHealing',
            'damage',
            'scalingLevelDice',
            'multiBeamCantrip',
            'higherLevelScale',
            'useSpellDc',
            'saveStat',
            'desc'
        ],
        customExtractors: {
            ritual: (raw) => !!raw.meta?.ritual,
            components: (raw) => {
                if (!raw.components) return null;
                const c = [];
                if (raw.components.v) c.push('V');
                if (raw.components.s) c.push('S');
                if (raw.components.m) {
                    const matText = typeof raw.components.m === 'string'
                        ? raw.components.m
                        : (raw.components.m?.text || 'Material');
                    c.push(`M (${matText})`);
                }
                return c.join(', ');
            },
            classes: (raw) => {
                const list = raw.classes?.fromClassList || [];
                return list.map(c => c.name).filter(Boolean);
            }
        },
        includeRawFields: []
    },

    // Configuración de clases
    classes: {
        sourcesDir: path.resolve(DATA_DIR, 'class'),
        outputFile: path.resolve(ROOT_DIR, 'src', 'dnd-data', 'class-compendium.json'),
        includedClasses: [
            'artificer',
            'barbarian',
            'bard',
            'cleric',
            'druid',
            'fighter',
            'monk',
            'paladin',
            'ranger',
            'rogue',
            'sorcerer',
            'warlock',
            'wizard'
        ],
        casterProgressionMap: {
            artificer: 'artificer',
            bard: 'full',
            cleric: 'full',
            druid: 'full',
            paladin: 'half',
            ranger: 'half',
            sorcerer: 'full',
            warlock: 'pact',
            wizard: 'full'
        },
        subclassSpellcasting: {
            eldritchknight: { ability: 'INT', casterType: 'third' },
            arcanetrickster: { ability: 'INT', casterType: 'third' }
        },
        diceScalesMap: {
            barbarian: {
                rageDamage: {
                    "1": "+2",
                    "9": "+3",
                    "16": "+4"
                }
            },
            bard: {
                bardicDie: {
                    "1": "1d6",
                    "5": "1d8",
                    "10": "1d10",
                    "15": "1d12"
                },
                songOfRestDie: {
                    "2": "1d6",
                    "9": "1d8",
                    "13": "1d10",
                    "17": "1d12"
                }
            },
            fighter: {
                superiorityDie: {
                    "3": "1d8",
                    "10": "1d10",
                    "18": "1d12"
                },
                psionicEnergyDie: {
                    "3": "1d6",
                    "5": "1d8",
                    "9": "1d10",
                    "13": "1d12"
                }
            },
            monk: {
                martialArtsDie: {
                    "1": "1d4",
                    "5": "1d6",
                    "11": "1d8",
                    "17": "1d10"
                }
            },
            rogue: {
                sneakAttackDie: {
                    "1": "1d6",
                    "3": "2d6",
                    "5": "3d6",
                    "7": "4d6",
                    "9": "5d6",
                    "11": "6d6",
                    "13": "7d6",
                    "15": "8d6",
                    "17": "9d6",
                    "19": "10d6"
                },
                psionicEnergyDie: {
                    "3": "1d6",
                    "5": "1d8",
                    "9": "1d10",
                    "13": "1d12"
                }
            }
        },
        featuresSyncMap: {
            barbarian: {
                base: {
                    traits: [
                        {
                            minLevel: 1,
                            name: "Rage (Barbarian 1)",
                            desc: "Bonus Action: enter a rage for 1 minute. Advantage on STR checks/saves, {{rageDamage}} melee STR damage, resistance to bludgeoning, piercing, and slashing damage."
                        }
                    ],
                    resources: [
                        {
                            minLevel: 1,
                            id: "barbarian_rages",
                            name: "Rages",
                            usesKey: "BARBARIAN_RAGES",
                            actionCost: "Bonus Action",
                            reset: "Long Rest",
                            color: "text-red-400",
                            spent: []
                        }
                    ]
                },
                subclasses: {}
            },
            cleric: {
                base: {
                    traits: [],
                    resources: [
                        {
                            minLevel: 2,
                            id: "cleric_channel_divinity",
                            name: "Channel Divinity",
                            usesKey: "CHANNEL_DIVINITY",
                            actionCost: "Action",
                            reset: "Short/Long",
                            color: "text-yellow-300",
                            spent: []
                        }
                    ]
                },
                subclasses: {}
            },
            druid: {
                base: {
                    traits: [],
                    resources: [
                        {
                            minLevel: 2,
                            id: "druid_wild_shape",
                            name: "Wild Shape",
                            uses: 2,
                            actionCost: "Action",
                            reset: "Short/Long",
                            color: "text-emerald-400",
                            spent: [false, false]
                        }
                    ]
                },
                subclasses: {}
            },
            fighter: {
                base: {
                    traits: [],
                    resources: [
                        {
                            minLevel: 1,
                            id: "fighter_second_wind",
                            name: "Second Wind",
                            uses: 1,
                            actionCost: "Bonus Action",
                            reset: "Short/Long",
                            color: "text-green-300",
                            spent: [false]
                        },
                        {
                            minLevel: 2,
                            id: "fighter_action_surge",
                            name: "Action Surge",
                            uses: 1,
                            actionCost: "Free",
                            reset: "Short/Long",
                            color: "text-orange-400",
                            spent: [false]
                        }
                    ]
                },
                subclasses: {
                    battlemaster: {
                        traits: [],
                        resources: [
                            {
                                minLevel: 3,
                                id: "fighter_superiority_dice",
                                name: "Superiority Dice ({{superiorityDie}})",
                                usesKey: "SUPERIORITY_DICE",
                                actionCost: "Special",
                                reset: "Short/Long",
                                color: "text-amber-400",
                                spent: []
                            }
                        ]
                    },
                    psiwarrior: {
                        traits: [],
                        resources: [
                            {
                                minLevel: 3,
                                id: "fighter_psionic_dice",
                                name: "Psionic Energy Dice ({{psionicDie}})",
                                usesKey: "PB_X2",
                                actionCost: "Special",
                                reset: "Long Rest",
                                color: "text-cyan-400",
                                spent: []
                            }
                        ]
                    }
                }
            },
            monk: {
                base: {
                    traits: [
                        {
                            minLevel: 1,
                            name: "Martial Arts (Monk 1)",
                            desc: "Use DEX instead of STR for unarmed strikes and monk weapons. Roll {{martialArtsDie}} for unarmed/monk weapon damage."
                        }
                    ],
                    resources: [
                        {
                            minLevel: 2,
                            id: "monk_ki_points",
                            name: "Ki Points",
                            usesKey: "MONK_LEVEL",
                            actionCost: "Bonus Action",
                            reset: "Short/Long",
                            color: "text-sky-300",
                            spent: []
                        }
                    ]
                },
                subclasses: {}
            },
            paladin: {
                base: {
                    traits: [],
                    resources: [
                        {
                            minLevel: 1,
                            id: "paladin_lay_on_hands",
                            name: "Lay on Hands Pool",
                            usesKey: "PALADIN_LAY_ON_HANDS",
                            actionCost: "Action",
                            reset: "Long Rest",
                            color: "text-yellow-200",
                            spent: []
                        },
                        {
                            minLevel: 3,
                            id: "paladin_channel_divinity",
                            name: "Channel Divinity",
                            uses: 1,
                            actionCost: "Action",
                            reset: "Short/Long",
                            color: "text-amber-300",
                            spent: [false]
                        }
                    ]
                },
                subclasses: {}
            },
            rogue: {
                base: {
                    traits: [
                        {
                            minLevel: 1,
                            name: "Sneak Attack ({{sneakAttackDie}})",
                            desc: "Once per turn, deal an extra {{sneakAttackDie}} damage when you hit with a finesse or ranged weapon if you have advantage or an ally is within 5 ft of the target."
                        }
                    ],
                    resources: []
                },
                subclasses: {
                    soulknife: {
                        traits: [],
                        resources: [
                            {
                                minLevel: 3,
                                id: "rogue_psionic_dice",
                                name: "Psionic Energy Dice ({{psionicDie}})",
                                usesKey: "PB_X2",
                                actionCost: "Special",
                                reset: "Long Rest",
                                color: "text-purple-400",
                                spent: []
                            }
                        ]
                    }
                }
            },
            sorcerer: {
                base: {
                    traits: [],
                    resources: [
                        {
                            minLevel: 2,
                            id: "sorcerer_points",
                            name: "Sorcery Points",
                            usesKey: "SORCERER_LEVEL",
                            actionCost: "Bonus Action",
                            reset: "Long Rest",
                            color: "text-fuchsia-400",
                            spent: []
                        }
                    ]
                },
                subclasses: {}
            }
        }
    },

    // Configuración de razas
    races: {
        sourceFile: path.resolve(DATA_DIR, 'races.json'),
        outputFile: path.resolve(ROOT_DIR, 'src', 'dnd-data', 'race-compendium.json'),
        allowedSources: ALLOWED_SOURCES,
        preserveCustomRaces: false
    },

    // Configuración de trasfondos
    backgrounds: {
        sourceFile: path.resolve(DATA_DIR, 'backgrounds.json'),
        outputFile: path.resolve(ROOT_DIR, 'src', 'dnd-data', 'background-compendium.json'),
        allowedSources: ALLOWED_SOURCES
    }
};
