// ================= FILEREADER SAFETY =================
const SafeFileReader = (typeof window !== 'undefined' && window.FileReader)
    ? window.FileReader
    : (typeof FileReader !== 'undefined' ? FileReader : null);

const STORAGE_KEY = 'character_dnd_v20';

export const DND_CONDITIONS = [
    {
        id: 'blinded',
        name: 'Blinded',
        icon: '🙈',
        summary: 'Cannot see (fails sight checks). Attacks against have advantage, attacks have disadvantage.'
    },
    {
        id: 'charmed',
        name: 'Charmed',
        icon: '💖',
        summary: 'Cannot attack charmer. Charmer has advantage on social ability checks against you.'
    },
    {
        id: 'deafened',
        name: 'Deafened',
        icon: '🙉',
        summary: 'Cannot hear and automatically fails ability checks that require hearing.'
    },
    {
        id: 'exhaustion',
        name: 'Exhaustion',
        icon: '⌛',
        summary: 'Cumulative penalties (1: Disadv. checks, 2: Speed halved, 3: Disadv. attacks/saves, 4: Max HP halved, 5: Speed 0, 6: Death).'
    },
    {
        id: 'frightened',
        name: 'Frightened',
        icon: '😨',
        summary: 'Disadvantage on ability checks & attack rolls while source of fear is in line of sight. Cannot willingly move closer.'
    },
    {
        id: 'grappled',
        name: 'Grappled',
        icon: '🤼',
        summary: 'Speed becomes 0, cannot benefit from speed bonuses. Ends if grappler is incapacitated.'
    },
    {
        id: 'incapacitated',
        name: 'Incapacitated',
        icon: '💫',
        summary: 'Cannot take actions or reactions. Breaks concentration immediately.'
    },
    {
        id: 'invisible',
        name: 'Invisible',
        icon: '👻',
        summary: 'Impossible to see without aid. Attack rolls against have disadvantage, attacks have advantage.'
    },
    {
        id: 'paralyzed',
        name: 'Paralyzed',
        icon: '⚡',
        summary: 'Incapacitated, cannot move or speak. Auto-fail STR/DEX saves. Attacks against have adv; melee within 5 ft are auto-crits!'
    },
    {
        id: 'petrified',
        name: 'Petrified',
        icon: '🗿',
        summary: 'Transformed into solid stone. Incapacitated, weight x10. Auto-fail STR/DEX saves. Resistance to all damage, immune to poison/disease.'
    },
    {
        id: 'poisoned',
        name: 'Poisoned',
        icon: '🤢',
        summary: 'Disadvantage on attack rolls and ability checks.'
    },
    {
        id: 'prone',
        name: 'Prone',
        icon: '🧎',
        summary: 'Can crawl (costs double movement) or spend half speed to stand. Attacks have disadv. Attacks within 5 ft have adv; >5 ft have disadv.'
    },
    {
        id: 'restrained',
        name: 'Restrained',
        icon: '🕸️',
        summary: 'Speed 0. Attack rolls against have adv, attacks have disadv. Disadvantage on DEX saving throws.'
    },
    {
        id: 'stunned',
        name: 'Stunned',
        icon: '🌀',
        summary: 'Incapacitated, cannot move, speaks falteringly. Auto-fail STR/DEX saves. Attacks against have advantage.'
    },
    {
        id: 'unconscious',
        name: 'Unconscious',
        icon: '💤',
        summary: 'Incapacitated, drops what holding, falls prone. Auto-fails STR/DEX saves. Attacks against have adv; melee within 5 ft are auto-crits.'
    }
];

import { CHARACTER_DATA } from "./character.js";
import { CLASS_COMPENDIUM } from "./dnd-data/class-compendium.js";
import { PHB_SPELLS } from "./dnd-data/spells/spells-phb.js";
import { TCE_SPELLS } from "./dnd-data/spells/spells-tce.js";
import { XGE_SPELLS } from "./dnd-data/spells/spells-xge.js";

const SPELL_SOURCES = [PHB_SPELLS, TCE_SPELLS, XGE_SPELLS];

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

const CLASS_ALIASES = {
    bardo: 'bard',
    brujo: 'warlock',
    guerrero: 'fighter',
    picaro: 'rogue',
    mago: 'wizard',
    clerigo: 'cleric',
    paladin: 'paladin',
    explorador: 'ranger',
    barbaro: 'barbarian',
    monje: 'monk',
    druida: 'druid',
    hechicero: 'sorcerer'
};

const SUBCLASS_ALIASES = {
    djinni: 'genie',
    efreeti: 'genie',
    dao: 'genie',
    marid: 'genie',
    genio: 'genie',
    elocuencia: 'eloquence'
};

function findCompendiumClass(className) {
    const normClass = normalizeKey(className);
    if (!normClass) return null;
    const canonical = CLASS_ALIASES[normClass] || normClass;

    const classKey = Object.keys(CLASS_COMPENDIUM).find(key => {
        const normKey = normalizeKey(key);
        const normName = normalizeKey(CLASS_COMPENDIUM[key]?.name);
        return normKey === canonical || normName === canonical || normKey === normClass || normName === normClass;
    });
    return classKey ? { key: classKey, obj: CLASS_COMPENDIUM[classKey] } : null;
}

function findCompendiumSubclass(classObj, subclassName) {
    if (!classObj || !classObj.subclasses || !subclassName) return null;
    const normSub = normalizeKey(subclassName);
    if (!normSub) return null;
    const canonicalSub = SUBCLASS_ALIASES[normSub] || normSub;

    const subclasses = classObj.subclasses;
    const subKey = Object.keys(subclasses).find(key => {
        const normKey = normalizeKey(key);
        const normName = normalizeKey(subclasses[key]?.name);
        if (normKey === canonicalSub || normName === canonicalSub || normKey === normSub || normName === normSub) {
            return true;
        }
        if (normName.includes(canonicalSub) || canonicalSub.includes(normKey)) {
            return true;
        }
        // Check if any level feature mentions the variant (e.g. "Djinni" within "The Genie")
        const lvl1Feats = subclasses[key]?.features?.[1] || [];
        return lvl1Feats.some(f => normalizeKey(f).includes(normSub));
    });

    return subKey ? { key: subKey, obj: subclasses[subKey] } : null;
}

function generateProgressionTree(className, subclassName, charProgressionMap = {}) {
    const foundClass = findCompendiumClass(className);
    const classObj = foundClass?.obj || null;
    const foundSub = findCompendiumSubclass(classObj, subclassName);
    const subObj = foundSub?.obj || null;

    // Check if character sheet defines progression for this class
    const normClass = normalizeKey(className);
    const charProgKey = Object.keys(charProgressionMap || {}).find(
        k => normalizeKey(k) === normClass || (foundClass && normalizeKey(k) === normalizeKey(foundClass.key))
    );
    const customLevels = Array.isArray(charProgressionMap?.[charProgKey]) ? charProgressionMap[charProgKey] : [];
    const customByLevel = new Map();
    customLevels.forEach(item => {
        if (item && typeof item.level === 'number' && Array.isArray(item.feats) && item.feats.length > 0) {
            customByLevel.set(item.level, item);
        }
    });

    const levels = [];
    for (let lvl = 1; lvl <= 20; lvl++) {
        if (customByLevel.has(lvl)) {
            const custom = customByLevel.get(lvl);
            levels.push({
                level: lvl,
                title: custom.title || `Level ${lvl}`,
                feats: [...custom.feats]
            });
            continue;
        }

        const feats = [];
        if (classObj?.baseFeatures?.[lvl]) feats.push(...classObj.baseFeatures[lvl]);
        if (subObj?.features?.[lvl]) feats.push(...subObj.features[lvl]);
        if (feats.length > 0) {
            levels.push({ level: lvl, title: `Level ${lvl}`, feats });
        }
    }
    return levels;
}

function resolveAttributeMod(attributes, attrKey) {
    if (!attributes || !attrKey) return 0;
    const legacyMap = { FUE: 'STR', DES: 'DEX', CON: 'CON', INT: 'INT', SAB: 'WIS', CAR: 'CHA' };
    const norm = String(attrKey).toUpperCase();
    const canonKey = legacyMap[norm] || norm;
    const raw = attributes[canonKey] || attributes[norm];
    const score = typeof raw?.score === 'number' ? raw.score : (parseInt(raw?.score, 10) || 10);
    return Math.floor((score - 10) / 2);
}

function migrateCharacterToEnglish(d) {
    if (!d || typeof d !== 'object') return d;
    const attrMap = { FUE: 'STR', DES: 'DEX', CON: 'CON', INT: 'INT', SAB: 'WIS', CAR: 'CHA' };
    if (d.attributes) {
        const newAttrs = {};
        for (const [k, v] of Object.entries(d.attributes)) {
            const mapped = attrMap[k.toUpperCase()] || k.toUpperCase();
            newAttrs[mapped] = v;
        }
        d.attributes = newAttrs;
    } else {
        d.attributes = {};
    }
    ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(k => {
        if (!d.attributes[k]) d.attributes[k] = { score: 10, profSave: false };
    });

    const skillMap = {
        acrobacias: { id: 'acrobatics', name: 'Acrobatics', attr: 'DEX' },
        arcanos: { id: 'arcana', name: 'Arcana', attr: 'INT' },
        atletismo: { id: 'athletics', name: 'Athletics', attr: 'STR' },
        engano: { id: 'deception', name: 'Deception', attr: 'CHA' },
        historia: { id: 'history', name: 'History', attr: 'INT' },
        intimidacion: { id: 'intimidation', name: 'Intimidation', attr: 'CHA' },
        interpretacion: { id: 'performance', name: 'Performance', attr: 'CHA' },
        investigacion: { id: 'investigation', name: 'Investigation', attr: 'INT' },
        juego_manos: { id: 'sleight_of_hand', name: 'Sleight of Hand', attr: 'DEX' },
        medicina: { id: 'medicine', name: 'Medicine', attr: 'WIS' },
        naturaleza: { id: 'nature', name: 'Nature', attr: 'INT' },
        percepcion: { id: 'perception', name: 'Perception', attr: 'WIS' },
        perspicacia: { id: 'insight', name: 'Insight', attr: 'WIS' },
        persuasion: { id: 'persuasion', name: 'Persuasion', attr: 'CHA' },
        religion: { id: 'religion', name: 'Religion', attr: 'INT' },
        sigilo: { id: 'stealth', name: 'Stealth', attr: 'DEX' },
        supervivencia: { id: 'survival', name: 'Survival', attr: 'WIS' },
        trato_animales: { id: 'animal_handling', name: 'Animal Handling', attr: 'WIS' }
    };

    if (Array.isArray(d.skills)) {
        d.skills.forEach(s => {
            const m = skillMap[s.id];
            if (m) {
                s.id = m.id;
                s.name = m.name;
                s.attr = m.attr;
            } else if (attrMap[s.attr]) {
                s.attr = attrMap[s.attr];
            }
        });
    }

    if (d.combat?.resources) {
        d.combat.resources.forEach(r => {
            if (r.usesKey && attrMap[r.usesKey]) {
                r.usesKey = attrMap[r.usesKey];
            }
            if (r.actionCost === 'Acción' || r.actionCost === 'Accion') r.actionCost = 'Action';
            if (r.actionCost === 'Acción Adicional' || r.actionCost === 'Acción adicional' || r.actionCost === 'Accion Adicional') r.actionCost = 'Bonus Action';
            if (r.actionCost === 'Reacción' || r.actionCost === 'Reaccion') r.actionCost = 'Reaction';
            if (r.reset === 'Corto/Largo') r.reset = 'Short/Long';
            if (r.reset === 'Largo') r.reset = 'Long Rest';
            if (r.reset === 'Corto') r.reset = 'Short Rest';
            if (r.reset === 'Truco') r.reset = 'Cantrip';
            if (r.name && r.name.includes('Inspiración Bárdica')) r.name = 'Bardic Inspiration (1d8)';
            if (r.name && r.name.includes('Vaso del Genio')) r.name = "Genie's Vessel (6h)";
            if (r.name && r.name.includes('Detectar Pensamientos')) r.name = 'Detect Thoughts (Feat)';
            if (r.name && r.name.includes('Ilusión Menor')) r.name = 'Glasya: Minor Illusion';
            if (r.name && r.name.includes('Disfrazarme')) r.name = 'Glasya: Disguise Self';
            if (r.name && r.name.includes('Invisibilidad')) r.name = 'Glasya: Invisibility';
            if (r.name && (r.name.includes('Puerta Dim') || r.name.includes('Charlatán'))) r.name = 'Cloak of the Mountebank: Dimension Door';
        });
    }

    if (Array.isArray(d.combat?.traits)) {
        d.combat.traits.forEach(t => {
            if (t.name && t.name.includes('Lengua de Plata')) {
                t.name = 'Silver Tongue (Eloquence 3)';
                t.desc = 'When you make a Charisma (Persuasion) or Charisma (Deception) check, you can treat a d20 roll of 9 or lower as a 10.';
            } else if (t.name && t.name.includes('Palabras Inquietantes')) {
                t.name = 'Unsettling Words (Eloquence 3)';
                t.desc = "Bonus Action: expend one use of Bardic Inspiration to roll a Bardic Inspiration die and subtract the number rolled from a creature's next saving throw.";
            } else if (t.name && t.name.includes('Fuente de Inspiración')) {
                t.name = 'Font of Inspiration (Bard 5)';
                t.desc = 'You regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.';
            } else if (t.name && t.name.includes('Canción de Descanso')) {
                t.name = 'Song of Rest (Bard 2)';
                t.desc = 'You and allies regain an extra 1d6 hit points when spending Hit Dice during a short rest.';
            } else if (t.name && t.name.includes('Vaso del Genio')) {
                t.name = "Genie's Vessel (Warlock 1)";
                t.desc = 'You can enter your vessel for up to 6 hours (2x proficiency bonus). AC 15, HP 3.';
            } else if (t.name && t.name.includes('Ira del Genio')) {
                t.name = "Genie's Wrath (Warlock 1)";
                t.desc = 'Once during each of your turns when you hit with an attack, you deal extra thunder damage equal to your proficiency bonus (+3).';
            } else if (t.name && (t.name.includes('Dote Telepático') || t.name.includes('Telepatico'))) {
                t.name = 'Telepathic Feat';
                t.desc = 'You can speak telepathically to any creature within 60 feet. You can cast Detect Thoughts once per long rest without components or spell slots.';
            } else if (t.name && (t.name.includes('Resistencia Infernal') || t.name.includes('Infernal Resistance'))) {
                t.name = 'Infernal Resistance (Tiefling)';
                t.desc = 'You have resistance to fire damage and Darkvision up to 60 feet.';
            }
        });
    }

    if (Array.isArray(d.magic?.slots)) {
        d.magic.slots.forEach(s => {
            if (typeof s.level === 'string') {
                s.level = s.level
                    .replace(/Nivel (\d+)/i, 'Level $1')
                    .replace(/Pacto/i, 'Pact');
            }
        });
    }

    if (Array.isArray(d.magic?.spells)) {
        d.magic.spells.forEach(s => {
            if (s.source === 'Dote Telepático') s.source = 'Telepathic Feat';
            if (s.source === 'Capa del Charlatán') s.source = 'Cloak of the Mountebank';
        });
    }

    if (d.identity) {
        if (d.identity.alignment === 'Caótico Neutral') d.identity.alignment = 'Chaotic Neutral';
        if (d.identity.background === 'Criminal / Fugitivo') d.identity.background = 'Criminal / Fugitive';
        if (typeof d.identity.senses === 'string') {
            d.identity.senses = d.identity.senses.replace(/Visión en Oscuridad/i, 'Darkvision').replace(/pies/i, 'ft.');
        }
        if (Array.isArray(d.identity.languages)) {
            const langMap = { 'Común': 'Common', 'Infernal': 'Infernal', 'Jerga de Ladrones': "Thieves' Cant" };
            d.identity.languages = d.identity.languages.map(l => langMap[l] || l);
        }
        if (Array.isArray(d.identity.classes)) {
            d.identity.classes.forEach(c => {
                if (c.name) c.name = c.name.toLowerCase();
                if (c.subclass) c.subclass = c.subclass.toLowerCase();
            });
        }
    }

    if (d.vitals && typeof d.vitals.speed === 'string') {
        d.vitals.speed = d.vitals.speed.replace(/pies/i, 'ft.');
    }

    if (d.inventory?.armors) {
        d.inventory.armors.forEach(a => {
            if (a.name === 'Cuero Tachonado') a.name = 'Studded Leather';
            if (a.special && a.special.includes('Armadura ligera')) {
                a.special = 'Light armor. Add your full Dexterity modifier to AC.';
            }
        });
    }

    if (d.inventory?.weapons) {
        const dmgTypeMap = { 'Perforante': 'Piercing', 'Cortante': 'Slashing', 'Contundente': 'Bludgeoning', 'Fuego': 'Fire' };
        const wpnNameMap = {
            'Estoque': 'Rapier',
            'Ballesta Ligera': 'Light Crossbow',
            'Daga': 'Dagger',
            'Lanza de Plata': 'Silvered Spear',
            'Fuego Alquímico': "Alchemist's Fire"
        };
        d.inventory.weapons.forEach(w => {
            if (wpnNameMap[w.name]) w.name = wpnNameMap[w.name];
            if (dmgTypeMap[w.damageType]) w.damageType = dmgTypeMap[w.damageType];
            if (Array.isArray(w.properties)) {
                const propMap = { 'Sutil': 'Finesse', 'Ligera': 'Light', 'Dos Manos': 'Two-Handed', 'Recarga': 'Loading', 'Plateada': 'Silvered' };
                w.properties = w.properties.map(p => propMap[p] || p);
            }
        });
    }

    if (Array.isArray(d.inventory?.consumables)) {
        const consMap = {
            'Fuego de alquimista': "Alchemist's Fire",
            'Vial de agua bendita': 'Holy Water',
            'Bolsa de rodamientos': 'Ball Bearings (bag of 1,000)',
            'Púas de suelo (Caltrops)': 'Caltrops (bag of 20)',
            'Pociones de Curación (2d4+2)': 'Potions of Healing (2d4+2)',
            'Poción Restauración': 'Potion of Restoration',
            'Pergamino: Guardia Cuchillas': 'Spell Scroll: Blade Ward',
            'Raciones de viaje': 'Rations',
            'Vino Red Dragon Smash': 'Red Dragon Smash Wine',
            'Virotes de ballesta': 'Crossbow Bolts',
            'Virotes de plata': 'Silvered Crossbow Bolts'
        };
        d.inventory.consumables.forEach(c => {
            if (consMap[c.name]) c.name = consMap[c.name];
        });
    }

    if (Array.isArray(d.inventory?.tools)) {
        const toolMap = {
            'Laúd': 'Lute',
            'Kit de disfraz': 'Disguise Kit',
            'Kit de falsificación': 'Forgery Kit',
            'Capa de gala': 'Fine Cloak',
            'Ropas finas': 'Fine Clothes',
            'Mochila de artista': "Entertainer's Pack",
            'Esposas de hierro': 'Iron Manacles',
            'Garfio': 'Grappling Hook'
        };
        const defaultToolDescs = {
            'Bodhran': 'Celtic-style frame drum & Bard spellcasting focus. Audible rhythm up to 300 ft, ideal for keeping march pace and performance.',
            'Disguise Kit': 'Cosmetics, hair dyes, and small props. Proficiency adds proficiency bonus to disguise checks (10-30 min setup). Opponents must beat your check with Wisdom (Insight/Perception).',
            "Entertainer's Pack": 'Adventuring kit: backpack, bedroll, 2 costumes, 5 candles, 5 days of rations, waterskin, and disguise supplies (38 lbs total).',
            'Fine Cloak': 'Tailored velvet cloak lined with silk. Conceals light weapons or small instruments and grants an air of noble prestige.',
            'Fine Clothes': 'High-society aristocratic attire. Essential for entering noble courts, formal banquets, and high-stakes social events without suspicion.',
            'Forgery Kit': 'Fine parchments, specialized inks, quills, sealing wax, and heraldic seals. Proficiency adds proficiency bonus to forge official decrees, letters, and wax crests.',
            'Grappling Hook': 'Steel triple-prong hook. Fastens to rope for scaling walls, cliffs, or securing anchor points across gaps.',
            'Iron Manacles': 'Restrains Small or Medium creatures. Escaping requires DC 20 DEX (Acrobatics); breaking requires DC 20 STR (Athletics); picking requires Thieves\' Tools and DC 15 DEX.',
            'Lute': 'String instrument & Bard spellcasting focus. Enables Song of Rest performance and Charisma (Performance) entertainment during downtime.',
            'Ocarina (kraken)': 'Handcrafted kraken-motif wind instrument & Bard spellcasting focus. Compact and easily concealed, produces haunting low whistle tones.'
        };
        d.inventory.tools.forEach(t => {
            if (toolMap[t.name]) t.name = toolMap[t.name];
            if (!t.desc && defaultToolDescs[t.name]) {
                t.desc = defaultToolDescs[t.name];
            }
        });
    }

    if (Array.isArray(d.inventory?.story)) {
        const storyMap = {
            'Moneda de Rostro y Cuervo': { name: 'Face & Raven Coin', desc: 'Mysterious campaign quest coin.' },
            'Capa del Charlatán': { name: 'Cloak of the Mountebank', desc: 'Dimension Door 1/day with cloud of smoke.' },
            'Dado de Hueso': { name: 'Bone Die', desc: '+1d6 to a saving throw. Breaks on a natural 1.' },
            'Anillo Consilium Dubium': { name: 'Ring of Consilium Dubium', desc: 'Permanent advantage on Persuasion and Deception checks.' },
            'Botella del Genio': { name: "Genie's Urn", desc: 'Djinni vessel (AC 15, HP 3, 6-hour sanctuary).' },
            'Anillo de sello': { name: 'Signet Ring', desc: 'Stolen from General Garrard.' },
            'Reliquia de San Andral': { name: "St. Andral's Relic", desc: 'Desecrated.' },
            'Gema plateada': { name: 'Silvered Gem', desc: 'From Glede.' },
            'Medallón': { name: 'Dragon Medallion', desc: 'Dragon-shaped medallion.' },
            'Amuleto Lágrima': { name: 'Teardrop Amulet', desc: 'Worn and faded.' },
            'Llave sospechosa': { name: 'Suspicious Key', desc: 'Ancient iron key.' }
        };
        d.inventory.story.forEach(s => {
            if (storyMap[s.name]) {
                s.desc = storyMap[s.name].desc;
                s.name = storyMap[s.name].name;
            }
        });
    }

    if (d.progression && typeof d.progression === 'object') {
        const newProg = {};
        for (const [clsKey, lvlList] of Object.entries(d.progression)) {
            const canonKey = clsKey.toLowerCase();
            if (Array.isArray(lvlList)) {
                lvlList.forEach(lvlObj => {
                    if (lvlObj.title && lvlObj.title.startsWith('Nivel ')) {
                        lvlObj.title = lvlObj.title.replace('Nivel ', 'Level ');
                    }
                    if (Array.isArray(lvlObj.feats)) {
                        lvlObj.feats = lvlObj.feats.map(f => {
                            if (typeof f !== 'string') return f;
                            return f
                                .replace(/Lanzamiento de Conjuros de (.*)/i, 'Spellcasting ($1)')
                                .replace(/Inspiración Bárdica \(d6, usos = CAR\)/i, 'Bardic Inspiration (d6, uses = CHA mod)')
                                .replace(/Inspiración Bárdica mejorada a d8/i, 'Bardic Inspiration die improves to d8')
                                .replace(/Competencias: Armaduras ligeras, simples, estoque, ballesta de mano/i, 'Proficiencies: Light armor, simple weapons, hand crossbow, longsword, rapier, shortsword')
                                .replace(/Polifacético \(\+1\/2 competencia a tiradas sin competencia\)/i, 'Jack of All Trades (+1/2 proficiency bonus rounded down to non-proficient checks)')
                                .replace(/Canción de Descanso \(\+1d6 HP en descanso corto\)/i, 'Song of Rest (+1d6 HP on short rest)')
                                .replace(/Colegio de la (.*)/i, 'College of $1')
                                .replace(/Lengua de Plata \(mínimo 10 en.*?\)/i, 'Silver Tongue (roll 9 or lower on d20 treated as 10 for Persuasion and Deception)')
                                .replace(/Palabras Inquietantes \(.*?\)/i, "Unsettling Words (expend 1 Bardic Inspiration to subtract 1d8 from target's next saving throw)")
                                .replace(/Pericia \(doble competencia\)/i, 'Expertise (double proficiency bonus on 2 skills)')
                                .replace(/Dote Telepático \(.*?\)/i, 'Telepathic Feat (+1 CHA, 60 ft. telepathy, Detect Thoughts 1/day)')
                                .replace(/Fuente de Inspiración \(.*?\)/i, 'Font of Inspiration (regain Bardic Inspiration on short or long rest)')
                                .replace(/Conjuros de Nivel 3/i, '3rd Level Spells')
                                .replace(/Patrón Sobrenatural: El Genio \(Djinni\)/i, 'Otherworldly Patron: The Genie (Djinni)')
                                .replace(/Vaso del Genio \(.*?\)/i, "Genie's Vessel (planar sanctuary and spellcasting focus)")
                                .replace(/Ira del Genio \(.*?\)/i, "Genie's Wrath (+proficiency thunder damage on first hit per turn)")
                                .replace(/Magia de Pacto \(.*?\)/i, 'Pact Magic (1st level spell slot, recharges on short rest)');
                        });
                    }
                });
                newProg[canonKey] = lvlList;
            } else {
                newProg[canonKey] = lvlList;
            }
        }
        d.progression = newProg;
    }

    return d;
}

function getResourceMaxUses(res, attributes) {
    if (typeof res?.uses === 'number' && res.uses > 0) return res.uses;
    if (res?.usesKey) {
        return Math.max(1, resolveAttributeMod(attributes, res.usesKey));
    }
    if (Array.isArray(res?.spent) && res.spent.length > 0) return res.spent.length;
    return 1;
}

function sanitizeTracking(d) {
    if (!d || typeof d !== 'object') d = JSON.parse(JSON.stringify(CHARACTER_DATA));
    if (!d.identity || typeof d.identity !== 'object') d.identity = {};
    if (!d.vitals || typeof d.vitals !== 'object') d.vitals = {};
    if (!d.combat || typeof d.combat !== 'object') d.combat = {};
    if (!d.inventory || typeof d.inventory !== 'object') d.inventory = {};

    if (!Array.isArray(d.identity.classes) || d.identity.classes.length === 0) {
        d.identity.classes = [{ name: "Character", subclass: "", level: 1, hitDie: "d8" }];
    }

    const totalHd = d.identity.classes.reduce((a, b) => a + (b.level || 0), 0) || 1;
    if (!Array.isArray(d.vitals.hitDiceSpent)) d.vitals.hitDiceSpent = [];
    while (d.vitals.hitDiceSpent.length < totalHd) d.vitals.hitDiceSpent.push(false);
    if (d.vitals.hitDiceSpent.length > totalHd) d.vitals.hitDiceSpent = d.vitals.hitDiceSpent.slice(0, totalHd);

    if (!d.deathSaves || !Array.isArray(d.deathSaves.successes) || !Array.isArray(d.deathSaves.failures)) {
        d.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
    }
    if (!d.concentration) d.concentration = { active: false, spellName: "" };
    if (!Array.isArray(d.conditions)) d.conditions = [];
    if (!Array.isArray(d.combat.resources)) d.combat.resources = [];
    if (!Array.isArray(d.combat.traits)) d.combat.traits = [];
    d.combat.resources.forEach(r => {
        const uses = getResourceMaxUses(r, d.attributes);
        if (!Array.isArray(r.spent)) r.spent = [];
        while (r.spent.length < uses) r.spent.push(false);
        if (r.spent.length > uses) r.spent = r.spent.slice(0, uses);
    });

    if (!d.magic) d.magic = { slots: [], spells: [] };
    if (!Array.isArray(d.magic.slots)) d.magic.slots = [];
    d.magic.slots.forEach(slot => {
        const max = slot.max || 1;
        if (!Array.isArray(slot.spent)) slot.spent = [];
        while (slot.spent.length < max) slot.spent.push(false);
        if (slot.spent.length > max) slot.spent = slot.spent.slice(0, max);
    });

    if (!Array.isArray(d.magic.spells)) d.magic.spells = [];
    d.magic.spells = d.magic.spells.map(sp => ({
        ...sp,
        name: sp.name || "Spell",
        source: sp.source || 'Custom',
        sourceType: sp.sourceType || 'other'
    }));

    if (!d.inventory.wealth) d.inventory.wealth = { cp: 0, sp: 0, ep: 0, gp: 0 };
    ['armors', 'weapons', 'consumables', 'tools', 'story'].forEach(k => {
        if (!Array.isArray(d.inventory[k])) d.inventory[k] = [];
    });

    return d;
}

function loadInitialData() {
    const base = JSON.parse(JSON.stringify(CHARACTER_DATA));
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        raw = localStorage.getItem('character_dnd_v19') || localStorage.getItem('character_dnd_v18') || localStorage.getItem('character_dnd_v17');
    }
    if (!raw) return migrateCharacterToEnglish(sanitizeTracking(base));

    try {
        const loaded = JSON.parse(raw);
        return migrateCharacterToEnglish(sanitizeTracking(loaded));
    } catch (e) {
        console.error("[Storage] Error parsing stored data:", e);
        return migrateCharacterToEnglish(sanitizeTracking(base));
    }
}

function parseCharacterFileContent(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Empty file');
    }
    let cleaned = rawText.trim();
    // Support both plain JSON and JS module format ("export var CHARACTER_DATA = {...};" or "CHARACTER_DATA = {...};")
    cleaned = cleaned
        .replace(/^\s*(?:export\s+(?:default\s+|(?:var|let|const)\s+[a-zA-Z_$][\w$]*\s*=\s*)|(?:var|let|const)?\s*[a-zA-Z_$][\w$]*\s*=\s*)/, '')
        .replace(/;\s*$/, '')
        .trim();
    return JSON.parse(cleaned);
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

function resolveGenieDamage(d, profBonus) {
    const traits = d?.combat?.traits || [];
    const genieTrait = traits.find(t => {
        const n = normalizeKey(t.name);
        return n.includes('iradelgenio') || n.includes('genieswrath');
    });

    const classes = d?.identity?.classes || [];
    const genieClass = classes.find(c => {
        const foundClass = findCompendiumClass(c.name);
        const foundSub = findCompendiumSubclass(foundClass?.obj, c.subclass);
        return foundSub?.key === 'genie';
    });

    if (!genieTrait && !genieClass) return null;

    const subNorm = normalizeKey(genieClass?.subclass || genieTrait?.name || genieTrait?.desc || '');
    let dmgType = 'Elemental';
    if (subNorm.includes('djinni') || subNorm.includes('trueno') || subNorm.includes('thunder')) dmgType = 'Thunder';
    else if (subNorm.includes('efreeti') || subNorm.includes('fuego') || subNorm.includes('fire')) dmgType = 'Fire';
    else if (subNorm.includes('dao') || subNorm.includes('contundente') || subNorm.includes('bludgeoning')) dmgType = 'Bludgeoning';
    else if (subNorm.includes('marid') || subNorm.includes('frio') || subNorm.includes('cold')) dmgType = 'Cold';

    return `+${profBonus} ${dmgType} damage`;
}

export const DAMAGE_TYPES = [
    { id: 'fire', name: 'Fire', icon: '🔥' },
    { id: 'cold', name: 'Cold', icon: '❄️' },
    { id: 'lightning', name: 'Lightning', icon: '⚡' },
    { id: 'thunder', name: 'Thunder', icon: '🔊' },
    { id: 'acid', name: 'Acid', icon: '🧪' },
    { id: 'poison', name: 'Poison', icon: '🤢' },
    { id: 'necrotic', name: 'Necrotic', icon: '💀' },
    { id: 'radiant', name: 'Radiant', icon: '☀️' },
    { id: 'force', name: 'Force', icon: '✨' },
    { id: 'psychic', name: 'Psychic', icon: '🧠' },
    { id: 'bludgeoning', name: 'Bludgeoning', icon: '🔨' },
    { id: 'piercing', name: 'Piercing', icon: '🗡️' },
    { id: 'slashing', name: 'Slashing', icon: '⚔️' }
];

function resolveCharacterResistances(d) {
    const list = [];
    const seen = new Set();

    // 1. Explicit array in d.vitals.damageResistances if defined
    if (Array.isArray(d?.vitals?.damageResistances)) {
        d.vitals.damageResistances.forEach(r => {
            const norm = normalizeKey(r);
            const dt = DAMAGE_TYPES.find(t => normalizeKey(t.id) === norm || normalizeKey(t.name) === norm);
            const id = dt ? dt.id : norm;
            if (id && !seen.has(id)) {
                seen.add(id);
                list.push({
                    id,
                    name: dt ? dt.name : (r.charAt(0).toUpperCase() + r.slice(1)),
                    icon: dt ? dt.icon : '🛡️',
                    source: 'Sheet'
                });
            }
        });
    }

    // 2. Scan combat traits (e.g. Tiefling Infernal Resistance, class features)
    const traits = d?.combat?.traits || [];
    traits.forEach(t => {
        const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
        DAMAGE_TYPES.forEach(dt => {
            const typeName = dt.id;
            const reg = new RegExp(`(?:resistance|resistant)\\s+to\\s+[^.]*?\\b${typeName}\\b`, 'i');
            if (reg.test(text) && !seen.has(dt.id)) {
                seen.add(dt.id);
                list.push({
                    id: dt.id,
                    name: dt.name,
                    icon: dt.icon,
                    source: t.name || 'Trait'
                });
            }
        });
    });

    // 3. Scan racial / identity text
    const raceText = String(d?.identity?.race || '').toLowerCase();
    if (raceText.includes('tiefling') && !seen.has('fire')) {
        seen.add('fire');
        list.push({
            id: 'fire',
            name: 'Fire',
            icon: '🔥',
            source: 'Tiefling (Infernal Resistance)'
        });
    }

    return list;
}

function resolveClassHitDie(cls) {
    if (cls?.hitDie) return cls.hitDie;
    const found = findCompendiumClass(cls?.name);
    const key = found?.key || normalizeKey(cls?.name);
    if (key === 'barbarian') return 'd12';
    if (['fighter', 'paladin', 'ranger'].includes(key)) return 'd10';
    if (['wizard', 'sorcerer'].includes(key)) return 'd6';
    return 'd8';
}

function resolveSpellcastingAttrKey(d) {
    if (d?.magic?.spellcastingAttr) return String(d.magic.spellcastingAttr).toUpperCase();
    const classes = d?.identity?.classes || [];
    for (const cls of classes) {
        const key = findCompendiumClass(cls?.name)?.key || normalizeKey(cls?.name);
        if (['wizard', 'artificer'].includes(key)) return 'INT';
        if (['cleric', 'druid', 'ranger'].includes(key)) return 'WIS';
        if (['bard', 'warlock', 'sorcerer', 'paladin'].includes(key)) return 'CHA';
    }
    return 'CHA';
}

function resolveSongOfRestDie(d) {
    const classes = d?.identity?.classes || [];
    const bardClass = classes.find(c => (findCompendiumClass(c?.name)?.key || normalizeKey(c?.name)) === 'bard');
    const bardLevel = bardClass ? (parseInt(bardClass.level, 10) || 0) : 0;

    if (bardLevel >= 17) return '1d12';
    if (bardLevel >= 13) return '1d10';
    if (bardLevel >= 9) return '1d8';
    if (bardLevel >= 2) return '1d6';

    if (hasCharacterFeature(d, ['canciondedescanso', 'songofrest'])) {
        return '1d6';
    }
    return null;
}

function computeStats(d) {
    const classes = d?.identity?.classes || [];
    const totalLevel = classes.reduce((acc, c) => acc + (c.level || 0), 0) || 1;
    const profBonus = Math.floor((totalLevel - 1) / 4) + 2;

    const hasJackOfAllTrades = hasCharacterFeature(d, ['polifacetico', 'jackofalltrades']);
    const jackOfAllTrades = hasJackOfAllTrades ? Math.floor(profBonus / 2) : 0;

    const attrKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const legacyMap = { STR: 'FUE', DEX: 'DES', CON: 'CON', INT: 'INT', WIS: 'SAB', CHA: 'CAR' };

    const computedAttrs = {};
    attrKeys.forEach(k => {
        let raw = d?.attributes?.[k];
        if (!raw) {
            const legKey = legacyMap[k];
            if (legKey && d?.attributes?.[legKey]) raw = d.attributes[legKey];
        }
        if (!raw) raw = { score: 10, profSave: false };

        const score = typeof raw.score === 'number' ? raw.score : (parseInt(raw.score, 10) || 10);
        const mod = Math.floor((score - 10) / 2);
        const save = mod + (raw.profSave ? profBonus : 0);
        computedAttrs[k] = {
            score,
            mod,
            modStr: mod >= 0 ? `+${mod}` : `${mod}`,
            save,
            saveStr: save >= 0 ? `+${save}` : `${save}`,
            profSave: !!raw.profSave
        };
    });

    const hasSilverTongue = hasCharacterFeature(d, ['lenguadeplata', 'silvertongue']);

    const computedSkills = (d?.skills || []).map(s => {
        const attrKey = legacyMap[s.attr] ? s.attr : (Object.keys(legacyMap).find(k => legacyMap[k] === s.attr) || s.attr);
        const attrObj = computedAttrs[s.attr] || computedAttrs[attrKey] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += profBonus * 2;
        else if (s.profType === 'C') bonus += profBonus;
        else bonus += jackOfAllTrades;

        const isSilverTongueSkill = hasSilverTongue && (s.id === 'persuasion' || s.id === 'deception' || s.id === 'engano');
        const applyMinTen = s.minTen !== undefined ? !!s.minTen : isSilverTongueSkill;

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: applyMinTen ? (10 + bonus) : null
        };
    });

    const percSkill = computedSkills.find(s => s.id === 'perception' || s.id === 'percepcion');
    const passivePerception = 10 + (percSkill ? percSkill.valNum : (computedAttrs.WIS.mod + jackOfAllTrades));
    const initNum = computedAttrs.DEX.mod + jackOfAllTrades;
    const initDesc = hasJackOfAllTrades
        ? `DEX (${computedAttrs.DEX.modStr}) + Jack of All Trades (+${jackOfAllTrades})`
        : `DEX (${computedAttrs.DEX.modStr})`;

    let calculatedAc = 10 + computedAttrs.DEX.mod;
    let armorDesc = `10 + DEX (${computedAttrs.DEX.modStr})`;

    const equippedArmors = (d?.inventory?.armors || []).filter(a => a.equipped);
    const mainArmor = equippedArmors.find(a => a.type !== 'shield');
    const equippedShield = equippedArmors.find(a => a.type === 'shield');

    if (mainArmor) {
        if (mainArmor.type === 'light') {
            calculatedAc = mainArmor.baseAc + computedAttrs.DEX.mod;
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc} + DEX)`;
        } else if (mainArmor.type === 'medium') {
            calculatedAc = mainArmor.baseAc + Math.min(2, computedAttrs.DEX.mod);
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc} + max 2)`;
        } else if (mainArmor.type === 'heavy') {
            calculatedAc = mainArmor.baseAc;
            armorDesc = `${mainArmor.name} (${mainArmor.baseAc})`;
        }
    }
    if (equippedShield) {
        calculatedAc += 2;
        armorDesc += " + Shield";
    }

    const computedWeapons = (d?.inventory?.weapons || []).map((w, idx) => {
        let usedAttr = 'STR';
        if (w.attrMode === 'dex') usedAttr = 'DEX';
        else if (w.attrMode === 'finesse') {
            usedAttr = (computedAttrs.DEX.mod >= computedAttrs.STR.mod) ? 'DEX' : 'STR';
        }

        const attrMod = (computedAttrs[usedAttr] || computedAttrs.STR).mod;
        const atkBonus = attrMod + (w.proficient !== false ? profBonus : 0);
        const dmgStr = `${w.dice} ${attrMod >= 0 ? '+' + attrMod : '-' + Math.abs(attrMod)} ${w.damageType || ''}`.trim();

        return {
            ...w,
            originalIndex: idx,
            usedAttr,
            atkStr: atkBonus >= 0 ? `+${atkBonus}` : `${atkBonus}`,
            dmgStr
        };
    });

    const spellcastingAttrKey = resolveSpellcastingAttrKey(d);
    const spellAttrMod = (computedAttrs[spellcastingAttrKey] || computedAttrs.CHA).mod;
    const spellAtkNum = spellAttrMod + profBonus;
    const spellSaveDC = 8 + profBonus + spellAttrMod;
    const bardicUses = Math.max(1, computedAttrs.CHA.mod);
    const hitDiceList = classes.map(c => `${c.level} ${resolveClassHitDie(c)}`).join(' + ');
    const songOfRestDie = resolveSongOfRestDie(d);

    return {
        totalLevel,
        profBonus,
        profBonusStr: `+${profBonus}`,
        hasJackOfAllTrades,
        jackOfAllTrades,
        computedAttrs,
        computedSkills,
        passivePerception,
        initNum,
        initStr: initNum >= 0 ? `+${initNum}` : `${initNum}`,
        initDesc,
        ac: calculatedAc,
        armorDesc,
        spellAtkStr: spellAtkNum >= 0 ? `+${spellAtkNum}` : `${spellAtkNum}`,
        spellSaveDC,
        genieDamage: resolveGenieDamage(d, profBonus),
        songOfRestDie,
        bardicUses,
        hitDiceList,
        hitDiceBreakdown: classes.map(c => `${c.level} ${c.name}`).join(' + '),
        classesSummary: classes.map(c => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`).join(' / '),
        computedWeapons,
        resistances: resolveCharacterResistances(d)
    };
}

// ================= SPELL PARSER & COMPENDIUM =================


function clean5eToolsText(text) {
    if (!text) return '';
    if (Array.isArray(text)) return text.map(clean5eToolsText).filter(Boolean).join('\n\n');
    if (typeof text === 'object') {
        const title = text.name ? `${text.name}:\n` : '';
        if (text.entries) return (title + clean5eToolsText(text.entries)).trim();
        if (text.items) return (title + text.items.map(clean5eToolsText).join('\n')).trim();
        return JSON.stringify(text);
    }
    return String(text).replace(/\{@([a-zA-Z]+) ([^}]+)\}/gi, (_, tag, content) => {
        const parts = content.split('|');
        const t = tag.toLowerCase();
        if (t === 'scaledamage' || t === 'scaledice') return parts[2] || parts[0];
        return parts[0];
    });
}

function parse5eToolsSpell(raw) {
    if (!raw || typeof raw !== 'object' || !raw.name) return null;
    try {
        let actionType = 'action';
        const at = String(raw.actionType || '').toLowerCase();
        if (at.includes('bonus') || at.includes('adicional')) actionType = 'bonus';
        else if (at.includes('react') || at.includes('reacc')) actionType = 'reaction';
        else {
            const timeList = Array.isArray(raw.time) ? raw.time : (raw.time ? [raw.time] : []);
            for (const t of timeList) {
                const unit = String(t.unit || t || '').toLowerCase();
                if (unit.includes('bonus')) actionType = 'bonus';
                if (unit.includes('react')) actionType = 'reaction';
            }
        }

        let conc = false;
        if (raw.conc === true || raw.concentration === true) conc = true;
        const durationList = Array.isArray(raw.duration) ? raw.duration : (raw.duration ? [raw.duration] : []);
        for (const d of durationList) {
            if (d.concentration === true || String(d.type || '').toLowerCase().includes('conc')) conc = true;
        }

        let rangeStr = 'Self';
        if (raw.range?.distance) {
            rangeStr = `${raw.range.distance.amount || ''} ${raw.range.distance.type || 'ft'}`.trim();
        } else if (raw.range?.type) {
            rangeStr = raw.range.type === 'touch' ? 'Touch' : (raw.range.type === 'self' ? 'Self' : raw.range.type);
        }

        let saveStat = '';
        let useSpellDc = false;
        if (Array.isArray(raw.savingThrow) && raw.savingThrow.length > 0) {
            useSpellDc = true;
            const sMap = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
            saveStat = sMap[String(raw.savingThrow[0]).toLowerCase()] || String(raw.savingThrow[0]).toUpperCase();
        }

        const descEntries = clean5eToolsText(raw.entries || '');
        const higherLevelEntries = raw.entriesHigherLevel ? clean5eToolsText(raw.entriesHigherLevel) : '';
        const fullDesc = [descEntries, higherLevelEntries].filter(Boolean).join('\n\n');

        const isHealing = (Array.isArray(raw.miscTags) && raw.miscTags.includes('HL')) ||
            /regains?\s+(?:hit points equal to|\d+d\d+)/i.test(descEntries) ||
            /\b(?:heal|cure|healing)\b/i.test(raw.name);
        const isTeleport = Array.isArray(raw.miscTags) && raw.miscTags.includes('TP');
        const hasDamageInflict = Array.isArray(raw.damageInflict) && raw.damageInflict.length > 0;

        let damageStr = '—';
        if (isHealing) {
            const healMatch = descEntries.match(/(\d+d\d+)/i);
            const hasMod = /spellcasting ability modifier/i.test(descEntries);
            if (healMatch) {
                damageStr = hasMod ? `${healMatch[1]} + MOD` : healMatch[1];
            } else {
                damageStr = 'Heal';
            }
        } else if (!isTeleport) {
            const dmgMatch = descEntries.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
            if (dmgMatch && (hasDamageInflict || raw.spellAttack || useSpellDc)) {
                damageStr = dmgMatch[1];
            }
        }

        const multiBeamCantrip = /more than one beam|two beams at 5th level/i.test(descEntries);

        // Extract higher level scaling formula (At Higher Levels / scaledamage / scaledice)
        let higherLevelScale = null;
        if (raw.entriesHigherLevel) {
            const rawHlStr = JSON.stringify(raw.entriesHigherLevel);
            const mScale = rawHlStr.match(/@scaledamage ([^}]+)/) || rawHlStr.match(/@scaledice ([^}]+)/);
            if (mScale) {
                const parts = mScale[1].split('|');
                higherLevelScale = parts[2] || parts[0];
            } else {
                const mDmg = higherLevelEntries.match(/(?:damage|healing) increases by (\d+d\d+)/i);
                if (mDmg) higherLevelScale = mDmg[1];
            }
        }

        return {
            name: raw.name,
            sourceBook: raw.source || '5eTools',
            level: typeof raw.level === 'number' ? raw.level : (parseInt(raw.level, 10) || 0),
            actionType,
            range: rangeStr,
            duration: conc ? 'Concentration' : (raw.duration?.[0]?.type === 'instant' ? 'Instantaneous' : '1 min'),
            useSpellDc,
            saveStat: saveStat.trim(),
            conc,
            isHealing,
            damage: damageStr,
            scalingLevelDice: raw.scalingLevelDice || null,
            multiBeamCantrip,
            higherLevelScale,
            desc: fullDesc || 'No description available.'
        };
    } catch (err) {
        return null;
    }
}

let spellsCompendium = [];

function buildSpellsCompendium() {
    const rawSources = [];
    if (Array.isArray(SPELL_SOURCES)) rawSources.push(...SPELL_SOURCES);
    ['SPELLS_PHB', 'SPELLS_TCE', 'SPELLS_XGE'].forEach(v => {
        if (window[v] && !rawSources.includes(window[v])) rawSources.push(window[v]);
    });

    const flatSpells = rawSources.flatMap(source => {
        if (Array.isArray(source)) return source;
        if (source && Array.isArray(source.spell)) return source.spell;
        return [];
    });

    const map = new Map();
    flatSpells.forEach(raw => {
        const parsed = parse5eToolsSpell(raw);
        if (parsed && parsed.name && !map.has(normalizeKey(parsed.name))) {
            map.set(normalizeKey(parsed.name), parsed);
        }
    });

    spellsCompendium = Array.from(map.values());
    return spellsCompendium.length;
}

function findSpellInCompendium(name) {
    if (!name || spellsCompendium.length === 0) return null;
    const target = normalizeKey(name);

    let found = spellsCompendium.find(s => normalizeKey(s.name) === target);
    if (found) return found;

    return spellsCompendium.find(s => {
        const sKey = normalizeKey(s.name);
        return sKey && (target.includes(sKey) || sKey.includes(target));
    }) || null;
}

function getCantripScalingTier(totalLevel) {
    if (totalLevel >= 17) return { tier: '17', multiplier: 4 };
    if (totalLevel >= 11) return { tier: '11', multiplier: 3 };
    if (totalLevel >= 5) return { tier: '5', multiplier: 2 };
    return { tier: '1', multiplier: 1 };
}

function resolveScaledSpellDamage(comp, charSpell, totalLevel = 1, lvlNum = 1) {
    const baseDmg = charSpell?.damage || comp?.damage || '—';
    if (lvlNum !== 0) return baseDmg;

    const { tier, multiplier } = getCantripScalingTier(totalLevel);

    // 1. Si el compendio de 5eTools trae scalingLevelDice (ej. Chill Touch, Vicious Mockery, Toll the Dead)
    if (comp?.scalingLevelDice) {
        const list = Array.isArray(comp.scalingLevelDice) ? comp.scalingLevelDice : [comp.scalingLevelDice];
        const scaledParts = list
            .map(item => item?.scaling?.[tier] || item?.scaling?.['1'])
            .filter(Boolean);
        if (scaledParts.length > 0) return scaledParts.join(' / ');
    }

    if (baseDmg === '—') return '—';

    // 2. If it is a cantrip with multiple rays per level (e.g. Eldritch Blast)
    if (comp?.multiBeamCantrip) {
        return multiplier > 1 ? `${multiplier}×${baseDmg}` : baseDmg;
    }

    // 3. Standard cantrip die scaling if mentions levels 5/11/17
    if (multiplier > 1 && /5th level|nivel 5/i.test(comp?.desc || '')) {
        return baseDmg.replace(/^(\d+)d(\d+)/i, (_, count, faces) => `${(parseInt(count, 10) || 1) * multiplier}d${faces}`);
    }

    return baseDmg;
}

function calculateSlotDamage(baseDmg, scaleDice, baseLevel, targetLevel) {
    if (!baseDmg || baseDmg === '—' || !scaleDice || targetLevel <= baseLevel) return baseDmg;
    const diff = targetLevel - baseLevel;
    const baseMatch = baseDmg.match(/^(\d+)d(\d+)(.*)$/i);
    const scaleMatch = scaleDice.match(/^(\d+)d(\d+)/i);
    if (baseMatch && scaleMatch && baseMatch[2] === scaleMatch[2]) {
        const total = (parseInt(baseMatch[1], 10) || 0) + (parseInt(scaleMatch[1], 10) || 1) * diff;
        return `${total}d${baseMatch[2]}${baseMatch[3]}`;
    }
    return `${baseDmg} (+${diff}×${scaleDice})`;
}

function resolveSpellData(charSpell, totalLevel = 1, maxCastLevel = 3, spellAttrMod = null) {
    const comp = findSpellInCompendium(charSpell.name) || {};

    let lvlNum = 1;
    const rawLvl = charSpell.level !== undefined ? charSpell.level : comp.level;
    if (rawLvl === 0 || rawLvl === "0" || rawLvl === "T") lvlNum = 0;
    else lvlNum = parseInt(rawLvl, 10) || 1;

    const actionType = charSpell.actionType || comp.actionType || 'action';
    const conc = charSpell.conc !== undefined ? !!charSpell.conc : !!comp.conc;
    const isHealing = charSpell.isHealing !== undefined ? !!charSpell.isHealing : !!comp.isHealing;
    let damage = resolveScaledSpellDamage(comp, charSpell, totalLevel, lvlNum);
    if (damage && damage.includes('MOD')) {
        const modNum = typeof spellAttrMod === 'number' ? spellAttrMod : 0;
        damage = damage.replace(/MOD/g, modNum >= 0 ? `${modNum}` : `${modNum}`);
    }
    const higherLevelScale = charSpell.higherLevelScale || comp.higherLevelScale || null;

    // Calculate scaling for higher available slots
    const slotScaling = [];
    if (lvlNum > 0 && higherLevelScale && damage !== '—') {
        const topLevel = Math.max(lvlNum, maxCastLevel);
        for (let sl = lvlNum + 1; sl <= topLevel; sl++) {
            slotScaling.push({
                slotLevel: sl,
                label: `Lvl ${sl}`,
                damage: calculateSlotDamage(damage, higherLevelScale, lvlNum, sl)
            });
        }
    }

    const baseDesc = comp.desc || charSpell.desc || 'Description not available in loaded compendiums.';
    const finalDesc = (charSpell.desc && comp.desc && charSpell.desc !== comp.desc)
        ? `${baseDesc}\n\n*Character Note:* ${charSpell.desc}`
        : baseDesc;

    return {
        name: charSpell.name,
        source: charSpell.source || 'Spell',
        sourceType: charSpell.sourceType || 'other',
        sourceBook: comp.sourceBook || '',
        level: lvlNum,
        actionType,
        range: charSpell.range || comp.range || 'Self',
        duration: charSpell.duration || comp.duration || (conc ? 'Concentration' : 'Instantaneous'),
        useSpellDc: charSpell.useSpellDc !== undefined ? charSpell.useSpellDc : (comp.useSpellDc !== undefined ? comp.useSpellDc : false),
        saveStat: (charSpell.saveStat || comp.saveStat || '').trim(),
        conc,
        isHealing,
        damage,
        higherLevelScale,
        slotScaling,
        desc: finalDesc
    };
}

// ================= COMPONENTE ALPINE.JS =================
document.addEventListener('alpine:init', () => {
    Alpine.data('characterSheet', () => ({
        data: loadInitialData(),
        activeTab: 'perfil',
        currentSpellFilter: 'all',
        compendiumCount: 0,

        // Estado de Modales
        modalWeaponOpen: false,
        editingWeaponIndex: null,
        weaponForm: {
            name: '',
            attrMode: 'finesse',
            dice: '1d8',
            damageType: 'Piercing',
            propsRaw: ''
        },

        modalShortRestOpen: false,
        shortRestDiceSelected: 0,

        modalConcOverrideOpen: false,
        pendingConcentrationSpell: null,

        modalDialog: {
            open: false,
            title: '',
            message: '',
            icon: 'ℹ️',
            showCancel: false,
            confirmText: 'Aceptar',
            cancelText: 'Cancelar',
            confirmClass: 'bg-brand-600 hover:bg-brand-500',
            resolve: null
        },

        // Damage / Heal Manager
        modalHpManagerOpen: false,
        hpManagerMode: 'damage', // 'damage' | 'heal' | 'temp'
        hpManagerAmount: 1,
        hpManagerResistedAmount: 0,
        hpManagerResistanceType: '',

        // Conditions
        allConditions: DND_CONDITIONS,
        modalConditionsOpen: false,
        conditionDetailItem: null,

        // Modales de Inventario
        modalConsumableOpen: false,
        editingConsumableIndex: null,
        consumableForm: { name: '', qty: '1' },

        modalStoryItemOpen: false,
        editingStoryItemIndex: null,
        storyItemForm: { name: '', desc: '', isSpecial: false, isMagic: true },

        modalToolOpen: false,
        editingToolIndex: null,
        toolForm: { name: '', desc: '', icon: '🎒', isInstrument: false },

        // Spell Management Modal
        modalSpellAddOpen: false,
        spellAddTab: 'compendium', // 'compendium' | 'manual'
        spellCompendiumSearch: '',
        spellCompendiumLevelFilter: 'all',
        selectedCompendiumSpell: null,
        spellCompendiumSource: 'bard',
        spellManualForm: {
            name: '',
            level: 1,
            actionType: 'action',
            range: '60 ft.',
            duration: 'Instantaneous',
            damage: '',
            conc: false,
            desc: '',
            source: 'bard'
        },

        // Modal de Subida de Nivel / Ficha
        modalLevelUpOpen: false,
        levelUpForm: {
            classes: [],
            maxHp: 0,
            attributes: {},
            newClassName: '',
            newClassSubclass: '',
            newClassHitDie: 'd8'
        },

        init() {
            this.compendiumCount = buildSpellsCompendium();
        },

        // Getters Reactivos
        get stats() {
            return computeStats(this.data);
        },

        get maxSlotLevel() {
            const slots = this.data.magic?.slots || [];
            let maxLvl = 1;
            for (const s of slots) {
                const match = String(s.level || s.id || '').match(/(\d+)/);
                if (match) {
                    const lvl = parseInt(match[1], 10);
                    if (!isNaN(lvl) && lvl > maxLvl) maxLvl = lvl;
                }
            }
            return maxLvl;
        },

        get allResolvedSpells() {
            const totalLevel = this.stats.totalLevel;
            const maxSlot = this.maxSlotLevel;
            const spellAttrMod = (this.stats.computedAttrs?.[this.stats.spellcastingAttrKey] || this.stats.computedAttrs?.CHA)?.mod ?? 0;
            return (this.data.magic?.spells || []).map(sp => resolveSpellData(sp, totalLevel, maxSlot, spellAttrMod));
        },

        get combatSpells() {
            return this.allResolvedSpells.filter(sp => {
                const hasDamage = sp.damage && sp.damage !== '—';
                const isCombatAction = sp.actionType === 'action' || sp.actionType === 'bonus' || sp.actionType === 'reaction';
                return (hasDamage && isCombatAction) || sp.isHealing;
            });
        },

        get offensiveSpells() {
            return this.combatSpells;
        },

        get sortedTools() {
            return [...(this.data.inventory?.tools || [])].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
        },

        get sortedStoryItems() {
            return [...(this.data.inventory?.story || [])].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
        },

        get activeConditionsList() {
            const activeIds = new Set(this.data.conditions || []);
            return this.allConditions.filter(c => activeIds.has(c.id));
        },

        get damageCalculation() {
            const total = Math.max(0, parseInt(this.hpManagerAmount, 10) || 0);
            const resistedPart = Math.max(0, Math.min(total, parseInt(this.hpManagerResistedAmount, 10) || 0));
            const normalPart = Math.max(0, total - resistedPart);
            const halvedPart = Math.floor(resistedPart / 2);
            const finalDamage = normalPart + halvedPart;
            return {
                total,
                resistedPart,
                normalPart,
                halvedPart,
                finalDamage,
                hasResistanceReduction: resistedPart > 0
            };
        },

        get filteredSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || 'action').toLowerCase();
                const isBonus = act.includes('bonus') || act.includes('adicional');
                const isReaction = act.includes('react') || act.includes('reacc');
                const isAction = !isBonus && !isReaction;

                if (this.currentSpellFilter === 'action') return isAction;
                if (this.currentSpellFilter === 'bonus') return isBonus;
                if (this.currentSpellFilter === 'reaction') return isReaction;
                if (this.currentSpellFilter === 'conc') return sp.conc;
                return true;
            });
        },

        get filteredCompendiumSpells() {
            const currentSpellKeys = new Set();
            (this.data.magic?.spells || []).forEach(s => {
                if (!s || !s.name) return;
                currentSpellKeys.add(normalizeKey(s.name));
            });

            const q = normalizeKey(this.spellCompendiumSearch);
            const lvl = this.spellCompendiumLevelFilter;
            let list = spellsCompendium;

            // Exclude spells already owned by character
            list = list.filter(s => {
                const k = normalizeKey(s.name);
                return !currentSpellKeys.has(k);
            });

            if (lvl !== 'all') {
                const targetLvl = parseInt(lvl, 10);
                list = list.filter(s => s.level === targetLvl);
            }
            if (q) {
                list = list.filter(s => normalizeKey(s.name).includes(q));
            }
            return list.slice(0, 50);
        },

        get actionCantrips() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || 'action').toLowerCase();
                const isBonus = act.includes('bonus') || act.includes('adicional');
                const isReaction = act.includes('react') || act.includes('reacc');
                return sp.level === 0 && !isBonus && !isReaction;
            });
        },

        get bonusSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('bonus') || act.includes('adicional');
            });
        },

        get reactionSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('react') || act.includes('reacc');
            });
        },

        get bonusResourcesAndTraits() {
            const items = [];
            (this.data.combat?.resources || []).forEach(r => {
                const cost = (r.actionCost || '').toLowerCase();
                if (cost.includes('adicional') || cost.includes('bonus')) items.push(r.name);
            });
            (this.data.combat?.traits || []).forEach(t => {
                const desc = (t.desc || '').toLowerCase();
                if (desc.includes('action: bonus') || desc.includes('bonus action')) items.push(t.name);
            });
            return items;
        },

        get primaryHitDie() {
            return resolveClassHitDie(this.data.identity?.classes?.[0]);
        },

        get songOfRestDie() {
            return this.stats.songOfRestDie;
        },

        get hasSongOfRest() {
            return !!this.songOfRestDie;
        },

        get availableHitDiceCount() {
            return (this.data.vitals?.hitDiceSpent || []).filter(s => !s).length;
        },

        get totalHitDiceCount() {
            return (this.data.identity?.classes || []).reduce((acc, c) => acc + (c.level || 0), 0);
        },

        get shortRestRecharges() {
            const list = [];
            (this.data.magic?.slots || []).forEach(s => {
                const r = (s.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) list.push(s.level);
            });
            (this.data.combat?.resources || []).forEach(r => {
                const res = (r.reset || '').toLowerCase();
                if (res.includes('short') || res.includes('corto')) list.push(r.name);
            });
            return list;
        },

        get progressionTrees() {
            const activeClasses = this.data.identity?.classes || [];
            return activeClasses.map(cls => ({
                name: cls.name,
                subclass: cls.subclass,
                currentLevel: cls.level || 1,
                tree: generateProgressionTree(cls.name, cls.subclass, this.data.progression)
            }));
        },

        // Persistencia
        saveState() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (e) {
                console.error("[Storage] Error al escribir:", e);
            }
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
                    confirmText: "Got it",
                    cancelText: "Cancel",
                    confirmClass: "bg-brand-600 hover:bg-brand-500",
                    resolve
                };
            });
        },

        openSpellDetail(spell) {
            if (!spell) return;
            const meta = [];
            meta.push(spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`);
            meta.push(spell.actionType === 'bonus' ? 'Bonus Action' : (spell.actionType === 'reaction' ? 'Reaction' : 'Action'));
            if (spell.range) meta.push(`Range: ${spell.range}`);
            if (spell.duration) meta.push(`Duration: ${spell.duration}`);
            if (spell.useSpellDc) meta.push(`Save: ${spell.saveStat || ''} (DC ${this.stats.spellSaveDC})`);
            if (spell.damage && spell.damage !== '—') meta.push(`Base Damage: ${spell.damage}`);

            const header = meta.join(' • ');

            let scalingText = '';
            if (spell.slotScaling && spell.slotScaling.length > 0) {
                scalingText = '\n\n✨ Higher Level Scaling:\n' + spell.slotScaling.map(s => `• ${s.label}: ${s.damage}`).join('\n');
            }

            const fullMessage = `${header}\n\n${spell.desc}${scalingText}`;
            this.uiAlert(fullMessage, `${spell.name}`, '📜');
        },

        uiConfirm(message, title = "Confirmation", icon = "❓", confirmText = "Confirm", confirmClass = "bg-brand-600 hover:bg-brand-500") {
            return new Promise(resolve => {
                this.modalDialog = {
                    open: true,
                    title,
                    message,
                    icon,
                    showCancel: true,
                    confirmText,
                    cancelText: "Cancel",
                    confirmClass,
                    resolve
                };
            });
        },

        resolveDialog(result) {
            if (this.modalDialog.resolve) this.modalDialog.resolve(result);
            this.modalDialog.open = false;
        },

        // Concentration
        isConcentratingOn(name) {
            return this.data.concentration?.active &&
                this.data.concentration?.spellName?.toLowerCase() === name?.toLowerCase();
        },

        setConcentration(name) {
            this.data.concentration = name ? { active: true, spellName: name } : { active: false, spellName: "" };
            this.saveState();
        },

        breakConcentration() {
            this.setConcentration("");
        },

        requestCastConcentration(spellName) {
            if (this.data.concentration.active && this.data.concentration.spellName) {
                if (this.data.concentration.spellName.toLowerCase() === spellName.toLowerCase()) {
                    this.breakConcentration();
                    return;
                }
                this.pendingConcentrationSpell = spellName;
                this.modalConcOverrideOpen = true;
                return;
            }
            this.setConcentration(spellName);
        },

        closeConcentrationModal(proceed) {
            this.modalConcOverrideOpen = false;
            if (proceed && this.pendingConcentrationSpell) {
                this.setConcentration(this.pendingConcentrationSpell);
            }
            this.pendingConcentrationSpell = null;
        },

        // Armas
        openWeaponModal(index = null) {
            this.editingWeaponIndex = index;
            if (index !== null) {
                const w = this.data.inventory.weapons[index];
                this.weaponForm = {
                    name: w.name || '',
                    attrMode: w.attrMode || 'finesse',
                    dice: w.dice || '1d8',
                    damageType: w.damageType || 'Perforante',
                    propsRaw: (w.properties || []).join(', ')
                };
            } else {
                this.weaponForm = {
                    name: '',
                    attrMode: 'finesse',
                    dice: '1d8',
                    damageType: 'Perforante',
                    propsRaw: ''
                };
            }
            this.modalWeaponOpen = true;
        },

        handleSaveWeapon() {
            const name = this.weaponForm.name.trim();
            if (!name) return;

            const properties = this.weaponForm.propsRaw
                ? this.weaponForm.propsRaw.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const weaponObj = {
                name,
                attrMode: this.weaponForm.attrMode,
                dice: this.weaponForm.dice.trim(),
                damageType: this.weaponForm.damageType.trim(),
                proficient: true,
                properties
            };

            if (this.editingWeaponIndex !== null) {
                this.data.inventory.weapons[this.editingWeaponIndex] = weaponObj;
            } else {
                this.data.inventory.weapons.push(weaponObj);
            }

            this.saveState();
            this.modalWeaponOpen = false;
            this.editingWeaponIndex = null;
        },

        async removeWeapon(index) {
            const w = this.data.inventory.weapons[index];
            const ok = await this.uiConfirm(`Do you want to remove the weapon "${w.name}"?`, "Remove Weapon", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.inventory.weapons.splice(index, 1);
            this.saveState();
        },

        // ================= CONDITIONS =================
        hasCondition(id) {
            return Array.isArray(this.data.conditions) && this.data.conditions.includes(id);
        },

        toggleCondition(id) {
            if (!Array.isArray(this.data.conditions)) this.data.conditions = [];
            const idx = this.data.conditions.indexOf(id);
            if (idx >= 0) {
                this.data.conditions.splice(idx, 1);
            } else {
                this.data.conditions.push(id);
                // If condition incapacitates or makes unconscious, notify and break concentration
                if (['incapacitated', 'unconscious', 'paralyzed', 'petrified', 'stunned'].includes(id)) {
                    if (this.data.concentration?.active) {
                        const spName = this.data.concentration.spellName;
                        this.breakConcentration();
                        this.uiAlert(`The "${id}" condition incapacitates you. Concentration on "${spName}" was broken!`, "Concentration Broken", "🧠");
                    }
                }
            }
            this.saveState();
        },

        clearCondition(id) {
            if (!Array.isArray(this.data.conditions)) return;
            this.data.conditions = this.data.conditions.filter(c => c !== id);
            this.saveState();
        },

        clearAllConditions() {
            this.data.conditions = [];
            this.saveState();
        },

        showConditionDetail(cond) {
            this.conditionDetailItem = cond;
            this.uiAlert(cond.summary, `${cond.icon} Condition: ${cond.name}`, cond.icon);
        },

        // ================= DAMAGE / HEAL MANAGER =================
        openHpManager(mode = 'damage') {
            this.hpManagerMode = mode;
            this.hpManagerAmount = 1;
            this.hpManagerResistedAmount = 0;
            const resList = this.stats.resistances || [];
            this.hpManagerResistanceType = resList.length > 0 ? resList[0].name : '';
            this.modalHpManagerOpen = true;
        },

        applyHpManagerAction() {
            const amt = Math.max(0, parseInt(this.hpManagerAmount, 10) || 0);
            if (amt <= 0 && this.hpManagerMode !== 'temp') return;

            if (this.hpManagerMode === 'damage') {
                const calc = this.damageCalculation;
                if (calc.hasResistanceReduction) {
                    const resName = this.hpManagerResistanceType || 'Resisted';
                    const note = ` (${calc.normalPart} normal + ${calc.halvedPart} ${resName} [halved from ${calc.resistedPart}])`;
                    this.applyDamage(calc.finalDamage, note);
                } else {
                    this.applyDamage(calc.finalDamage);
                }
            } else if (this.hpManagerMode === 'heal') {
                this.applyHeal(amt);
            } else if (this.hpManagerMode === 'temp') {
                this.applyTempHp(amt);
            }
        },

        applyDamage(amount, note = '') {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            if (amount <= 0) return;

            const prevTemp = this.data.vitals.tempHp || 0;
            let remainingDamage = amount;

            if (prevTemp > 0) {
                if (remainingDamage >= prevTemp) {
                    remainingDamage -= prevTemp;
                    this.data.vitals.tempHp = 0;
                } else {
                    this.data.vitals.tempHp -= remainingDamage;
                    remainingDamage = 0;
                }
            }

            const prevHp = this.data.vitals.currentHp || 0;
            if (remainingDamage > 0) {
                this.data.vitals.currentHp = Math.max(0, prevHp - remainingDamage);
            }

            this.saveState();
            this.modalHpManagerOpen = false;

            if (this.data.vitals.currentHp === 0) {
                if (this.data.concentration?.active) {
                    const spellName = this.data.concentration.spellName;
                    this.breakConcentration();
                    this.uiAlert(`You dropped to 0 HP (Unconscious). Concentration on "${spellName}" was lost immediately.`, "Fell Unconscious!", "☠️");
                } else {
                    this.uiAlert("You dropped to 0 HP. You must now make death saving throws on your turns.", "0 Hit Points!", "☠️");
                }
                return;
            }

            // Concentration check if damage taken and still conscious
            if (amount > 0 && this.data.concentration?.active) {
                const dc = Math.max(10, Math.floor(amount / 2));
                const conModStr = this.stats.computedAttrs.CON.saveStr;
                this.uiAlert(
                    `You took ${amount} damage${note}.\n\n⚠️ You must make a CONCENTRATION (CON) SAVING THROW with DC ${dc} to maintain concentration on "${this.data.concentration.spellName}".\n(Your CON save bonus is ${conModStr}).`,
                    "Concentration Check",
                    "🧠"
                );
            } else if (note) {
                this.uiAlert(`Applied ${amount} damage${note}.`, "Damage Applied", "🔥");
            }
        },

        applyHeal(amount) {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            if (amount <= 0) return;

            const max = this.data.vitals.maxHp || 1;
            const prev = this.data.vitals.currentHp || 0;
            this.data.vitals.currentHp = Math.min(max, prev + amount);

            if (prev === 0 && this.data.vitals.currentHp > 0) {
                this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
            }

            this.saveState();
            this.modalHpManagerOpen = false;
        },

        applyTempHp(amount) {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            this.data.vitals.tempHp = amount;
            this.saveState();
            this.modalHpManagerOpen = false;
        },

        // ================= CONSUMABLES MANAGEMENT =================
        openConsumableModal(index = null) {
            this.editingConsumableIndex = index;
            if (index !== null && this.data.inventory?.consumables?.[index]) {
                const c = this.data.inventory.consumables[index];
                this.consumableForm = { name: c.name || '', qty: c.qty || '1' };
            } else {
                this.consumableForm = { name: '', qty: '1' };
            }
            this.modalConsumableOpen = true;
        },

        handleSaveConsumable() {
            const name = this.consumableForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.consumables)) this.data.inventory.consumables = [];

            const item = { name, qty: this.consumableForm.qty.trim() || '1' };
            if (this.editingConsumableIndex !== null) {
                this.data.inventory.consumables[this.editingConsumableIndex] = item;
            } else {
                this.data.inventory.consumables.push(item);
            }
            this.saveState();
            this.modalConsumableOpen = false;
            this.editingConsumableIndex = null;
        },

        async removeConsumable(index) {
            const c = this.data.inventory?.consumables?.[index];
            if (!c) return;
            const ok = await this.uiConfirm(`Do you want to remove "${c.name}" from your consumables?`, "Remove Consumable", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.consumables.splice(index, 1);
            this.saveState();
        },

        adjustConsumableQty(index, delta) {
            const c = this.data.inventory?.consumables?.[index];
            if (!c) return;
            const match = String(c.qty || '').match(/^(\d+)(.*)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                const suffix = match[2];
                const newNum = Math.max(0, num + delta);
                c.qty = `${newNum}${suffix}`;
            } else {
                const num = parseInt(c.qty, 10) || 0;
                c.qty = String(Math.max(0, num + delta));
            }
            this.saveState();
        },

        // ================= STORY ITEMS MANAGEMENT =================
        openStoryItemModal(target = null) {
            let index = null;
            if (typeof target === 'number') {
                index = target;
            } else if (target && typeof target === 'object') {
                index = this.data.inventory?.story?.indexOf(target);
            }
            this.editingStoryItemIndex = (index !== null && index >= 0) ? index : null;
            if (this.editingStoryItemIndex !== null && this.data.inventory?.story?.[this.editingStoryItemIndex]) {
                const st = this.data.inventory.story[this.editingStoryItemIndex];
                this.storyItemForm = {
                    name: st.name || '',
                    desc: st.desc || '',
                    isSpecial: !!st.isSpecial,
                    isMagic: st.isMagic !== undefined ? !!st.isMagic : true
                };
            } else {
                this.storyItemForm = { name: '', desc: '', isSpecial: false, isMagic: true };
            }
            this.modalStoryItemOpen = true;
        },

        handleSaveStoryItem() {
            const name = this.storyItemForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.story)) this.data.inventory.story = [];

            const item = {
                name,
                desc: this.storyItemForm.desc.trim(),
                isSpecial: !!this.storyItemForm.isSpecial,
                isMagic: !!this.storyItemForm.isMagic
            };

            if (this.editingStoryItemIndex !== null && this.editingStoryItemIndex >= 0) {
                this.data.inventory.story[this.editingStoryItemIndex] = item;
            } else {
                this.data.inventory.story.push(item);
            }
            this.saveState();
            this.modalStoryItemOpen = false;
            this.editingStoryItemIndex = null;
        },

        async removeStoryItem(target) {
            const index = typeof target === 'number' ? target : this.data.inventory?.story?.indexOf(target);
            if (index === null || index === undefined || index < 0) return;
            const st = this.data.inventory?.story?.[index];
            if (!st) return;
            const ok = await this.uiConfirm(`Do you want to remove "${st.name}"?`, "Remove Item", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.story.splice(index, 1);
            this.saveState();
        },

        // ================= TOOLS & EQUIPMENT MANAGEMENT =================
        openToolModal(target = null) {
            let index = null;
            if (typeof target === 'number') {
                index = target;
            } else if (target && typeof target === 'object') {
                index = this.data.inventory?.tools?.indexOf(target);
            }
            this.editingToolIndex = (index !== null && index >= 0) ? index : null;
            if (this.editingToolIndex !== null && this.data.inventory?.tools?.[this.editingToolIndex]) {
                const t = this.data.inventory.tools[this.editingToolIndex];
                this.toolForm = {
                    name: t.name || '',
                    desc: t.desc || '',
                    icon: t.icon || '🎒',
                    isInstrument: !!t.isInstrument
                };
            } else {
                this.toolForm = { name: '', desc: '', icon: '🎒', isInstrument: false };
            }
            this.modalToolOpen = true;
        },

        handleSaveTool() {
            const name = this.toolForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.tools)) this.data.inventory.tools = [];

            const item = {
                name,
                desc: this.toolForm.desc.trim(),
                icon: this.toolForm.icon || '🎒',
                isInstrument: !!this.toolForm.isInstrument
            };

            if (this.editingToolIndex !== null && this.editingToolIndex >= 0) {
                this.data.inventory.tools[this.editingToolIndex] = item;
            } else {
                this.data.inventory.tools.push(item);
            }
            this.saveState();
            this.modalToolOpen = false;
            this.editingToolIndex = null;
        },

        async removeTool(target) {
            const index = typeof target === 'number' ? target : this.data.inventory?.tools?.indexOf(target);
            if (index === null || index === undefined || index < 0) return;
            const t = this.data.inventory?.tools?.[index];
            if (!t) return;
            const ok = await this.uiConfirm(`Do you want to remove "${t.name}" from your tools & equipment?`, "Remove Tool", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.inventory.tools.splice(index, 1);
            this.saveState();
        },

        // ================= SPELLS MANAGEMENT =================
        openAddSpellModal() {
            this.spellCompendiumSearch = '';
            this.spellCompendiumLevelFilter = 'all';
            this.selectedCompendiumSpell = null;
            this.spellCompendiumSource = this.data.identity?.classes?.[0]?.name || 'bard';
            this.spellManualForm = {
                name: '',
                level: 1,
                actionType: 'action',
                range: '60 ft',
                duration: 'Instantaneous',
                damage: '',
                conc: false,
                desc: '',
                source: this.spellCompendiumSource
            };
            this.modalSpellAddOpen = true;
        },

        addSpellFromCompendium(compSpell) {
            if (!compSpell || !compSpell.name) return;
            if (!Array.isArray(this.data.magic.spells)) this.data.magic.spells = [];

            const compKey = normalizeKey(compSpell.name);
            const exists = this.data.magic.spells.some(s => normalizeKey(s.name) === compKey);
            if (exists) {
                this.uiAlert(`"${compSpell.name}" is already in your spellbook.`, "Already Known", "ℹ️");
                return;
            }

            this.data.magic.spells.push({
                name: compSpell.name,
                source: this.spellCompendiumSource,
                sourceType: this.spellCompendiumSource.toLowerCase()
            });
            this.saveState();
            this.modalSpellAddOpen = false;
            this.uiAlert(`Added "${compSpell.name}" to your spellbook.`, "Spell Added", "✨");
        },

        handleSaveManualSpell() {
            const name = this.spellManualForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.magic.spells)) this.data.magic.spells = [];

            const exists = this.data.magic.spells.some(s => normalizeKey(s.name) === normalizeKey(name));
            if (exists) {
                this.uiAlert(`A spell named "${name}" already exists.`, "Notice", "⚠️");
                return;
            }

            this.data.magic.spells.push({
                name,
                level: parseInt(this.spellManualForm.level, 10) || 0,
                actionType: this.spellManualForm.actionType,
                range: this.spellManualForm.range.trim(),
                duration: this.spellManualForm.duration.trim(),
                damage: this.spellManualForm.damage.trim() || '—',
                conc: !!this.spellManualForm.conc,
                desc: this.spellManualForm.desc.trim(),
                source: this.spellManualForm.source.trim() || 'Custom',
                sourceType: 'custom'
            });

            this.saveState();
            this.modalSpellAddOpen = false;
            this.uiAlert(`Custom spell "${name}" created.`, "Spell Created", "✨");
        },

        async removeSpell(spellName) {
            if (!spellName) return;
            const ok = await this.uiConfirm(`Do you want to remove "${spellName}" from your spellbook?`, "Remove Spell", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.magic.spells = (this.data.magic.spells || []).filter(s => normalizeKey(s.name) !== normalizeKey(spellName));
            this.saveState();
        },

        // ================= SUBIDA DE NIVEL Y ATRIBUTOS =================
        openLevelUpModal() {
            this.levelUpForm.classes = JSON.parse(JSON.stringify(this.data.identity?.classes || []));
            this.levelUpForm.maxHp = this.data.vitals?.maxHp || 10;
            this.levelUpForm.attributes = {};
            ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(k => {
                this.levelUpForm.attributes[k] = this.data.attributes?.[k]?.score || 10;
            });
            this.levelUpForm.newClassName = '';
            this.levelUpForm.newClassSubclass = '';
            this.levelUpForm.newClassHitDie = 'd8';
            this.modalLevelUpOpen = true;
        },

        levelUpClass(cIdx, delta = 1) {
            const cls = this.levelUpForm.classes[cIdx];
            if (!cls) return;
            const current = cls.level || 1;
            const target = Math.max(1, Math.min(20, current + delta));
            cls.level = target;

            if (delta > 0) {
                // Auto HP suggestion: hit die average + CON mod
                const hitDieFaces = parseInt(String(cls.hitDie || 'd8').replace('d', ''), 10) || 8;
                const avgRoll = Math.floor(hitDieFaces / 2) + 1;
                const conMod = Math.floor(((this.levelUpForm.attributes.CON || 10) - 10) / 2);
                const hpGain = Math.max(1, avgRoll + conMod);
                this.levelUpForm.maxHp = (parseInt(this.levelUpForm.maxHp, 10) || 0) + hpGain;
            }
        },

        addNewClassToLevelUpForm() {
            const name = this.levelUpForm.newClassName.trim();
            if (!name) return;
            this.levelUpForm.classes.push({
                name,
                subclass: this.levelUpForm.newClassSubclass.trim(),
                level: 1,
                hitDie: this.levelUpForm.newClassHitDie || 'd8'
            });
            this.levelUpForm.newClassName = '';
            this.levelUpForm.newClassSubclass = '';
        },

        removeClassFromLevelUpForm(cIdx) {
            if (this.levelUpForm.classes.length <= 1) return;
            this.levelUpForm.classes.splice(cIdx, 1);
        },

        handleSaveLevelUp() {
            this.data.identity.classes = JSON.parse(JSON.stringify(this.levelUpForm.classes));
            const newMaxHp = parseInt(this.levelUpForm.maxHp, 10) || this.data.vitals.maxHp;
            this.data.vitals.maxHp = newMaxHp;
            if (this.data.vitals.currentHp > newMaxHp) {
                this.data.vitals.currentHp = newMaxHp;
            }

            ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(k => {
                if (this.data.attributes[k]) {
                    this.data.attributes[k].score = parseInt(this.levelUpForm.attributes[k], 10) || 10;
                }
            });

            sanitizeTracking(this.data);
            this.saveState();
            this.modalLevelUpOpen = false;
            this.uiAlert("Level, attributes, and hit points updated successfully!", "Level Up Complete", "🎉");
        },

        // Rests
        openShortRestModal() {
            this.shortRestDiceSelected = 0;
            this.modalShortRestOpen = true;
        },

        async applyShortRest(diceCount) {
            const count = parseInt(diceCount, 10) || 0;
            let availableIndices = [];
            this.data.vitals.hitDiceSpent.forEach((spent, i) => { if (!spent) availableIndices.push(i); });

            if (count > availableIndices.length) {
                await this.uiAlert(`You only have ${availableIndices.length} hit dice available.`, "Notice", "⚠️");
                return;
            }

            let totalHealed = 0;
            const conMod = resolveAttributeMod(this.data.attributes, 'CON');
            const hitDieFaces = parseInt(this.primaryHitDie.replace('d', ''), 10) || 8;

            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const roll = Math.floor(Math.random() * hitDieFaces) + 1;
                    totalHealed += Math.max(1, roll + conMod);
                    this.data.vitals.hitDiceSpent[availableIndices[i]] = true;
                }
                if (this.hasSongOfRest) {
                    const songFaces = parseInt(String(this.songOfRestDie).replace(/^1?d/i, ''), 10) || 6;
                    totalHealed += (Math.floor(Math.random() * songFaces) + 1);
                }
                this.data.vitals.currentHp = Math.min(this.data.vitals.maxHp, this.data.vitals.currentHp + totalHealed);
            }

            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };

            (this.data.magic?.slots || []).forEach(slot => {
                const r = (slot.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) slot.spent = slot.spent.map(() => false);
            });

            (this.data.combat?.resources || []).forEach(resource => {
                const r = (resource.reset || '').toLowerCase();
                if (r.includes('short') || r.includes('corto')) resource.spent = resource.spent.map(() => false);
            });

            this.saveState();
            this.modalShortRestOpen = false;

            const rechargedStr = this.shortRestRecharges.length > 0
                ? `• Recharged resources: ${this.shortRestRecharges.join(', ')}.`
                : '• No short rest resources configured.';
            await this.uiAlert(`Short Rest complete:\n• Death saves reset.\n${rechargedStr}\n• Health: ${this.data.vitals.currentHp}/${this.data.vitals.maxHp} HP.`, "Short Rest", "⛺");
        },

        async executeLongRest() {
            const ok = await this.uiConfirm("This will restore all Hit Points, Hit Dice, Spell Slots, and class resources.", "Take a Long Rest?", "🌙", "Rest");
            if (!ok) return;

            this.data.vitals.currentHp = this.data.vitals.maxHp;
            this.data.vitals.tempHp = 0;
            this.data.vitals.hitDiceSpent = this.data.vitals.hitDiceSpent.map(() => false);
            this.data.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
            this.data.concentration = { active: false, spellName: "" };

            (this.data.magic?.slots || []).forEach(s => s.spent = s.spent.map(() => false));
            (this.data.combat?.resources || []).forEach(r => r.spent = r.spent.map(() => false));

            this.saveState();
            await this.uiAlert("Long Rest completed. Health and resources fully restored.", "Long Rest", "✨");
        },

        // Export / Import compatible with JS module (CORS-free) and JSON
        exportJSON() {
            const jsonStr = JSON.stringify(this.data, null, 2);
            const jsContent = `export var CHARACTER_DATA = ${jsonStr};\n`;
            const blob = new Blob([jsContent], { type: "text/javascript;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "character.js";
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
                    await this.uiAlert("Invalid file format. You can import both character.js or a .json file.", "Error", "❌");
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        },

        async resetDefaults() {
            const ok = await this.uiConfirm("Reset character sheet to default starting state? All current modifications will be lost.", "Reset Character", "⚠️", "Reset", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
            this.data = sanitizeTracking(JSON.parse(JSON.stringify(CHARACTER_DATA)));
            this.saveState();
            await this.uiAlert("Character sheet reset to defaults.", "Reset Done", "🔄");
        }
    }));
});