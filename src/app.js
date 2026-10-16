// ================= FILEREADER SAFETY =================
const SafeFileReader = (typeof window !== 'undefined' && window.FileReader)
    ? window.FileReader
    : (typeof FileReader !== 'undefined' ? FileReader : null);

const STORAGE_KEY = 'character_dnd_v21';

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

import CHARACTER_DATA from "./character.json";
import CLASS_COMPENDIUM from "./dnd-data/class-compendium.json";
import BACKGROUND_COMPENDIUM from "./dnd-data/background-compendium.json";
import PHB_SPELLS from "./dnd-data/spells/spells-phb.json";
import TCE_SPELLS from "./dnd-data/spells/spells-tce.json";
import XGE_SPELLS from "./dnd-data/spells/spells-xge.json";

const SPELL_SOURCES = [PHB_SPELLS, TCE_SPELLS, XGE_SPELLS];

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

const SUBCLASS_ALIASES = {
    djinni: 'genie',
    efreeti: 'genie',
    dao: 'genie',
    marid: 'genie'
};

function findCompendiumClass(className) {
    const normClass = normalizeKey(className);
    if (!normClass) return null;

    const classKey = Object.keys(CLASS_COMPENDIUM).find(key => {
        const normKey = normalizeKey(key);
        const normName = normalizeKey(CLASS_COMPENDIUM[key]?.name);
        return normKey === normClass || normName === normClass;
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
    const canonKey = String(attrKey).toUpperCase();
    const raw = attributes[canonKey];
    const score = typeof raw?.score === 'number' ? raw.score : (parseInt(raw?.score, 10) || 10);
    return Math.floor((score - 10) / 2);
}

const MULTICLASS_SPELL_SLOTS = {
    1:  [2],
    2:  [3],
    3:  [4, 2],
    4:  [4, 3],
    5:  [4, 3, 2],
    6:  [4, 3, 3],
    7:  [4, 3, 3, 1],
    8:  [4, 3, 3, 2],
    9:  [4, 3, 3, 3, 1],
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1],
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1],
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

const WARLOCK_PACT_TABLE = {
    1:  { count: 1, level: 1 },
    2:  { count: 2, level: 1 },
    3:  { count: 2, level: 2 },
    4:  { count: 2, level: 2 },
    5:  { count: 2, level: 3 },
    6:  { count: 2, level: 3 },
    7:  { count: 2, level: 4 },
    8:  { count: 2, level: 4 },
    9:  { count: 2, level: 5 },
    10: { count: 2, level: 5 },
    11: { count: 3, level: 5 },
    12: { count: 3, level: 5 },
    13: { count: 3, level: 5 },
    14: { count: 3, level: 5 },
    15: { count: 3, level: 5 },
    16: { count: 3, level: 5 },
    17: { count: 4, level: 5 },
    18: { count: 4, level: 5 },
    19: { count: 4, level: 5 },
    20: { count: 4, level: 5 }
};

function calculateExpectedSlots(classes = []) {
    const list = [];
    const warlock = classes.find(c => normalizeKey(c?.name) === 'warlock');
    if (warlock) {
        const wLvl = Math.min(20, Math.max(1, parseInt(warlock.level, 10) || 1));
        const pInfo = WARLOCK_PACT_TABLE[wLvl];
        list.push({
            id: 'pact',
            level: `Pact (Warlock ${wLvl})`,
            max: pInfo.count,
            reset: 'short'
        });
    }

    let casterLvl = 0;
    const standardCasters = [];
    classes.forEach(c => {
        const n = normalizeKey(c?.name || '');
        const lvl = parseInt(c?.level, 10) || 0;
        if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(n)) {
            casterLvl += lvl;
            standardCasters.push({ name: c.name, level: lvl });
        } else if (['paladin', 'ranger'].includes(n)) {
            casterLvl += Math.floor(lvl / 2);
            standardCasters.push({ name: c.name, level: lvl });
        } else if (n === 'artificer') {
            casterLvl += Math.ceil(lvl / 2);
            standardCasters.push({ name: c.name, level: lvl });
        }
    });

    if (casterLvl > 0) {
        const counts = MULTICLASS_SPELL_SLOTS[Math.min(20, casterLvl)] || [];
        const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
        const classTag = standardCasters.length === 1
            ? ` (${standardCasters[0].name.charAt(0).toUpperCase() + standardCasters[0].name.slice(1)})`
            : '';
        counts.forEach((max, idx) => {
            list.push({
                id: `lvl${idx + 1}`,
                level: `${ordinals[idx]} Level${classTag}`,
                max: max,
                reset: 'long'
            });
        });
    }
    return list;
}

function syncCharacterSpellSlots(d) {
    if (!d || !d.identity || !Array.isArray(d.identity.classes)) return;
    const expected = calculateExpectedSlots(d.identity.classes);
    if (!d.magic) d.magic = { slots: [], spells: [] };
    if (!Array.isArray(d.magic.slots)) d.magic.slots = [];

    const existingMap = new Map();
    d.magic.slots.forEach(s => {
        if (s.id) existingMap.set(s.id, s);
    });

    const newSlots = [];
    expected.forEach(exp => {
        const exist = existingMap.get(exp.id);
        existingMap.delete(exp.id);
        const max = exp.max;
        const spent = [];
        for (let i = 0; i < max; i++) {
            spent.push(exist && Array.isArray(exist.spent) && exist.spent[i] === true);
        }
        newSlots.push({
            id: exp.id,
            level: exp.level,
            max: max,
            reset: exp.reset,
            spent: spent
        });
    });

    // Retain custom slots that the user manually created
    existingMap.forEach(customSlot => {
        if (!String(customSlot.id).startsWith('lvl') && customSlot.id !== 'pact') {
            newSlots.push(customSlot);
        }
    });

    d.magic.slots = newSlots;
}

function resolveBardicDie(d) {
    const classes = d?.identity?.classes || [];
    const bard = classes.find(c => normalizeKey(c?.name) === 'bard');
    const lvl = bard ? (parseInt(bard.level, 10) || 0) : 0;
    if (lvl >= 15) return '1d12';
    if (lvl >= 10) return '1d10';
    if (lvl >= 5) return '1d8';
    if (lvl >= 1) return '1d6';
    return '1d6';
}

function detectClassFeaturesToSync(d) {
    const classes = d?.identity?.classes || [];
    const newResources = [];
    const newTraits = [];
    const existingResourceIds = new Set((d.combat?.resources || []).map(r => r.id));
    const existingTraitNames = new Set((d.combat?.traits || []).map(t => normalizeKey(t.name)));

    classes.forEach(cls => {
        const found = findCompendiumClass(cls.name);
        const classKey = found?.key || normalizeKey(cls.name);
        const subKey = normalizeKey(cls.subclass || '');
        const currentLvl = parseInt(cls.level, 10) || 1;

        // Eloquence Bard
        if (classKey === 'bard' && (subKey.includes('eloquence') || subKey.includes('elocuencia'))) {
            if (currentLvl >= 6 && !existingResourceIds.has('eloquence_universal_speech')) {
                newResources.push({
                    id: 'eloquence_universal_speech',
                    name: 'Universal Speech (Eloquence 6)',
                    uses: 1,
                    actionCost: 'Action',
                    reset: 'Long Rest',
                    color: 'text-teal-300',
                    spent: [false]
                });
            }
            if (currentLvl >= 6 && !existingTraitNames.has('unfailinginspiration')) {
                newTraits.push({
                    name: 'Unfailing Inspiration (Eloquence 6)',
                    desc: 'When a creature adds one of your Bardic Inspiration dice to its check, attack, or saving throw and the roll fails, the creature keeps the Bardic Inspiration die.'
                });
            }
            if (currentLvl >= 14 && !existingResourceIds.has('eloquence_infectious_insp')) {
                newResources.push({
                    id: 'eloquence_infectious_insp',
                    name: 'Infectious Inspiration (Eloquence 14)',
                    usesKey: 'CHA',
                    actionCost: 'Reaction',
                    reset: 'Long Rest',
                    color: 'text-amber-300',
                    spent: []
                });
            }
        }

        // Glamour Bard
        if (classKey === 'bard' && subKey.includes('glamour')) {
            if (currentLvl >= 3 && !existingResourceIds.has('glamour_enthralling_perf')) {
                newResources.push({
                    id: 'glamour_enthralling_perf',
                    name: 'Enthralling Performance (Glamour 3)',
                    uses: 1,
                    actionCost: 'Action (1 min)',
                    reset: 'Short/Long',
                    color: 'text-pink-300',
                    spent: [false]
                });
            }
            if (currentLvl >= 6 && !existingResourceIds.has('glamour_mantle_majesty')) {
                newResources.push({
                    id: 'glamour_mantle_majesty',
                    name: 'Mantle of Majesty (Glamour 6)',
                    uses: 1,
                    actionCost: 'Bonus Action',
                    reset: 'Long Rest',
                    color: 'text-purple-300',
                    spent: [false]
                });
            }
        }

        // Base Bard Countercharm
        if (classKey === 'bard' && currentLvl >= 6 && !existingTraitNames.has('countercharm')) {
            newTraits.push({
                name: 'Countercharm (Bard 6)',
                desc: 'Action: perform until the end of your next turn. You and friendly creatures within 30 ft have advantage on saving throws against being frightened or charmed.'
            });
        }

        // Warlock Genie
        if (classKey === 'warlock' && (subKey.includes('genie') || subKey.includes('djinni') || subKey.includes('efreeti') || subKey.includes('dao') || subKey.includes('marid'))) {
            if (currentLvl >= 6 && !existingResourceIds.has('genie_elemental_gift')) {
                newResources.push({
                    id: 'genie_elemental_gift',
                    name: 'Elemental Gift: Flight 30ft (Genie 6)',
                    usesKey: 'PB',
                    actionCost: 'Bonus Action',
                    reset: 'Long Rest',
                    color: 'text-sky-300',
                    spent: []
                });
            }
            if (currentLvl >= 10 && !existingResourceIds.has('genie_sanctuary')) {
                newResources.push({
                    id: 'genie_sanctuary',
                    name: 'Sanctuary Vessel (Genie 10)',
                    uses: 1,
                    actionCost: 'Action',
                    reset: 'Long Rest',
                    color: 'text-cyan-300',
                    spent: [false]
                });
            }
            if (currentLvl >= 14 && !existingResourceIds.has('genie_limited_wish')) {
                newResources.push({
                    id: 'genie_limited_wish',
                    name: 'Limited Wish (Genie 14)',
                    uses: 1,
                    actionCost: 'Action',
                    reset: '1d4 Long Rests',
                    color: 'text-yellow-300',
                    spent: [false]
                });
            }
        }
    });

    return { newResources, newTraits };
}

function getResourceMaxUses(res, attributes, profBonus = 2) {
    if (typeof res?.uses === 'number' && res.uses > 0) return res.uses;
    if (res?.usesKey) {
        const u = String(res.usesKey).toUpperCase();
        if (u === 'PB' || u === 'PROF') return Math.max(1, profBonus);
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
    const profBonus = Math.floor((totalHd - 1) / 4) + 2;

    if (!Array.isArray(d.vitals.hitDiceSpent)) d.vitals.hitDiceSpent = [];
    while (d.vitals.hitDiceSpent.length < totalHd) d.vitals.hitDiceSpent.push(false);
    if (d.vitals.hitDiceSpent.length > totalHd) d.vitals.hitDiceSpent = d.vitals.hitDiceSpent.slice(0, totalHd);

    if (!d.deathSaves || !Array.isArray(d.deathSaves.successes) || !Array.isArray(d.deathSaves.failures)) {
        d.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
    }
    if (!d.concentration) d.concentration = { active: false, spellName: "" };
    if (!Array.isArray(d.conditions)) d.conditions = [];
    if (!Array.isArray(d.sessionLog)) d.sessionLog = [];
    if (!Array.isArray(d.combat.resources)) d.combat.resources = [];
    if (!Array.isArray(d.combat.traits)) d.combat.traits = [];

    d.combat.resources.forEach(r => {
        const uses = getResourceMaxUses(r, d.attributes, profBonus);
        if (!Array.isArray(r.spent)) r.spent = [];
        while (r.spent.length < uses) r.spent.push(false);
        if (r.spent.length > uses) r.spent = r.spent.slice(0, uses);
    });

    // Auto-sync spell slots according to official class tables
    syncCharacterSpellSlots(d);

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
    let raw = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const legacyKeys = ['character_dnd_v20', 'character_dnd_v19', 'character_dnd_v18', 'character_dnd_data'];
            for (const k of legacyKeys) {
                raw = localStorage.getItem(k);
                if (raw) break;
            }
        }
    } catch (e) {
        console.warn("[Storage] Could not read localStorage:", e);
    }
    if (!raw) return sanitizeTracking(base);

    try {
        const loaded = JSON.parse(raw);
        return sanitizeTracking(loaded);
    } catch (e) {
        console.error("[Storage] Error parsing stored data:", e);
        return sanitizeTracking(base);
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
        return n.includes('genieswrath');
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
    if (subNorm.includes('djinni') || subNorm.includes('thunder')) dmgType = 'Thunder';
    else if (subNorm.includes('efreeti') || subNorm.includes('fire')) dmgType = 'Fire';
    else if (subNorm.includes('dao') || subNorm.includes('bludgeoning')) dmgType = 'Bludgeoning';
    else if (subNorm.includes('marid') || subNorm.includes('cold')) dmgType = 'Cold';

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

    if (hasCharacterFeature(d, ['songofrest'])) {
        return '1d6';
    }
    return null;
}

function computeStats(d) {
    const classes = d?.identity?.classes || [];
    const totalLevel = classes.reduce((acc, c) => acc + (c.level || 0), 0) || 1;
    const profBonus = Math.floor((totalLevel - 1) / 4) + 2;

    const hasJackOfAllTrades = hasCharacterFeature(d, ['jackofalltrades']);
    const jackOfAllTrades = hasJackOfAllTrades ? Math.floor(profBonus / 2) : 0;

    const attrKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    const computedAttrs = {};
    attrKeys.forEach(k => {
        let raw = d?.attributes?.[k] || { score: 10, profSave: false };
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

    const hasSilverTongue = hasCharacterFeature(d, ['silvertongue']);

    const computedSkills = (d?.skills || []).map(s => {
        const attrObj = computedAttrs[s.attr] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += profBonus * 2;
        else if (s.profType === 'C') bonus += profBonus;
        else bonus += jackOfAllTrades;

        const isSilverTongueSkill = hasSilverTongue && (s.id === 'persuasion' || s.id === 'deception');
        const applyMinTen = s.minTen !== undefined ? !!s.minTen : isSilverTongueSkill;

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: applyMinTen ? (10 + bonus) : null
        };
    });

    const percSkill = computedSkills.find(s => s.id === 'perception');
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
    const bardicDie = resolveBardicDie(d);

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
        bardicDie,
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
        if (at.includes('bonus')) actionType = 'bonus';
        else if (at.includes('react')) actionType = 'reaction';
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
        activeTab: 'profile',
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

        // Session Event Log
        modalLogOpen: false,

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

        // Background Compendium
        allBackgrounds: BACKGROUND_COMPENDIUM,
        modalBackgroundsOpen: false,
        backgroundSearchQuery: '',
        backgroundDetailItem: null,

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

        get computedCombatResources() {
            const bardicDie = this.stats.bardicDie || '1d8';
            return (this.data.combat?.resources || []).map((r, idx) => {
                let displayName = r.name || 'Resource';
                let displayReset = r.reset || 'Rest';
                const norm = normalizeKey(r.name || '');

                if (r.id === 'insp_bard' || norm.includes('bardicinspiration')) {
                    displayName = `Bardic Inspiration (${bardicDie})`;
                    const bardClass = (this.data.identity?.classes || []).find(c => normalizeKey(c?.name) === 'bard');
                    const bardLvl = bardClass ? (parseInt(bardClass.level, 10) || 0) : 0;
                    if (bardLvl >= 5) {
                        displayReset = 'Short/Long Rest';
                    }
                }
                return {
                    ...r,
                    originalIndex: idx,
                    displayName,
                    displayReset
                };
            });
        },

        get computedTraits() {
            const bardicDie = this.stats.bardicDie || '1d8';
            const profBonus = this.stats.profBonus || 3;
            const songOfRestDie = this.stats.songOfRestDie || '1d6';

            return (this.data.combat?.traits || []).map((t, idx) => {
                let displayName = t.name || '';
                let displayDesc = t.desc || '';
                const norm = normalizeKey(t.name || '');

                if (norm.includes('unsettlingwords')) {
                    displayDesc = displayDesc.replace(/\b1d\d+\b/g, bardicDie);
                    if (!displayDesc.includes(bardicDie)) {
                        displayDesc = displayDesc.replace(/(?:bardic inspiration die)/i, `Bardic Inspiration die (${bardicDie})`);
                    }
                }
                if (norm.includes('songofrest')) {
                    displayDesc = displayDesc.replace(/\b1d\d+\b/g, songOfRestDie);
                }
                if (norm.includes('genieswrath') || norm.includes('iradelgenio')) {
                    displayDesc = displayDesc.replace(/\(\+\d+\)/g, `(+${profBonus})`);
                }

                return {
                    ...t,
                    originalIndex: idx,
                    displayName,
                    displayDesc
                };
            });
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
                const isBonus = act.includes('bonus');
                const isReaction = act.includes('react');
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
                const isBonus = act.includes('bonus');
                const isReaction = act.includes('react');
                return sp.level === 0 && !isBonus && !isReaction;
            });
        },

        get bonusSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('bonus');
            });
        },

        get reactionSpells() {
            return this.allResolvedSpells.filter(sp => {
                const act = (sp.actionType || '').toLowerCase();
                return act.includes('react');
            });
        },

        get bonusResourcesAndTraits() {
            const items = [];
            (this.data.combat?.resources || []).forEach(r => {
                const cost = (r.actionCost || '').toLowerCase();
                if (cost.includes('bonus')) items.push(r.name);
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
                if (r.includes('short')) list.push(s.level);
            });
            (this.data.combat?.resources || []).forEach(r => {
                const res = (r.reset || '').toLowerCase();
                if (res.includes('short')) list.push(r.name);
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

        get filteredBackgrounds() {
            const q = normalizeKey(this.backgroundSearchQuery || '');
            const list = Object.entries(this.allBackgrounds || {}).map(([key, bg]) => ({ key, ...bg }));
            if (!q) return list;
            return list.filter(bg => {
                const name = normalizeKey(bg.name);
                const desc = normalizeKey(bg.desc);
                const feat = normalizeKey(bg.feature?.name || '');
                const source = normalizeKey(bg.source || '');
                return name.includes(q) || desc.includes(q) || feat.includes(q) || source.includes(q);
            });
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

        // Session Event Log
        logEvent(icon, title, text) {
            if (!Array.isArray(this.data.sessionLog)) this.data.sessionLog = [];
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.data.sessionLog.unshift({
                id: Date.now() + Math.random().toString(36).substring(2, 6),
                time,
                icon: icon || '📜',
                title: title || 'Event',
                text: text || ''
            });
            if (this.data.sessionLog.length > 30) {
                this.data.sessionLog.length = 30;
            }
            this.saveState();
        },

        async clearSessionLog() {
            const ok = await this.uiConfirm("Are you sure you want to clear the session history log?", "Clear History", "🗑️", "Clear Log", "bg-red-600 hover:bg-red-500");
            if (!ok) return;
            this.data.sessionLog = [];
            this.saveState();
        },

        removeLogEntry(id) {
            if (!Array.isArray(this.data.sessionLog)) return;
            this.data.sessionLog = this.data.sessionLog.filter(e => e.id !== id);
            this.saveState();
        },

        // Concentration
        isConcentratingOn(name) {
            return this.data.concentration?.active &&
                this.data.concentration?.spellName?.toLowerCase() === name?.toLowerCase();
        },

        setConcentration(name, reason = '') {
            const prevSpell = this.data.concentration?.spellName;
            const wasActive = !!this.data.concentration?.active;
            this.data.concentration = name ? { active: true, spellName: name } : { active: false, spellName: "" };
            this.saveState();

            if (name && (!wasActive || prevSpell !== name)) {
                this.logEvent('🧠', 'Concentration Started', `Started concentrating on "${name}".`);
            } else if (!name && wasActive && prevSpell) {
                const title = reason ? 'Concentration Broken' : 'Concentration Dropped';
                const desc = reason ? `Concentration on "${prevSpell}" was broken (${reason}).` : `Stopped concentrating on "${prevSpell}".`;
                this.logEvent('🧠', title, desc);
            }
        },

        breakConcentration(reason = '') {
            this.setConcentration("", reason);
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
                    damageType: w.damageType || 'Piercing',
                    propsRaw: (w.properties || []).join(', ')
                };
            } else {
                this.weaponForm = {
                    name: '',
                    attrMode: 'finesse',
                    dice: '1d8',
                    damageType: 'Piercing',
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
            const condObj = this.allConditions.find(c => c.id === id);
            const condName = condObj ? condObj.name : id;
            const condIcon = condObj ? condObj.icon : '✨';
            const idx = this.data.conditions.indexOf(id);

            if (idx >= 0) {
                this.data.conditions.splice(idx, 1);
                this.logEvent('✨', 'Condition Removed', `Cleared "${condName}" condition.`);
            } else {
                this.data.conditions.push(id);
                this.logEvent(condIcon, 'Condition Gained', `Gained "${condName}" condition.`);
                // If condition incapacitates or makes unconscious, notify and break concentration
                if (['incapacitated', 'unconscious', 'paralyzed', 'petrified', 'stunned'].includes(id)) {
                    if (this.data.concentration?.active) {
                        const spName = this.data.concentration.spellName;
                        this.breakConcentration(`incapacitated by ${condName}`);
                        this.uiAlert(`The "${condName}" condition incapacitates you. Concentration on "${spName}" was broken!`, "Concentration Broken", "🧠");
                    }
                }
            }
            this.saveState();
        },

        clearCondition(id) {
            if (!Array.isArray(this.data.conditions)) return;
            const condObj = this.allConditions.find(c => c.id === id);
            const condName = condObj ? condObj.name : id;
            this.data.conditions = this.data.conditions.filter(c => c !== id);
            this.logEvent('✨', 'Condition Removed', `Cleared "${condName}" condition.`);
            this.saveState();
        },

        clearAllConditions() {
            if (this.data.conditions && this.data.conditions.length > 0) {
                this.logEvent('✨', 'Conditions Cleared', `Cleared all active conditions.`);
            }
            this.data.conditions = [];
            this.saveState();
        },

        showConditionDetail(cond) {
            this.conditionDetailItem = cond;
            this.uiAlert(cond.summary, `${cond.icon} Condition: ${cond.name}`, cond.icon);
        },

        // ================= BACKGROUND COMPENDIUM =================
        showCurrentBackgroundDetail() {
            const currentName = this.data.identity?.background || '';
            const norm = normalizeKey(currentName);
            const foundKey = Object.keys(this.allBackgrounds || {}).find(k => {
                const bg = this.allBackgrounds[k];
                return normalizeKey(bg.name) === norm || norm.includes(normalizeKey(bg.name)) || normalizeKey(bg.name).includes(norm);
            });
            if (foundKey) {
                this.backgroundDetailItem = this.allBackgrounds[foundKey];
            } else {
                this.backgroundDetailItem = Object.values(this.allBackgrounds || {})[0] || null;
            }
            this.modalBackgroundsOpen = true;
        },

        selectBackground(bg) {
            this.backgroundDetailItem = bg;
        },

        async applyBackgroundToCharacter(bg) {
            if (!bg) return;
            const ok = await this.uiConfirm(`Do you want to set your character's background to "${bg.name}"?`, "Change Background", "📜", "Set Background");
            if (!ok) return;
            this.data.identity.background = bg.name;
            this.logEvent('📜', 'Background Updated', `Changed background to "${bg.name}". Feature: "${bg.feature?.name}".`);
            this.saveState();
            this.modalBackgroundsOpen = false;
            await this.uiAlert(`Character background set to "${bg.name}". Feature: "${bg.feature?.name}".`, "Background Updated", "✨");
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

            const curHp = this.data.vitals.currentHp;
            const maxHp = this.data.vitals.maxHp || 1;
            const curTemp = this.data.vitals.tempHp || 0;
            const tempStr = curTemp > 0 ? ` (Temp HP: ${curTemp})` : '';

            this.logEvent('💥', 'Damage Taken', `Took ${amount} damage${note}. Current HP: ${curHp}/${maxHp}${tempStr}.`);

            this.saveState();
            this.modalHpManagerOpen = false;

            if (this.data.vitals.currentHp === 0) {
                if (this.data.concentration?.active) {
                    const spellName = this.data.concentration.spellName;
                    this.breakConcentration('dropped to 0 HP');
                    this.logEvent('☠️', 'Fell Unconscious', `Dropped to 0 HP. Death saves required.`);
                    this.uiAlert(`You dropped to 0 HP (Unconscious). Concentration on "${spellName}" was lost immediately.`, "Fell Unconscious!", "☠️");
                } else {
                    this.logEvent('☠️', 'Fell Unconscious', `Dropped to 0 HP. Death saves required.`);
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

            this.logEvent('💚', 'Healing Received', `Restored ${amount} HP. Current HP: ${this.data.vitals.currentHp}/${max}.`);
            this.saveState();
            this.modalHpManagerOpen = false;
        },

        applyTempHp(amount) {
            amount = Math.max(0, parseInt(amount, 10) || 0);
            this.data.vitals.tempHp = amount;
            this.logEvent('🛡️', 'Temp HP', `Set Temporary HP to ${amount}.`);
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

            // 1. Sync Spell Slots according to official class tables
            syncCharacterSpellSlots(this.data);

            // 2. Detect & auto-add newly unlocked class features
            const { newResources, newTraits } = detectClassFeaturesToSync(this.data);
            if (newResources.length > 0) {
                this.data.combat.resources.push(...newResources);
            }
            if (newTraits.length > 0) {
                this.data.combat.traits.push(...newTraits);
            }

            sanitizeTracking(this.data);
            this.saveState();
            this.modalLevelUpOpen = false;

            const totalLevel = (this.data.identity?.classes || []).reduce((a, b) => a + (b.level || 0), 0);
            const addedNames = [...newResources.map(r => r.name), ...newTraits.map(t => t.name)];
            let alertMsg = `Advanced to Level ${totalLevel}! HP, Hit Dice, and Spell Slots have been automatically synchronized.`;
            if (addedNames.length > 0) {
                alertMsg += `\n\n✨ Unlocked new class features added:\n• ` + addedNames.join('\n• ');
            }
            this.logEvent('⭐', 'Level Up', `Reached Level ${totalLevel}. Max HP: ${newMaxHp}.${addedNames.length > 0 ? ` Unlocked: ${addedNames.join(', ')}.` : ''}`);
            this.uiAlert(alertMsg, "Level Up Complete", "🎉");
        },

        syncClassFeatures() {
            syncCharacterSpellSlots(this.data);
            const { newResources, newTraits } = detectClassFeaturesToSync(this.data);
            let addedCount = 0;
            if (newResources.length > 0) {
                this.data.combat.resources.push(...newResources);
                addedCount += newResources.length;
            }
            if (newTraits.length > 0) {
                this.data.combat.traits.push(...newTraits);
                addedCount += newTraits.length;
            }
            sanitizeTracking(this.data);
            this.saveState();

            if (addedCount > 0) {
                const names = [...newResources.map(r => r.name), ...newTraits.map(t => t.name)].join(', ');
                this.logEvent('✨', 'Features Synchronized', `Added: ${names}.`);
                this.uiAlert(`Synchronized ${addedCount} unlocked class features and spell slots:\n• ${names}`, "Features Synchronized", "✨");
            } else {
                this.uiAlert("All class features, tactical resources, and spell slots are already up to date with your current levels.", "Already Up to Date", "✅");
            }
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
                if (r.includes('short')) slot.spent = slot.spent.map(() => false);
            });

            (this.data.combat?.resources || []).forEach(resource => {
                const r = (resource.reset || '').toLowerCase();
                if (r.includes('short')) resource.spent = resource.spent.map(() => false);
            });

            this.saveState();
            this.modalShortRestOpen = false;

            const rechargedList = this.shortRestRecharges.length > 0 ? this.shortRestRecharges.join(', ') : 'None';
            this.logEvent('⛺', 'Short Rest', `Spent ${count} Hit Dice. Restored ${totalHealed} HP (HP: ${this.data.vitals.currentHp}/${this.data.vitals.maxHp}). Recharged: ${rechargedList}.`);

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

            this.logEvent('🌙', 'Long Rest', `Full rest. Restored all HP (${this.data.vitals.maxHp}), Hit Dice, Spell Slots, and Class Resources.`);

            this.saveState();
            await this.uiAlert("Long Rest completed. Health and resources fully restored.", "Long Rest", "✨");
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
                    await this.uiAlert("Invalid file format. You can import character.json or a legacy character.js file.", "Error", "❌");
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