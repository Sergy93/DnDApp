/**
 * D&D 5e Starting Equipment Packages per Class (PHB & TCE RAW).
 * Provides structured selectable choices and items for character creation.
 */

export const CLASS_STARTING_EQUIPMENT = Object.freeze({
    artificer: {
        choices: [
            {
                name: 'Simple Weapon',
                options: [
                    { label: 'Light Crossbow & 20 Bolts', items: [{ name: 'Light Crossbow', type: 'weapon', damage: '1d8 P', range: '80/320', stat: 'DEX', equipped: true }, { name: 'Crossbow Bolt', type: 'consumable', qty: 20 }] },
                    { label: 'Two Daggers', items: [{ name: 'Dagger', type: 'weapon', damage: '1d4 P', range: '20/60', stat: 'DEX', equipped: true }, { name: 'Dagger (Off-hand)', type: 'weapon', damage: '1d4 P', range: '20/60', stat: 'DEX', equipped: false }] }
                ]
            },
            {
                name: 'Armor',
                options: [
                    { label: 'Studded Leather Armor (AC 12 + DEX)', items: [{ name: 'Studded Leather', type: 'armor', ac: 12, formula: '12 + DEX', armorType: 'Light', equipped: true }] },
                    { label: 'Scale Mail (AC 14 + DEX max 2)', items: [{ name: 'Scale Mail', type: 'armor', ac: 14, formula: '14 + DEX (max 2)', armorType: 'Medium', stealthDisadvantage: true, equipped: true }] }
                ]
            },
            {
                name: 'Pack & Tools',
                options: [
                    { label: "Dungeoneer's Pack & Thieves' Tools", items: [{ name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: "Thieves' Tools", type: 'tool', desc: 'Lockpicks, files, small mirror, pliers.' }] }
                ]
            }
        ]
    },
    barbarian: {
        choices: [
            {
                name: 'Primary Weapon',
                options: [
                    { label: 'Greataxe (1d12 S, Heavy, Two-Handed)', items: [{ name: 'Greataxe', type: 'weapon', damage: '1d12 S', stat: 'STR', range: 'Melee', equipped: true }] },
                    { label: 'Greatsword (2d6 S, Heavy, Two-Handed)', items: [{ name: 'Greatsword', type: 'weapon', damage: '2d6 S', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Secondary Weapon',
                options: [
                    { label: 'Two Handaxes', items: [{ name: 'Handaxe', type: 'weapon', damage: '1d6 S', stat: 'STR', range: '20/60', equipped: true }, { name: 'Handaxe (Off-hand)', type: 'weapon', damage: '1d6 S', stat: 'STR', range: '20/60', equipped: false }] },
                    { label: 'Simple Weapon (Warhammer)', items: [{ name: 'Warhammer', type: 'weapon', damage: '1d8 B', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Pack & Thrown',
                options: [
                    { label: "Explorer's Pack & 4 Javelins", items: [{ name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }, { name: 'Javelin', type: 'weapon', damage: '1d6 P', range: '30/120', stat: 'STR', qty: 4, equipped: false }] }
                ]
            }
        ]
    },
    bard: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Rapier (1d8 P, Finesse)', items: [{ name: 'Rapier', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: 'Melee', equipped: true }] },
                    { label: 'Longsword (1d8/1d10 S)', items: [{ name: 'Longsword', type: 'weapon', damage: '1d8 S', stat: 'STR', range: 'Melee', equipped: true }] },
                    { label: 'Simple Weapon (Dagger)', items: [{ name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', equipped: true }] }
                ]
            },
            {
                name: 'Pack',
                options: [
                    { label: "Diplomat's Pack", items: [{ name: "Diplomat's Pack", type: 'tool', desc: 'Chest, 2 cases for maps and scrolls, fine clothes, ink, pen, 10 sheets of paper, perfume, soap.' }] },
                    { label: "Entertainer's Pack", items: [{ name: "Entertainer's Pack", type: 'tool', desc: 'Backpack, bedroll, 2 costumes, 5 candles, 5 days rations, waterskin, disguise kit.' }] }
                ]
            },
            {
                name: 'Instrument & Armor',
                options: [
                    { label: 'Lute, Leather Armor & Dagger', items: [{ name: 'Lute', type: 'tool', desc: 'Musical instrument and arcane focus.' }, { name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', equipped: false }] }
                ]
            }
        ]
    },
    cleric: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Mace (1d6 B)', items: [{ name: 'Mace', type: 'weapon', damage: '1d6 B', stat: 'STR', range: 'Melee', equipped: true }] },
                    { label: 'Warhammer (1d8/1d10 B)', items: [{ name: 'Warhammer', type: 'weapon', damage: '1d8 B', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Armor',
                options: [
                    { label: 'Scale Mail (Medium, AC 14 + DEX max 2)', items: [{ name: 'Scale Mail', type: 'armor', ac: 14, formula: '14 + DEX (max 2)', armorType: 'Medium', stealthDisadvantage: true, equipped: true }] },
                    { label: 'Leather Armor (Light, AC 11 + DEX)', items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }] },
                    { label: 'Chain Mail (Heavy, AC 16)', items: [{ name: 'Chain Mail', type: 'armor', ac: 16, formula: '16', armorType: 'Heavy', minStr: 13, stealthDisadvantage: true, equipped: true }] }
                ]
            },
            {
                name: 'Ranged & Shield',
                options: [
                    { label: 'Shield & Light Crossbow (20 bolts)', items: [{ name: 'Shield', type: 'armor', ac: 2, formula: '+2', armorType: 'Shield', equipped: true }, { name: 'Light Crossbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '80/320', equipped: false }, { name: 'Crossbow Bolt', type: 'consumable', qty: 20 }] },
                    { label: 'Shield & Holy Symbol', items: [{ name: 'Shield', type: 'armor', ac: 2, formula: '+2', armorType: 'Shield', equipped: true }, { name: 'Holy Symbol (Amulet)', type: 'tool', desc: 'Sacred focus for divine spellcasting.' }] }
                ]
            }
        ]
    },
    druid: {
        choices: [
            {
                name: 'Shield / Weapon',
                options: [
                    { label: 'Wooden Shield (AC +2)', items: [{ name: 'Wooden Shield', type: 'armor', ac: 2, formula: '+2', armorType: 'Shield', equipped: true }] },
                    { label: 'Simple Weapon (Scimitar)', items: [{ name: 'Scimitar', type: 'weapon', damage: '1d6 S', stat: 'DEX', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Weapon',
                options: [
                    { label: 'Scimitar (1d6 S, Finesse)', items: [{ name: 'Scimitar', type: 'weapon', damage: '1d6 S', stat: 'DEX', range: 'Melee', equipped: true }] },
                    { label: 'Quarterstaff (1d6/1d8 B)', items: [{ name: 'Quarterstaff', type: 'weapon', damage: '1d6 B', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Armor & Pack',
                options: [
                    { label: "Leather Armor, Explorer's Pack & Druidic Focus", items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }, { name: 'Druidic Focus (Mistletoe)', type: 'tool', desc: 'Natural focus for druidic magic.' }] }
                ]
            }
        ]
    },
    fighter: {
        choices: [
            {
                name: 'Armor & Ranged',
                options: [
                    { label: 'Chain Mail (AC 16)', items: [{ name: 'Chain Mail', type: 'armor', ac: 16, formula: '16', armorType: 'Heavy', minStr: 13, stealthDisadvantage: true, equipped: true }] },
                    { label: 'Leather Armor, Longbow & 20 Arrows', items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: 'Longbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '150/600', equipped: true }, { name: 'Arrow', type: 'consumable', qty: 20 }] }
                ]
            },
            {
                name: 'Martial Weapon',
                options: [
                    { label: 'Longsword & Shield (AC +2)', items: [{ name: 'Longsword', type: 'weapon', damage: '1d8 S', stat: 'STR', range: 'Melee', equipped: true }, { name: 'Shield', type: 'armor', ac: 2, formula: '+2', armorType: 'Shield', equipped: true }] },
                    { label: 'Greatsword (2d6 S, Heavy)', items: [{ name: 'Greatsword', type: 'weapon', damage: '2d6 S', stat: 'STR', range: 'Melee', equipped: true }] },
                    { label: 'Two Shortswords (1d6 P, Finesse)', items: [{ name: 'Shortsword', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: true }, { name: 'Shortsword (Off-hand)', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: false }] }
                ]
            },
            {
                name: 'Pack & Secondary',
                options: [
                    { label: "Dungeoneer's Pack & Light Crossbow (20 bolts)", items: [{ name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: 'Light Crossbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '80/320', equipped: false }, { name: 'Crossbow Bolt', type: 'consumable', qty: 20 }] },
                    { label: "Explorer's Pack & Two Handaxes", items: [{ name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }, { name: 'Handaxe', type: 'weapon', damage: '1d6 S', stat: 'STR', range: '20/60', qty: 2, equipped: false }] }
                ]
            }
        ]
    },
    monk: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Shortsword (1d6 P, Finesse)', items: [{ name: 'Shortsword', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: true }] },
                    { label: 'Simple Weapon (Spear)', items: [{ name: 'Spear', type: 'weapon', damage: '1d6 P', stat: 'STR', range: '20/60', equipped: true }] }
                ]
            },
            {
                name: 'Pack & Ranged',
                options: [
                    { label: "Dungeoneer's Pack & 10 Darts", items: [{ name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: 'Dart', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 10, equipped: false }] },
                    { label: "Explorer's Pack & 10 Darts", items: [{ name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }, { name: 'Dart', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 10, equipped: false }] }
                ]
            }
        ]
    },
    paladin: {
        choices: [
            {
                name: 'Martial Weapon',
                options: [
                    { label: 'Longsword & Shield (AC +2)', items: [{ name: 'Longsword', type: 'weapon', damage: '1d8 S', stat: 'STR', range: 'Melee', equipped: true }, { name: 'Shield', type: 'armor', ac: 2, formula: '+2', armorType: 'Shield', equipped: true }] },
                    { label: 'Greatsword (2d6 S, Heavy)', items: [{ name: 'Greatsword', type: 'weapon', damage: '2d6 S', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Secondary & Javelins',
                options: [
                    { label: 'Five Javelins & Simple Melee Weapon', items: [{ name: 'Javelin', type: 'weapon', damage: '1d6 P', range: '30/120', stat: 'STR', qty: 5, equipped: false }, { name: 'Warhammer', type: 'weapon', damage: '1d8 B', stat: 'STR', range: 'Melee', equipped: false }] }
                ]
            },
            {
                name: 'Armor & Pack',
                options: [
                    { label: "Chain Mail, Priest's Pack & Holy Symbol", items: [{ name: 'Chain Mail', type: 'armor', ac: 16, formula: '16', armorType: 'Heavy', minStr: 13, stealthDisadvantage: true, equipped: true }, { name: "Priest's Pack", type: 'tool', desc: 'Backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days rations, waterskin.' }, { name: 'Holy Symbol', type: 'tool', desc: 'Amulet holy symbol.' }] }
                ]
            }
        ]
    },
    ranger: {
        choices: [
            {
                name: 'Armor',
                options: [
                    { label: 'Scale Mail (Medium, AC 14 + DEX max 2)', items: [{ name: 'Scale Mail', type: 'armor', ac: 14, formula: '14 + DEX (max 2)', armorType: 'Medium', stealthDisadvantage: true, equipped: true }] },
                    { label: 'Leather Armor (Light, AC 11 + DEX)', items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }] }
                ]
            },
            {
                name: 'Weapons',
                options: [
                    { label: 'Two Shortswords', items: [{ name: 'Shortsword', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: true }, { name: 'Shortsword (Off-hand)', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: false }] },
                    { label: 'Two Simple Weapons (Handaxes)', items: [{ name: 'Handaxe', type: 'weapon', damage: '1d6 S', stat: 'STR', range: '20/60', qty: 2, equipped: true }] }
                ]
            },
            {
                name: 'Pack & Bow',
                options: [
                    { label: "Longbow, 20 Arrows & Dungeoneer's Pack", items: [{ name: 'Longbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '150/600', equipped: true }, { name: 'Arrow', type: 'consumable', qty: 20 }, { name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }] },
                    { label: "Longbow, 20 Arrows & Explorer's Pack", items: [{ name: 'Longbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '150/600', equipped: true }, { name: 'Arrow', type: 'consumable', qty: 20 }, { name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }] }
                ]
            }
        ]
    },
    rogue: {
        choices: [
            {
                name: 'Primary Weapon',
                options: [
                    { label: 'Rapier (1d8 P, Finesse)', items: [{ name: 'Rapier', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: 'Melee', equipped: true }] },
                    { label: 'Shortsword (1d6 P, Finesse)', items: [{ name: 'Shortsword', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Ranged Weapon',
                options: [
                    { label: 'Shortbow & Quiver of 20 Arrows', items: [{ name: 'Shortbow', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: '80/320', equipped: false }, { name: 'Arrow', type: 'consumable', qty: 20 }] },
                    { label: 'Shortsword (Off-hand)', items: [{ name: 'Shortsword (Off-hand)', type: 'weapon', damage: '1d6 P', stat: 'DEX', range: 'Melee', equipped: false }] }
                ]
            },
            {
                name: 'Pack & Rogue Kit',
                options: [
                    { label: "Burglar's Pack, Leather Armor, 2 Daggers & Thieves' Tools", items: [{ name: "Burglar's Pack", type: 'tool', desc: 'Backpack, 1000 ball bearings, 10ft string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks oil, 5 days rations, tinderbox, waterskin, 50ft rope.' }, { name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: false }, { name: "Thieves' Tools", type: 'tool', desc: 'Lockpicks and bypass tools.' }] }
                ]
            }
        ]
    },
    sorcerer: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Light Crossbow & 20 Bolts', items: [{ name: 'Light Crossbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '80/320', equipped: true }, { name: 'Crossbow Bolt', type: 'consumable', qty: 20 }] },
                    { label: 'Two Daggers', items: [{ name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: true }] }
                ]
            },
            {
                name: 'Focus',
                options: [
                    { label: 'Arcane Focus (Orb)', items: [{ name: 'Arcane Focus (Orb)', type: 'tool', desc: 'Spellcasting focus for sorcerous power.' }] },
                    { label: 'Component Pouch', items: [{ name: 'Component Pouch', type: 'tool', desc: 'Pouch containing material spell components.' }] }
                ]
            },
            {
                name: 'Pack & Daggers',
                options: [
                    { label: "Dungeoneer's Pack & 2 Daggers", items: [{ name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: false }] },
                    { label: "Explorer's Pack & 2 Daggers", items: [{ name: "Explorer's Pack", type: 'tool', desc: 'Bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50ft rope.' }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: false }] }
                ]
            }
        ]
    },
    warlock: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Light Crossbow & 20 Bolts', items: [{ name: 'Light Crossbow', type: 'weapon', damage: '1d8 P', stat: 'DEX', range: '80/320', equipped: true }, { name: 'Crossbow Bolt', type: 'consumable', qty: 20 }] },
                    { label: 'Simple Weapon (Quarterstaff)', items: [{ name: 'Quarterstaff', type: 'weapon', damage: '1d6 B', stat: 'STR', range: 'Melee', equipped: true }] }
                ]
            },
            {
                name: 'Focus',
                options: [
                    { label: 'Arcane Focus (Wand)', items: [{ name: 'Arcane Focus (Wand)', type: 'tool', desc: 'Wand focus for patron invocations.' }] },
                    { label: 'Component Pouch', items: [{ name: 'Component Pouch', type: 'tool', desc: 'Material spell component pouch.' }] }
                ]
            },
            {
                name: 'Armor & Pack',
                options: [
                    { label: "Leather Armor, Dungeoneer's Pack & 2 Daggers", items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: false }] },
                    { label: "Leather Armor, Scholar's Pack & 2 Daggers", items: [{ name: 'Leather Armor', type: 'armor', ac: 11, formula: '11 + DEX', armorType: 'Light', equipped: true }, { name: "Scholar's Pack", type: 'tool', desc: 'Backpack, book of lore, ink bottle, pen, 10 sheets of parchment, little bag of sand, small knife.' }, { name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', qty: 2, equipped: false }] }
                ]
            }
        ]
    },
    wizard: {
        choices: [
            {
                name: 'Weapon',
                options: [
                    { label: 'Quarterstaff (1d6 B)', items: [{ name: 'Quarterstaff', type: 'weapon', damage: '1d6 B', stat: 'STR', range: 'Melee', equipped: true }] },
                    { label: 'Dagger (1d4 P, Finesse)', items: [{ name: 'Dagger', type: 'weapon', damage: '1d4 P', stat: 'DEX', range: '20/60', equipped: true }] }
                ]
            },
            {
                name: 'Focus',
                options: [
                    { label: 'Arcane Focus (Crystal)', items: [{ name: 'Arcane Focus (Crystal)', type: 'tool', desc: 'Crystal focus for wizard spells.' }] },
                    { label: 'Component Pouch', items: [{ name: 'Component Pouch', type: 'tool', desc: 'Component pouch with material components.' }] }
                ]
            },
            {
                name: 'Pack & Spellbook',
                options: [
                    { label: "Scholar's Pack & Spellbook", items: [{ name: "Scholar's Pack", type: 'tool', desc: 'Backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, bag of sand, small knife.' }, { name: 'Spellbook', type: 'tool', desc: 'Leather-bound tome containing inscribed wizard spells.' }] },
                    { label: "Dungeoneer's Pack & Spellbook", items: [{ name: "Dungeoneer's Pack", type: 'tool', desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50ft rope.' }, { name: 'Spellbook', type: 'tool', desc: 'Leather-bound tome containing inscribed wizard spells.' }] }
                ]
            }
        ]
    }
});
