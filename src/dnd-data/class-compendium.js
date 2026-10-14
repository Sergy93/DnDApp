export const CLASS_COMPENDIUM = {
    "bard": {
        "name": "Bard",
        "baseFeatures": {
            "1": [
                "Spellcasting: You can cast known bard spells using Charisma as your spellcasting ability. You can use a musical instrument as a spellcasting focus and cast any known bard spell with the ritual tag as a ritual.",
                "Bardic Inspiration (d6): As a bonus action, grant an inspiration die (1d6) to a creature within 60 feet that can hear you. Within 10 minutes, the creature can add the die to one ability check, attack roll, or saving throw. You have uses equal to your Charisma modifier (minimum of 1), regained after a long rest."
            ],
            "2": [
                "Jack of All Trades: You can add half your proficiency bonus, rounded down, to any ability check you make that doesn't already include your proficiency bonus (including initiative).",
                "Song of Rest (d6): If you or any friendly creatures who can hear your performance regain hit points by spending Hit Dice at the end of a short rest, each of those creatures regains an extra 1d6 hit points.",
                "Magical Inspiration (Optional - TCE): A creature with your Bardic Inspiration die can expend it when casting a spell: rolling the die and adding the result to one target's hit points healed or damage dealt."
            ],
            "3": [
                "Bard College: You delve into the advanced techniques of a bard college, gaining subclass features at 3rd, 6th, and 14th level.",
                "Expertise: Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies."
            ],
            "4": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat if allowed.",
                "Bardic Versatility (Optional - TCE): Whenever you reach an ASI level, you can replace one Expertise skill with another proficient skill lacking it, or replace one bard cantrip with another cantrip from the bard list."
            ],
            "5": [
                "Bardic Inspiration (d8): Your Bardic Inspiration die becomes a d8.",
                "Font of Inspiration: You now regain all of your expended uses of Bardic Inspiration when you finish a short or long rest."
            ],
            "6": [
                "Countercharm: As an action, you start a performance lasting until the end of your next turn. During that time, you and any friendly creatures within 30 feet have advantage on saving throws against being frightened or charmed. The performance ends early if you are incapacitated, silenced, or end it voluntarily."
            ],
            "7": [],
            "8": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Bardic Versatility (Optional - TCE): Replace one Expertise skill with another proficient skill, or swap a bard cantrip."
            ],
            "9": [
                "Song of Rest (d8): The extra hit points regained by friendly creatures during a short rest increases to 1d8."
            ],
            "10": [
                "Bardic Inspiration (d10): Your Bardic Inspiration die becomes a d10.",
                "Expertise: Choose two more of your skill proficiencies to gain double proficiency bonus on checks.",
                "Magical Secrets: Choose two spells from any class list, of a level you can cast or cantrips. They count as bard spells and are included in your spells known."
            ],
            "11": [],
            "12": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Bardic Versatility (Optional - TCE): Replace one Expertise skill with another proficient skill, or swap a bard cantrip."
            ],
            "13": [
                "Song of Rest (d10): The extra hit points regained by friendly creatures during a short rest increases to 1d10."
            ],
            "14": [
                "Magical Secrets: Learn two additional spells of your choice from any class list of a level you can cast."
            ],
            "15": [
                "Bardic Inspiration (d12): Your Bardic Inspiration die becomes a d12."
            ],
            "16": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Bardic Versatility (Optional - TCE): Replace one Expertise skill with another proficient skill, or swap a bard cantrip."
            ],
            "17": [
                "Song of Rest (d12): The extra hit points regained by friendly creatures during a short rest increases to 1d12."
            ],
            "18": [
                "Magical Secrets: Learn two additional spells of your choice from any class list of a level you can cast."
            ],
            "19": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Bardic Versatility (Optional - TCE): Replace one Expertise skill with another proficient skill, or swap a bard cantrip."
            ],
            "20": [
                "Superior Inspiration: When you roll initiative and have no uses of Bardic Inspiration left, you immediately regain one use."
            ]
        },
        "subclasses": {
            "eloquence": {
                "name": "College of Eloquence (TCE)",
                "features": {
                    "3": [
                        "Silver Tongue: Whenever you make a Charisma (Persuasion) or Charisma (Deception) check, you can treat a d20 roll of 9 or lower as a 10.",
                        "Unsettling Words: As a bonus action, expend one Bardic Inspiration use against a target within 60 feet. Roll the die and subtract the result from the creature's next saving throw before the start of your next turn."
                    ],
                    "6": [
                        "Unfailing Inspiration: When a creature adds your Bardic Inspiration die to a d20 check and fails, the die is not expended and the creature retains it.",
                        "Universal Speech: As an action, choose up to a number of creatures within 60 feet equal to your Charisma modifier. For 1 hour, they magically understand you regardless of the language you speak."
                    ],
                    "14": [
                        "Infectious Inspiration: When a creature within 60 feet succeeds on a check using your inspiration die, you can use a reaction to give another creature within 60 feet an inspiration die without expending any uses (uses equal to Charisma modifier per long rest)."
                    ]
                }
            },
            "lore": {
                "name": "College of Lore (PHB)",
                "features": {
                    "3": [
                        "Bonus Proficiencies: You gain proficiency with three skills of your choice.",
                        "Cutting Words: Use your reaction to expend a Bardic Inspiration die and subtract the roll from an enemy's attack roll, ability check, or damage roll within 60 feet."
                    ],
                    "6": [
                        "Additional Magical Secrets: Learn two additional spells from any class list of a level you can cast (or cantrips)."
                    ],
                    "14": [
                        "Peerless Skill: When making an ability check, expend a Bardic Inspiration die and add the roll to the total."
                    ]
                }
            },
            "valor": {
                "name": "College of Valor (PHB)",
                "features": {
                    "3": [
                        "Bonus Proficiencies: Gain proficiency with medium armor, shields, and martial weapons.",
                        "Combat Inspiration: A creature holding your inspiration die can add it to a weapon damage roll, or use a reaction to add it to AC against an incoming attack."
                    ],
                    "6": [
                        "Extra Attack: You can attack twice, instead of once, whenever you take the Attack action on your turn."
                    ],
                    "14": [
                        "Battle Magic: When you use your action to cast a bard spell, you can make one weapon attack as a bonus action."
                    ]
                }
            },
            "glamour": {
                "name": "College of Glamour (XGE)",
                "features": {
                    "3": [
                        "Mantle of Inspiration: As a bonus action, expend an inspiration die to grant allies within 60 feet temporary hit points and allow immediate reaction movement without opportunity attacks.",
                        "Enthralling Performance: Perform for at least 1 minute to charm humanoids that watched your show on a failed Wisdom saving throw."
                    ],
                    "6": [
                        "Mantle of Majesty: Cast Command as a bonus action without spell slots every turn for 1 minute (concentration)."
                    ],
                    "14": [
                        "Unbreakable Majesty: Take an otherworldly appearance for 1 minute as a bonus action. Enemies must make a Charisma save to attack you."
                    ]
                }
            },
            "swords": {
                "name": "College of Swords (XGE)",
                "features": {
                    "3": [
                        "Bonus Proficiencies: Gain proficiency with medium armor and scimitars, and use weapons as a spellcasting focus.",
                        "Fighting Style: Choose either Dueling or Two-Weapon Fighting.",
                        "Blade Flourish: Increase speed by 10 feet on Attack actions, and spend a Bardic Inspiration die on a hit for Defensive, Slashing, or Mobile Flourish."
                    ],
                    "6": [
                        "Extra Attack: Attack twice instead of once per Attack action."
                    ],
                    "14": [
                        "Master's Flourish: You can use a d6 instead of expending an inspiration die when executing a Blade Flourish."
                    ]
                }
            },
            "whispers": {
                "name": "College of Whispers (XGE)",
                "features": {
                    "3": [
                        "Psychic Blades: Spend an inspiration die on weapon hit to deal bonus psychic damage.",
                        "Words of Terror: Speak with a humanoid in private for 1 minute to inflict the frightened condition on a failed Wisdom save."
                    ],
                    "6": [
                        "Mantle of Whispers: Capture a dying humanoid's shadow to assume its physical guise and gain basic knowledge."
                    ],
                    "14": [
                        "Shadow Lore: Whisper a creature to charm it and make it completely compliant with your requests for 8 hours on a failed Wisdom save."
                    ]
                }
            },
            "creation": {
                "name": "College of Creation (TCE)",
                "features": {
                    "3": [
                        "Mote of Potential: Inspiring an ally creates a mote that grants an extra effect when the inspiration die is rolled (thunder burst, temporary hit points, or roll advantage).",
                        "Performance of Creation: As an action, magically create a nonmagical item with a maximum GP value based on bard level."
                    ],
                    "6": [
                        "Animating Song: Animate a nonmagical Large or smaller object to fight and defend alongside you as a Dancing Item."
                    ],
                    "14": [
                        "Creative Crescendo: Create multiple items simultaneously, ignore item gold cost limitations, and allow Huge-sized creations."
                    ]
                }
            }
        }
    },

    "warlock": {
        "name": "Warlock",
        "baseFeatures": {
            "1": [
                "Otherworldly Patron: At 1st level, you have struck a bargain with an otherworldly being of your choice. Your choice grants you features at 1st level and again at 6th, 10th, and 14th level.",
                "Pact Magic: Your arcane research and the magic bestowed on you by your patron have given you facility with spells. You regain all expended spell slots when you finish a short or long rest. Charisma is your spellcasting ability for your warlock spells, and you can use an arcane focus as a spellcasting focus."
            ],
            "2": [
                "Eldritch Invocations: In your study of occult lore, you have unearthed eldritch invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability. You gain two eldritch invocations of your choice, gaining more as you level up. Whenever you gain a warlock level, you can replace one invocation you know with another."
            ],
            "3": [
                "Pact Boon: Your otherworldly patron bestows a gift upon you: Pact of the Chain (learn find familiar as a ritual with special forms like imp, pseudodragon, quasit, or sprite), Pact of the Blade (create or bind a magical melee pact weapon), Pact of the Tome (receive a Book of Shadows granting three cantrips from any class list), or Pact of the Talisman (TCE - an amulet that adds 1d4 to failed ability checks)."
            ],
            "4": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat if allowed.",
                "Eldritch Versatility (Optional - TCE): Whenever you reach an ASI level, you can replace one cantrip you learned from Pact Magic, replace your Pact Boon option with another one, or replace one Mystic Arcanum spell with another warlock spell of the same level."
            ],
            "5": [],
            "6": [],
            "7": [],
            "8": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Eldritch Versatility (Optional - TCE): Replace a cantrip, your Pact Boon option, or a Mystic Arcanum spell."
            ],
            "9": [],
            "10": [],
            "11": [
                "Mystic Arcanum (6th level): Your patron bestows upon you a magical secret called an arcanum. Choose one 6th-level spell from the warlock spell list as this arcanum. You can cast your arcanum spell once without expending a spell slot, regaining the ability to do so after a long rest."
            ],
            "12": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Eldritch Versatility (Optional - TCE): Replace a cantrip, your Pact Boon option, or a Mystic Arcanum spell."
            ],
            "13": [
                "Mystic Arcanum (7th level): Choose one 7th-level spell from the warlock spell list as an arcanum. You can cast it once without expending a spell slot per long rest."
            ],
            "14": [],
            "15": [
                "Mystic Arcanum (8th level): Choose one 8th-level spell from the warlock spell list as an arcanum. You can cast it once without expending a spell slot per long rest."
            ],
            "16": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Eldritch Versatility (Optional - TCE): Replace a cantrip, your Pact Boon option, or a Mystic Arcanum spell."
            ],
            "17": [
                "Mystic Arcanum (9th level): Choose one 9th-level spell from the warlock spell list as an arcanum. You can cast it once without expending a spell slot per long rest."
            ],
            "18": [],
            "19": [
                "Ability Score Improvement: Increase one ability score of your choice by 2, or two ability scores by 1 (up to a maximum of 20), or choose a feat.",
                "Eldritch Versatility (Optional - TCE): Replace a cantrip, your Pact Boon option, or a Mystic Arcanum spell."
            ],
            "20": [
                "Eldritch Master: You can draw on your inner reserve of mystical power while entreating your patron to regain expended spell slots. You can spend 1 minute entreating your patron for aid to regain all your expended spell slots from your Pact Magic feature. Once you use this feature, you must finish a long rest before doing so again."
            ]
        },
        "subclasses": {
            "fiend": {
                "name": "The Fiend (PHB)",
                "features": {
                    "1": [
                        "Dark One's Blessing: When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1)."
                    ],
                    "6": [
                        "Dark One's Own Luck: You can call on your patron to alter fate in your favor. When you make an ability check or saving throw, you can use this feature to add a d10 to your roll. You can do so after seeing the initial roll but before any effects occur. Regained after a short or long rest."
                    ],
                    "10": [
                        "Fiendish Resilience: Choose one damage type when you finish a short or long rest. You gain resistance to that damage type until you choose a different one with this feature. Damage from magical weapons or silver weapons ignores this resistance."
                    ],
                    "14": [
                        "Hurl Through Hell: When you hit a creature with an attack, you can instantly transport the target through the lower planes. The creature disappears and hurtles through a nightmare landscape until the end of your next turn, when it reappears and takes 10d10 psychic damage if it is not a fiend. Regained after a long rest."
                    ]
                }
            },
            "archfey": {
                "name": "The Archfey (PHB)",
                "features": {
                    "1": [
                        "Fey Presence: As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom saving throw against your warlock spell save DC. The creatures that fail are all charmed or frightened by you (your choice) until the end of your next turn. Regained after a short or long rest."
                    ],
                    "6": [
                        "Misty Escape: When you take damage, you can use your reaction to turn invisible and teleport up to 60 feet to an unoccupied space you can see. You remain invisible until the start of your next turn or until you attack or cast a spell. Regained after a short or long rest."
                    ],
                    "10": [
                        "Beguiling Defenses: You are immune to being charmed. When another creature attempts to charm you, you can use your reaction to attempt to turn the charm back on that creature, forcing it to succeed on a Wisdom saving throw or become charmed by you for 1 minute."
                    ],
                    "14": [
                        "Dark Delirium: As an action, choose a creature within 60 feet. It must make a Wisdom saving throw against your spell save DC. On a failed save, it is charmed or frightened by you (your choice) for 1 minute or until your concentration is broken, perceiving an illusory mist while incapacitated. Regained after a short or long rest."
                    ]
                }
            },
            "great_old_one": {
                "name": "The Great Old One (PHB)",
                "features": {
                    "1": [
                        "Awakened Mind: You can telepathically speak to any creature you can see within 30 feet of you. You don't need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language."
                    ],
                    "6": [
                        "Entropic Ward: When a creature makes an attack roll against you, you can use your reaction to impose disadvantage on that roll. If the attack misses you, your next attack roll against that creature has advantage if you make it before the end of your next turn. Regained after a short or long rest."
                    ],
                    "10": [
                        "Thought Shield: Your thoughts cannot be read by telepathy or other means unless you allow it. You also have resistance to psychic damage, and whenever a creature deals psychic damage to you, that creature takes the same amount of damage that you take."
                    ],
                    "14": [
                        "Create Thrall: As an action, you touch an incapacitated humanoid. That creature is charmed by you until a Remove Curse spell is cast on it, the charmed condition is removed from it, or you use this feature again. You can communicate telepathically with the charmed creature as long as the two of you are on the same plane of existence."
                    ]
                }
            },
            "celestial": {
                "name": "The Celestial (XGE)",
                "features": {
                    "1": [
                        "Bonus Cantrips: You learn the Sacred Flame and Light cantrips. They count as warlock cantrips for you and don't count against your number of cantrips known.",
                        "Healing Light: You have a pool of d6s that you spend to fuel this healing. The number of dice in the pool equals 1 + your warlock level. As a bonus action, you can heal a creature within 60 feet by spending dice from the pool (up to your Charisma modifier, minimum 1). Regained after a long rest."
                    ],
                    "6": [
                        "Radiant Soul: You gain resistance to radiant damage. When you cast a spell that deals radiant or fire damage, you add your Charisma modifier to one radiant or fire damage roll of that spell against one of its targets."
                    ],
                    "10": [
                        "Celestial Resilience: Whenever you finish a short or long rest, you gain temporary hit points equal to your warlock level + your Charisma modifier. Additionally, choose up to five creatures you can see at the end of the rest; each gains temporary hit points equal to half your warlock level + your Charisma modifier."
                    ],
                    "14": [
                        "Searing Vengeance: When you have to make a death saving throw at the start of your turn, you can instead spring to your feet with a burst of radiant energy. You regain hit points equal to half your hit point maximum, and each creature of your choice within 30 feet takes 2d8 + your Charisma modifier radiant damage and is blinded until the end of the current turn. Regained after a long rest."
                    ]
                }
            },
            "hexblade": {
                "name": "The Hexblade (XGE)",
                "features": {
                    "1": [
                        "Hexblade's Curse: As a bonus action, curse a creature within 30 feet for 1 minute: add proficiency bonus to damage rolls against it, crit on 19-20 on attack rolls against it, and regain hit points equal to your warlock level + Charisma modifier if it dies. Regained after a short or long rest.",
                        "Hex Warrior: Gain proficiency with medium armor, shields, and martial weapons. Whenever you finish a long rest, you can touch one melee weapon that lacks the two-handed property; you can use your Charisma modifier instead of Strength or Dexterity for its attack and damage rolls."
                    ],
                    "6": [
                        "Accursed Specter: When you slay a humanoid, you can cause its spirit to rise from its corpse as a specter under your command until the end of your next long rest. It gains temporary hit points equal to half your warlock level and adds your Charisma modifier to its attack rolls. Regained after a long rest."
                    ],
                    "10": [
                        "Armor of Hexes: If the target cursed by your Hexblade's Curse hits you with an attack roll, you can use your reaction to roll a d6. On a 4 or higher, the attack instead misses you, regardless of its roll."
                    ],
                    "14": [
                        "Master of Hexes: When the creature cursed by your Hexblade's Curse dies, you can immediately apply the curse to a different creature you can see within 30 feet of you, provided you aren't incapacitated. When you apply the curse in this way, you don't regain hit points from the death of the previously cursed creature."
                    ]
                }
            },
            "fathomless": {
                "name": "The Fathomless (TCE)",
                "features": {
                    "1": [
                        "Tentacle of the Deeps: As a bonus action, create a 10-foot spectral tentacle within 60 feet for 1 minute. You can make a melee spell attack with it dealing 1d8 cold damage and reducing the target's speed by 10 feet until the start of your next turn.",
                        "Gift of the Sea: You gain a swimming speed of 40 feet and can breathe underwater."
                    ],
                    "6": [
                        "Oceanic Soul: You gain resistance to cold damage and can speak and understand creatures that have a swimming speed while you are submerged.",
                        "Guardian Coil: When you or an ally within 10 feet of your Tentacle of the Deeps takes damage, you can use your reaction to reduce the damage by 1d8."
                    ],
                    "10": [
                        "Grasping Tentacles: You learn Evard's Black Tentacles. It doesn't count against your spells known, you can cast it once without a spell slot per long rest, and you gain temporary hit points equal to your warlock level when you cast it, without having your concentration broken on it by damage."
                    ],
                    "14": [
                        "Fathomless Plunge: As an action, you can teleport yourself and up to five willing creatures within 30 feet up to 1 mile to a body of water you have seen. Regained after a short or long rest."
                    ]
                }
            },
            "genie": {
                "name": "The Genie (TCE)",
                "features": {
                    "1": [
                        "Genie's Vessel: You receive a magical vessel that serves as a spellcasting focus. Bottled Respite: As an action, enter the vessel for hours equal to twice your proficiency bonus. Genie's Wrath: Once per turn on a damage roll with an attack, deal additional damage equal to your proficiency bonus of the element matching your patron type (Dao: Bludgeoning, Djinni: Thunder, Efreeti: Fire, Marid: Cold).",
                        "Elemental Patron: Your patron is one of the four types of genies: Dao (Earth), Djinni (Air), Efreeti (Fire), or Marid (Water), which determines your expanded spell list and Genie's Wrath damage type."
                    ],
                    "6": [
                        "Elemental Gift: You gain resistance to the damage type associated with your patron. As a bonus action, you gain a flying speed of 30 feet and can hover for 10 minutes without concentration (uses equal to proficiency bonus per long rest)."
                    ],
                    "10": [
                        "Sanctuary Vessel: When you enter your Genie's Vessel, you can bring up to five willing creatures with you. Anyone inside can remain for up to 10 minutes and gain the benefits of a short rest."
                    ],
                    "14": [
                        "Limited Wish: As an action, you entreat your patron to grant a wish. You duplicate the effect of any spell of 6th level or lower from any class list that has a casting time of 1 action, without requiring material components. You regain use of this feature after 1d4 long rests."
                    ]
                }
            }
        }
    }
}
