// ================= FILEREADER SAFETY =================
const SafeFileReader = (typeof window !== 'undefined' && window.FileReader)
    ? window.FileReader
    : (typeof FileReader !== 'undefined' ? FileReader : null);

const STORAGE_KEY = 'character_dnd_v21';

import DND_RULES from "./dnd-data/dnd-rules.json";
import CHARACTER_DATA from "./character.json";
import CLASS_COMPENDIUM from "./dnd-data/class-compendium.json";
import BACKGROUND_COMPENDIUM from "./dnd-data/background-compendium.json";
import SPELL_COMPENDIUM_RAW from "./dnd-data/spell-compendium.json";

const DND_CONDITIONS = DND_RULES.conditions;
const DAMAGE_TYPES = DND_RULES.damageTypes;
const SPELL_SLOTS_TABLES = DND_RULES.spellSlotsTables;
const SUBCLASS_ALIASES = Object.fromEntries(
    Object.entries(CLASS_COMPENDIUM).filter(([, v]) => v.subclassAliases).map(([k, v]) => [k, v.subclassAliases])
);
const CLASS_FEATURES_SYNC = Object.fromEntries(
    Object.entries(CLASS_COMPENDIUM).filter(([, v]) => v.featuresSync).map(([k, v]) => [k, v.featuresSync])
);

export { DND_CONDITIONS, DAMAGE_TYPES };

const SPELL_SOURCES = [SPELL_COMPENDIUM_RAW];

const DND_5E_SKILLS = [
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

function normalizeKey(str) {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

function capitalizeWord(str) {
    if (!str) return '';
    const s = String(str).trim();
    if (!s) return '';
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

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

function resolveSubclassInfo(className, subclassName) {
    if (!subclassName) return null;
    const normSub = normalizeKey(subclassName);
    const normClass = normalizeKey(className || '');

    // 1. Direct class block check
    const classBlock = SUBCLASS_ALIASES[normClass];
    if (classBlock) {
        for (const subKey of Object.keys(classBlock)) {
            const entry = classBlock[subKey];
            if (normalizeKey(subKey) === normSub || normalizeKey(entry.name || '') === normSub) {
                return { key: subKey, name: entry.name, displayName: entry.name, specialization: null };
            }
            if (entry.specializations) {
                for (const specKey of Object.keys(entry.specializations)) {
                    const spec = entry.specializations[specKey];
                    if (normalizeKey(specKey) === normSub || normalizeKey(spec.displayName || '') === normSub || normSub.includes(normalizeKey(specKey))) {
                        return {
                            key: subKey,
                            name: entry.name,
                            displayName: spec.displayName || `${entry.name} (${specKey})`,
                            specialization: specKey,
                            specInfo: spec
                        };
                    }
                }
            }
        }
    }

    // 2. Global search across all classes in SUBCLASS_ALIASES
    for (const cKey of Object.keys(SUBCLASS_ALIASES)) {
        const cBlock = SUBCLASS_ALIASES[cKey];
        for (const subKey of Object.keys(cBlock)) {
            const entry = cBlock[subKey];
            if (normalizeKey(subKey) === normSub || normalizeKey(entry.name || '') === normSub) {
                return { classKey: cKey, key: subKey, name: entry.name, displayName: entry.name, specialization: null };
            }
            if (entry.specializations) {
                for (const specKey of Object.keys(entry.specializations)) {
                    const spec = entry.specializations[specKey];
                    if (normalizeKey(specKey) === normSub || normalizeKey(spec.displayName || '') === normSub || normSub.includes(normalizeKey(specKey))) {
                        return {
                            classKey: cKey,
                            key: subKey,
                            name: entry.name,
                            displayName: spec.displayName || `${entry.name} (${specKey})`,
                            specialization: specKey,
                            specInfo: spec
                        };
                    }
                }
            }
        }
    }

    return null;
}

function findCompendiumSubclass(classObj, subclassName, className = '') {
    if (!classObj || !classObj.subclasses || !subclassName) return null;
    const normSub = normalizeKey(subclassName);
    if (!normSub) return null;

    const resolved = resolveSubclassInfo(className || classObj.name, subclassName);
    const canonicalSub = resolved ? resolved.key : normSub;

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

    return subKey ? { key: subKey, obj: subclasses[subKey], resolved } : null;
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

function calculateExpectedSlots(classes = []) {
    const list = [];
    const pactCasters = [];
    const nonPactCasters = [];

    classes.forEach(c => {
        const lvl = parseInt(c?.level, 10) || 0;
        if (lvl <= 0) return;
        const found = findCompendiumClass(c?.name);
        let casterType = found?.obj?.spellcasting?.casterType;
        if (!casterType && c?.subclass) {
            const foundSub = findCompendiumSubclass(found?.obj, c.subclass, c.name);
            casterType = foundSub?.spellcasting?.casterType;
        }

        if (casterType === 'pact') {
            pactCasters.push({ name: c.name, level: lvl });
        } else if (casterType) {
            nonPactCasters.push({ type: casterType, name: c.name, level: lvl });
        }
    });

    pactCasters.forEach(pc => {
        const pLvl = Math.min(20, Math.max(1, pc.level));
        const pInfo = SPELL_SLOTS_TABLES.warlockPactSlots?.[pLvl];
        if (pInfo) {
            list.push({
                id: 'pact',
                level: `Pact (${capitalizeWord(pc.name)} ${pLvl})`,
                max: pInfo.count,
                reset: 'short'
            });
        }
    });

    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
    if (nonPactCasters.length === 1) {
        const caster = nonPactCasters[0];
        const lvl = Math.min(20, Math.max(1, caster.level));
        const tableMap = {
            full: SPELL_SLOTS_TABLES.fullCaster,
            half: SPELL_SLOTS_TABLES.halfCaster,
            artificer: SPELL_SLOTS_TABLES.artificer,
            third: SPELL_SLOTS_TABLES.thirdCaster
        };
        const counts = tableMap[caster.type]?.[lvl] || [];
        const classTag = ` (${capitalizeWord(caster.name)})`;
        counts.forEach((max, idx) => {
            if (max > 0) {
                list.push({
                    id: `lvl${idx + 1}`,
                    level: `${ordinals[idx]} Level${classTag}`,
                    max: max,
                    reset: 'long'
                });
            }
        });
    } else if (nonPactCasters.length > 1) {
        let combinedLvl = 0;
        nonPactCasters.forEach(c => {
            if (c.type === 'full') combinedLvl += c.level;
            else if (c.type === 'half') combinedLvl += Math.floor(c.level / 2);
            else if (c.type === 'artificer') combinedLvl += Math.ceil(c.level / 2);
            else if (c.type === 'third') combinedLvl += Math.floor(c.level / 3);
        });
        if (combinedLvl > 0) {
            const counts = SPELL_SLOTS_TABLES.multiclassSpellSlots?.[Math.min(20, combinedLvl)] || [];
            counts.forEach((max, idx) => {
                if (max > 0) {
                    list.push({
                        id: `lvl${idx + 1}`,
                        level: `${ordinals[idx]} Level`,
                        max: max,
                        reset: 'long'
                    });
                }
            });
        }
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

function resolveDiceScale(className, scaleName, level) {
    const found = findCompendiumClass(className);
    const scale = found?.obj?.diceScales?.[scaleName];
    if (!scale || level <= 0) return null;

    let currentDie = null;
    const thresholds = Object.keys(scale).map(Number).sort((a, b) => a - b);
    for (const threshold of thresholds) {
        if (level >= threshold) currentDie = scale[threshold];
    }
    return currentDie;
}

function resolveBardicDie(d) {
    const classes = d?.identity?.classes || [];
    const bard = classes.find(c => (findCompendiumClass(c?.name)?.key || normalizeKey(c?.name)) === 'bard');
    const lvl = bard ? (parseInt(bard.level, 10) || 0) : 0;
    return resolveDiceScale('bard', 'bardicDie', lvl) || '1d6';
}

function detectClassFeaturesToSync(d) {
    const classes = d?.identity?.classes || [];
    const newResources = [];
    const newTraits = [];
    const staleResourceIds = new Set();
    const staleTraitNames = new Set();
    const existingResourceIds = new Set((d.combat?.resources || []).map(r => r.id));
    const existingTraitNames = new Set((d.combat?.traits || []).map(t => normalizeKey(t.name)));

    classes.forEach(cls => {
        const found = findCompendiumClass(cls.name);
        const classKey = found?.key || normalizeKey(cls.name);
        const currentLvl = parseInt(cls.level, 10) || 1;

        const classRules = CLASS_FEATURES_SYNC?.[classKey];
        if (!classRules) return;

        // 1. Base class features
        if (classRules.base) {
            (classRules.base.traits || []).forEach(trait => {
                const reqLvl = trait.minLevel || 1;
                const traitNorm = normalizeKey(trait.name);
                if (currentLvl >= reqLvl && !existingTraitNames.has(traitNorm)) {
                    newTraits.push(JSON.parse(JSON.stringify(trait)));
                    existingTraitNames.add(traitNorm);
                } else if (currentLvl < reqLvl && existingTraitNames.has(traitNorm)) {
                    staleTraitNames.add(traitNorm);
                }
            });
            (classRules.base.resources || []).forEach(res => {
                const reqLvl = res.minLevel || 1;
                if (currentLvl >= reqLvl && !existingResourceIds.has(res.id)) {
                    newResources.push(JSON.parse(JSON.stringify(res)));
                    existingResourceIds.add(res.id);
                } else if (currentLvl < reqLvl && existingResourceIds.has(res.id)) {
                    staleResourceIds.add(res.id);
                }
            });
        }

        // 2. Subclass features
        if (cls.subclass && classRules.subclasses) {
            const resolvedSub = resolveSubclassInfo(cls.name, cls.subclass);
            const targetSubKey = resolvedSub?.key || normalizeKey(cls.subclass || '');
            const matchingSubKey = Object.keys(classRules.subclasses).find(sk => {
                const normSk = normalizeKey(sk);
                return normSk === targetSubKey || targetSubKey.includes(normSk) || normSk.includes(targetSubKey);
            });

            if (matchingSubKey && classRules.subclasses[matchingSubKey]) {
                const subData = classRules.subclasses[matchingSubKey];
                (subData.traits || []).forEach(trait => {
                    const reqLvl = trait.minLevel || 1;
                    const traitNorm = normalizeKey(trait.name);
                    if (currentLvl >= reqLvl && !existingTraitNames.has(traitNorm)) {
                        newTraits.push(JSON.parse(JSON.stringify(trait)));
                        existingTraitNames.add(traitNorm);
                    } else if (currentLvl < reqLvl && existingTraitNames.has(traitNorm)) {
                        staleTraitNames.add(traitNorm);
                    }
                });
                (subData.resources || []).forEach(res => {
                    const reqLvl = res.minLevel || 1;
                    if (currentLvl >= reqLvl && !existingResourceIds.has(res.id)) {
                        newResources.push(JSON.parse(JSON.stringify(res)));
                        existingResourceIds.add(res.id);
                    } else if (currentLvl < reqLvl && existingResourceIds.has(res.id)) {
                        staleResourceIds.add(res.id);
                    }
                });
            }
        }
    });

    return { newResources, newTraits, staleResourceIds, staleTraitNames };
}

function getResourceMaxUses(res, attributes, pb = 2) {
    if (typeof res?.uses === 'number' && res.uses > 0) return res.uses;
    if (res?.usesKey) {
        const u = String(res.usesKey).toUpperCase();
        if (u === 'PB') return Math.max(1, pb);
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
    d.identity.classes = d.identity.classes.map(c => ({
        ...c,
        name: capitalizeWord(c.name || "Character"),
        subclass: c.subclass ? capitalizeWord(c.subclass) : ''
    }));

    const totalHd = d.identity.classes.reduce((a, b) => a + (b.level || 0), 0) || 1;
    const pb = Math.floor((totalHd - 1) / 4) + 2;

    if (!Array.isArray(d.vitals.hitDiceSpent)) d.vitals.hitDiceSpent = [];
    while (d.vitals.hitDiceSpent.length < totalHd) d.vitals.hitDiceSpent.push(false);
    if (d.vitals.hitDiceSpent.length > totalHd) d.vitals.hitDiceSpent = d.vitals.hitDiceSpent.slice(0, totalHd);

    if (!d.deathSaves || !Array.isArray(d.deathSaves.successes) || !Array.isArray(d.deathSaves.failures)) {
        d.deathSaves = { successes: [false, false, false], failures: [false, false, false] };
    }
    if (!d.concentration) d.concentration = { active: false, spellName: "" };
    if (!Array.isArray(d.conditions)) d.conditions = [];
    d.conditions = d.conditions.map(c => {
        if (typeof c === 'string') return { id: c, source: 'General' };
        if (c && typeof c === 'object' && c.id) return { id: c.id, source: c.source || 'General' };
        return null;
    }).filter(Boolean);
    if (!Array.isArray(d.sessionLog)) d.sessionLog = [];
    if (!Array.isArray(d.combat.resources)) d.combat.resources = [];
    if (!Array.isArray(d.combat.traits)) d.combat.traits = [];

    d.combat.resources.forEach(r => {
        const uses = getResourceMaxUses(r, d.attributes, pb);
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

function resolveGenieDamage(d, pb) {
    const traits = d?.combat?.traits || [];
    const genieTrait = traits.find(t => normalizeKey(t.name).includes('genieswrath'));

    const classes = d?.identity?.classes || [];
    const warlockClass = classes.find(c => normalizeKey(c.name) === 'warlock');
    const resolvedSub = warlockClass ? resolveSubclassInfo('warlock', warlockClass.subclass) : null;

    if (!genieTrait && (!resolvedSub || resolvedSub.key !== 'genie')) return null;

    let dmgType = resolvedSub?.specInfo?.damageType;
    if (!dmgType && genieTrait) {
        const text = `${genieTrait.badge || ''} ${genieTrait.desc || ''}`;
        const foundDt = DAMAGE_TYPES.find(dt => new RegExp(`\\b${dt.name}\\b`, 'i').test(text));
        dmgType = foundDt ? foundDt.name : 'Elemental';
    }
    if (!dmgType) dmgType = 'Elemental';

    return `+${pb} ${dmgType} damage`;
}


function getAllEquippedItems(d) {
    if (!d || !d.inventory) return [];
    return [
        ...(d.inventory.armors || []),
        ...(d.inventory.story || []),
        ...(d.inventory.weapons || [])
    ].filter(a => a && a.equipped);
}

function resolveCharacterResistances(d) {
    const map = new Map();

    const addRes = (idOrName, source) => {
        const norm = normalizeKey(idOrName);
        if (!norm) return;
        const dt = DAMAGE_TYPES.find(t => normalizeKey(t.id) === norm || normalizeKey(t.name) === norm);
        const id = dt ? dt.id : norm;
        const name = dt ? dt.name : (idOrName.charAt(0).toUpperCase() + idOrName.slice(1));
        const icon = dt ? dt.icon : '🛡️';

        if (!map.has(id)) {
            map.set(id, { id, name, icon, sources: [source] });
        } else {
            const entry = map.get(id);
            if (!entry.sources.includes(source)) {
                entry.sources.push(source);
            }
        }
    };

    // 1. Explicit array in d.vitals.damageResistances if defined
    if (Array.isArray(d?.vitals?.damageResistances)) {
        d.vitals.damageResistances.forEach(r => addRes(r, 'Character Sheet / Race'));
    }

    // 2. Scan combat traits (e.g. Tiefling Infernal Resistance, class features)
    const traits = d?.combat?.traits || [];
    traits.forEach(t => {
        const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
        DAMAGE_TYPES.forEach(dt => {
            const typeName = dt.id;
            const reg = new RegExp(`(?:resistance|resistant)\\s+to\\s+[^.]*?\\b${typeName}\\b`, 'i');
            if (reg.test(text)) {
                addRes(dt.id, t.name || 'Trait');
            }
        });
    });

    // 3. Scan all equipped items (armors, accessories, story items, weapons)
    const allEquipped = getAllEquippedItems(d);

    allEquipped.forEach(item => {
        const itemRes = Array.isArray(item.resistances) ? item.resistances : [];
        itemRes.forEach(r => {
            addRes(r, item.name || 'Equipment');
        });
    });

    return Array.from(map.values()).map(r => ({
        ...r,
        source: r.sources.join(', ')
    }));
}

function resolveClassHitDie(cls) {
    if (cls?.hitDie) return cls.hitDie;
    const found = findCompendiumClass(cls?.name);
    return found?.obj?.hitDie || 'd8';
}

function resolveSpellcastingAttrKey(d) {
    if (d?.magic?.spellcastingAttr) return String(d.magic.spellcastingAttr).toUpperCase();
    if (d?.identity?.spellcastingAbility) return String(d.identity.spellcastingAbility).toUpperCase();
    const classes = d?.identity?.classes || [];
    for (const cls of classes) {
        const found = findCompendiumClass(cls?.name);
        if (found?.obj?.spellcasting?.ability) {
            return String(found.obj.spellcasting.ability).toUpperCase();
        }
        if (cls?.subclass) {
            const sub = findCompendiumSubclass(found?.obj, cls.subclass, cls.name);
            if (sub?.spellcasting?.ability) {
                return String(sub.spellcasting.ability).toUpperCase();
            }
        }
    }
    return 'CHA';
}

function resolveSongOfRestDie(d) {
    const classes = d?.identity?.classes || [];
    const bardClass = classes.find(c => (findCompendiumClass(c?.name)?.key || normalizeKey(c?.name)) === 'bard');
    const bardLevel = bardClass ? (parseInt(bardClass.level, 10) || 0) : 0;
    const die = resolveDiceScale('bard', 'songOfRestDie', bardLevel);
    if (die) return die;

    if (hasCharacterFeature(d, ['songofrest'])) {
        return '1d6';
    }
    return null;
}

function computeStats(d) {
    const classes = d?.identity?.classes || [];
    const totalLevel = classes.reduce((acc, c) => acc + (c.level || 0), 0) || 1;
    const pb = Math.floor((totalLevel - 1) / 4) + 2;

    const hasJackOfAllTrades = hasCharacterFeature(d, ['jackofalltrades']);
    const jackOfAllTrades = hasJackOfAllTrades ? Math.floor(pb / 2) : 0;

    const allEquipped = getAllEquippedItems(d);

    const attrKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    const computedAttrs = {};
    attrKeys.forEach(k => {
        let raw = d?.attributes?.[k] || { score: 10, profSave: false };
        let baseScore = typeof raw.score === 'number' ? raw.score : (parseInt(raw.score, 10) || 10);
        let bonusFromItems = 0;
        let itemSaveBonus = 0;
        let hasAttrAdvantage = false;
        let attrAdvantageSources = [];
        let hasSaveAdvantage = false;
        let saveAdvantageSources = [];

        allEquipped.forEach(item => {
            const sb = item.statBonuses;
            if (sb) {
                if (sb[k]) bonusFromItems += parseInt(sb[k], 10) || 0;
                if (sb.attr === k) {
                    if (sb.attrMode === 'advantage') {
                        hasAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    } else if (sb.attrVal) {
                        bonusFromItems += parseInt(sb.attrVal, 10) || 0;
                    }
                }

                const saveType = (sb.saveType || 'all').toUpperCase();
                const saveVal = parseInt(sb.saveVal, 10) || 0;
                const isTargetSave = saveType === 'ALL' || saveType === k;
                if (isTargetSave) {
                    if (sb.saveMode === 'advantage') {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    } else if (saveVal) {
                        itemSaveBonus += saveVal;
                    }
                }
            }

            // Direct advantage arrays on items
            if (Array.isArray(item.advantageAttrs)) {
                item.advantageAttrs.forEach(a => {
                    if (String(a).toUpperCase() === k) {
                        hasAttrAdvantage = true;
                        attrAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }
            if (Array.isArray(item.advantageSaves)) {
                item.advantageSaves.forEach(s => {
                    const su = String(s).toUpperCase();
                    if (su === 'ALL' || su === k) {
                        hasSaveAdvantage = true;
                        saveAdvantageSources.push(item.name || 'Equipment');
                    }
                });
            }
        });

        const score = baseScore + bonusFromItems;
        const mod = Math.floor((score - 10) / 2);
        const save = mod + (raw.profSave ? pb : 0) + itemSaveBonus;
        computedAttrs[k] = {
            score,
            baseScore,
            bonusFromItems,
            mod,
            modStr: mod >= 0 ? `+${mod}` : `${mod}`,
            save,
            saveStr: save >= 0 ? `+${save}` : `${save}`,
            profSave: !!raw.profSave,
            itemSaveBonus,
            hasAttrAdvantage,
            attrAdvantageSources: [...new Set(attrAdvantageSources)],
            hasSaveAdvantage,
            saveAdvantageSources: [...new Set(saveAdvantageSources)]
        };
    });

    const hasSilverTongue = hasCharacterFeature(d, ['silvertongue']);
    const hasReliableTalent = hasCharacterFeature(d, ['reliabletalent', 'reliable talent']);

    const computedSkills = (d?.skills || []).map(s => {
        const attrObj = computedAttrs[s.attr] || { mod: 0 };
        let bonus = attrObj.mod;
        if (s.profType === 'P') bonus += pb * 2;
        else if (s.profType === 'C') bonus += pb;
        else bonus += jackOfAllTrades;

        const isSilverTongueSkill = hasSilverTongue && (s.id === 'persuasion' || s.id === 'deception');
        const isReliableTalentSkill = hasReliableTalent && (s.profType === 'C' || s.profType === 'P');
        const applyMinTen = s.minTen !== undefined ? !!s.minTen : (isSilverTongueSkill || isReliableTalentSkill);
        let minTenSource = '';
        let minTenDesc = '';
        if (applyMinTen) {
            if (isSilverTongueSkill) {
                minTenSource = 'Silver Tongue (Eloquence Bard)';
                minTenDesc = `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else if (isReliableTalentSkill) {
                minTenSource = 'Reliable Talent (Rogue)';
                minTenDesc = `Any d20 roll of 9 or lower on proficient checks becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else if (s.minTenSource) {
                minTenSource = s.minTenSource;
                minTenDesc = s.minTenDesc || `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            } else {
                minTenSource = 'Reliable Talent / Feature';
                minTenDesc = `Any d20 roll of 9 or lower on the die becomes a 10 (Total roll: minimum ${10 + bonus}).`;
            }
        }

        // Advantage check:
        let hasAdvantage = false;
        let advantageSources = [];

        // Check base skill note if not an unequipped item note
        if (s.note && String(s.note).toLowerCase().includes('advantage')) {
            hasAdvantage = true;
            advantageSources.push(s.noteSource || 'Sheet Note');
        }

        // If parent ability check has advantage, all derived skill checks have advantage
        if (attrObj.hasAttrAdvantage) {
            hasAdvantage = true;
            advantageSources.push(...attrObj.attrAdvantageSources);
        }

        // Check all equipped items granting advantage on this skill
        allEquipped.forEach(item => {
            const advSkills = Array.isArray(item.advantageSkills) ? item.advantageSkills : [];
            const normSkillId = normalizeKey(s.id);
            const normSkillName = normalizeKey(s.name);
            const matches = advSkills.some(ask => {
                const n = normalizeKey(ask);
                return n === normSkillId || n === normSkillName;
            });
            if (matches) {
                hasAdvantage = true;
                if (!advantageSources.includes(item.name)) {
                    advantageSources.push(item.name || 'Equipment');
                }
            }
        });

        return {
            ...s,
            valNum: bonus,
            valStr: bonus >= 0 ? `+${bonus}` : `${bonus}`,
            minVal: applyMinTen ? (10 + bonus) : null,
            minTenSource,
            minTenDesc,
            hasAdvantage,
            advantageSources: [...new Set(advantageSources)]
        };
    });

    const percSkill = computedSkills.find(s => s.id === 'perception');
    const percAdvBonus = percSkill?.hasAdvantage ? 5 : 0;
    const passivePerception = 10 + (percSkill ? percSkill.valNum : (computedAttrs.WIS.mod + jackOfAllTrades)) + percAdvBonus;
    const initNum = computedAttrs.DEX.mod + jackOfAllTrades;
    const initDesc = hasJackOfAllTrades
        ? `DEX (${computedAttrs.DEX.modStr}) + Jack of All Trades (+${jackOfAllTrades})`
        : `DEX (${computedAttrs.DEX.modStr})`;

    let calculatedAc = 10 + computedAttrs.DEX.mod;
    let armorDesc = `10 + DEX (${computedAttrs.DEX.modStr})`;

    const equippedArmors = (d?.inventory?.armors || []).filter(a => a && a.equipped);
    const equippedStory = (d?.inventory?.story || []).filter(s => s && s.equipped);

    // Main armor must be light, medium, or heavy (or custom base body armor)
    const mainArmor = equippedArmors.find(a => ['light', 'medium', 'heavy'].includes(a.type) || (a.type !== 'shield' && a.type !== 'accessory' && (parseInt(a.baseAc, 10) || 0) >= 10));
    const equippedShield = equippedArmors.find(a => a.type === 'shield');
    // Magic accessories (cloaks, rings, amulets, wondrous items) that grant bonus AC (or 0 AC)
    const accessories = equippedArmors.filter(a => a !== mainArmor && a !== equippedShield);
    accessories.push(...equippedStory);

    if (mainArmor) {
        const bAc = parseInt(mainArmor.baseAc, 10) || 10;
        if (mainArmor.type === 'light') {
            calculatedAc = bAc + computedAttrs.DEX.mod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        } else if (mainArmor.type === 'medium') {
            calculatedAc = bAc + Math.min(2, computedAttrs.DEX.mod);
            armorDesc = `${mainArmor.name} (${bAc} + max 2)`;
        } else if (mainArmor.type === 'heavy') {
            calculatedAc = bAc;
            armorDesc = `${mainArmor.name} (${bAc})`;
        } else {
            // General custom armor base
            calculatedAc = bAc + computedAttrs.DEX.mod;
            armorDesc = `${mainArmor.name} (${bAc} + DEX)`;
        }
    }
    if (equippedShield) {
        const sBonus = parseInt(equippedShield.baseAc, 10) || 2;
        calculatedAc += sBonus;
        armorDesc += ` + ${equippedShield.name || 'Shield'} (+${sBonus})`;
    }
    accessories.forEach(acc => {
        const bonus = parseInt(acc.baseAc, 10) || 0;
        if (bonus > 0) {
            calculatedAc += bonus;
            armorDesc += ` + ${acc.name} (+${bonus})`;
        }
    });

    const computedWeapons = (d?.inventory?.weapons || []).map((w, idx) => {
        let usedAttr = 'STR';
        if (w.attrMode === 'dex') usedAttr = 'DEX';
        else if (w.attrMode === 'finesse') {
            usedAttr = (computedAttrs.DEX.mod >= computedAttrs.STR.mod) ? 'DEX' : 'STR';
        }

        const attrMod = (computedAttrs[usedAttr] || computedAttrs.STR).mod;
        const nameBonusMatch = (w.name || '').match(/\+(\d+)/);
        const nameBonus = nameBonusMatch ? parseInt(nameBonusMatch[1], 10) : 0;
        const magicBonus = parseInt(w.magicBonus !== undefined ? w.magicBonus : nameBonus, 10) || 0;
        const atkBonus = attrMod + (w.proficient !== false ? pb : 0) + magicBonus;
        const dmgMod = attrMod + magicBonus;
        let dmgModStr = '';
        if (dmgMod > 0) dmgModStr = `+${dmgMod}`;
        else if (dmgMod < 0) dmgModStr = `-${Math.abs(dmgMod)}`;
        const dmgStr = `${w.dice || ''} ${dmgModStr} ${w.damageType || ''}`.replace(/\s+/g, ' ').trim();

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
    let itemSpellDcBonus = 0;
    let itemSpellAtkBonus = 0;
    allEquipped.forEach(item => {
        const dcBonus = item.statBonuses?.spellDC !== undefined ? item.statBonuses.spellDC : item.statBonuses?.spellDc;
        if (dcBonus) itemSpellDcBonus += parseInt(dcBonus, 10) || 0;
        if (item.statBonuses?.spellAtk) itemSpellAtkBonus += parseInt(item.statBonuses.spellAtk, 10) || 0;
    });
    const spellAtkNum = spellAttrMod + pb + itemSpellAtkBonus;
    const spellDC = 8 + pb + spellAttrMod + itemSpellDcBonus;
    const bardicUses = Math.max(1, computedAttrs.CHA.mod);
    const hitDiceList = classes.map(c => `${c.level} ${resolveClassHitDie(c)}`).join(' + ');
    const songOfRestDie = resolveSongOfRestDie(d);
    const bardicDie = resolveBardicDie(d);

    const genieDamage = resolveGenieDamage(d, pb);
    const combatBadges = [];
    (d?.combat?.traits || []).forEach(t => {
        if (t.badge) {
            let badgeText = t.badge;
            badgeText = badgeText.replace(/\{\{PB\}\}/g, `+${pb}`);
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
        initStr: initNum >= 0 ? `+${initNum}` : `${initNum}`,
        initDesc,
        ac: calculatedAc,
        armorDesc,
        spellStat: spellcastingAttrKey,
        spellcastingAttrKey,
        spellAtkStr: spellAtkNum >= 0 ? `+${spellAtkNum}` : `${spellAtkNum}`,
        spellDC,
        genieDamage,
        combatBadges,
        songOfRestDie,
        bardicDie,
        bardicUses,
        hitDiceList,
        hitDiceBreakdown: classes.map(c => `${c.level} ${capitalizeWord(c.name)}`).join(' + '),
        classesSummary: classes.map(c => `${capitalizeWord(c.name)}${c.subclass ? ` (${capitalizeWord(c.subclass)})` : ''} ${c.level}`).join(' / '),
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
    if (multiplier > 1 && /5th level/i.test(comp?.desc || '')) {
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
        isFavorite: !!charSpell.favorite,
        isItemGranted: !!charSpell.isItemGranted || charSpell.sourceType === 'item',
        desc: finalDesc
    };
}

// ================= COMPONENTE ALPINE.JS =================
document.addEventListener('alpine:init', () => {
    Alpine.data('characterSheet', () => ({
        data: loadInitialData(),
        activeTab: 'profile',
        currentSpellFilter: 'all',
        showFullSpellbook: false,
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

        equipRevision: 0,
        selectedSpellToAdd: '',
        selectedResToAdd: '',
        selectedSkillAdvToAdd: '',
        storySpellToAdd: '',
        storyResToAdd: '',
        storySkillAdvToAdd: '',

        modalArmorOpen: false,
        editingArmorIndex: null,
        armorForm: {
            name: '',
            type: 'light',
            baseAc: 12,
            stealthDisadv: false,
            special: '',
            grantedSpells: [],
            resistances: [],
            bonusAttr: '',
            attrMode: 'bonus', // 'bonus' | 'advantage'
            bonusAttrVal: 0,
            saveType: '',
            saveMode: 'bonus', // 'bonus' | 'advantage'
            saveVal: 0,
            advantageSkills: [],
            equipped: false
        },

        modalShortRestOpen: false,
        shortRestDiceSelected: 0,
        shortRestClassIndex: 0,

        modalConcOverrideOpen: false,
        pendingConcentrationSpell: null,

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
        storyItemForm: {
            name: '',
            desc: '',
            isSpecial: false,
            isMagic: true,
            equipped: false,
            grantedSpells: [],
            resistances: [],
            bonusAttr: '',
            attrMode: 'bonus', // 'bonus' | 'advantage'
            bonusAttrVal: 0,
            saveType: '',
            saveMode: 'bonus', // 'bonus' | 'advantage'
            saveVal: 0,
            advantageSkills: []
        },

        modalToolOpen: false,
        editingToolIndex: null,
        toolForm: { name: '', desc: '', icon: '🎒', isInstrument: false },

        // Spell Management Modal
        modalSpellAddOpen: false,
        spellAddTab: 'compendium', // 'compendium' | 'manual'
        spellCompendiumSearch: '',
        spellCompendiumLevelFilter: 'all',
        selectedCompendiumSpell: null,
        spellCompendiumSource: 'Class',
        spellManualForm: {
            name: '',
            level: 1,
            actionType: 'action',
            range: '60 ft.',
            duration: 'Instantaneous',
            damage: '',
            conc: false,
            desc: '',
            source: 'Class'
        },

        // Level Up & Character Sheet Modal
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
            const _rev = this.equipRevision;
            return computeStats(this.data);
        },

        get allCompendiumSpellsList() {
            if (!spellsCompendium || spellsCompendium.length === 0) {
                buildSpellsCompendium();
            }
            return [...spellsCompendium].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );
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
            const _rev = this.equipRevision;
            const bardicDie = this.stats.bardicDie || '1d8';
            const pb = this.stats.pb || 2;
            const vesselHours = pb * 2;
            const equippedItemNames = new Set((this.allEquipped || []).map(i => normalizeKey(i.name)));

            return (this.data.combat?.resources || []).map((r, idx) => {
                if (r.sourceItem && !equippedItemNames.has(normalizeKey(r.sourceItem))) {
                    return null;
                }

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

        get allEquipped() {
            return getAllEquippedItems(this.data);
        },

        get computedTraits() {
            const bardicDie = this.stats.bardicDie || '1d8';
            const pb = this.stats.pb || 3;
            const songOfRestDie = this.stats.songOfRestDie || '1d6';
            const spellDC = this.stats.spellDC || 15;
            const spellAtk = this.stats.spellAtkStr || '+7';
            const vesselHours = pb * 2;

            return (this.data.combat?.traits || []).map((t, idx) => {
                let displayName = t.name || '';
                let displayDesc = t.desc || '';

                // Dynamic placeholder interpolation (strictly standardized canonical tokens)
                displayDesc = displayDesc
                    .replace(/\{\{PB\}\}/g, `+${pb}`)
                    .replace(/\{\{DC\}\}/g, `${spellDC}`)
                    .replace(/\{\{spellAtk\}\}/g, `${spellAtk}`)
                    .replace(/\{\{bardicDie\}\}/g, bardicDie)
                    .replace(/\{\{songOfRestDie\}\}/g, songOfRestDie)
                    .replace(/\{\{vesselHours\}\}/g, `${vesselHours}`);

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
            const _rev = this.equipRevision;
            const totalLevel = this.stats.totalLevel;
            const maxSlot = this.maxSlotLevel;
            const spellAttrKey = this.stats.spellStat || this.stats.spellcastingAttrKey || 'CHA';
            const spellAttrMod = (this.stats.computedAttrs?.[spellAttrKey] || this.stats.computedAttrs?.CHA)?.mod ?? 0;

            // 1. Spells defined on the character (exclude any static sourceType === 'item')
            const list = (this.data.magic?.spells || []).filter(sp => sp && sp.sourceType !== 'item');
            const seen = new Set(list.map(s => normalizeKey(s.name)));

            // 2. Spells dynamically granted by ALL EQUIPPED armors / accessories / story items / weapons
            const allEquipped = this.allEquipped;

            allEquipped.forEach(item => {
                const granted = Array.isArray(item.grantedSpells) ? item.grantedSpells : [];
                granted.forEach(spellName => {
                    const cleanName = String(spellName).trim();
                    const norm = normalizeKey(cleanName);
                    if (cleanName && !seen.has(norm)) {
                        seen.add(norm);
                        list.push({
                            name: cleanName,
                            source: item.name,
                            sourceType: 'item',
                            isItemGranted: true
                        });
                    }
                });
            });

            return list.map(sp => {
                const resolved = resolveSpellData(sp, totalLevel, maxSlot, spellAttrMod);
                resolved.isFavorite = this.isSpellFavorite(sp.name);
                resolved.isItemGranted = !!sp.isItemGranted || sp.sourceType === 'item';
                return resolved;
            });
        },

        get favoriteSpells() {
            const list = this.allResolvedSpells.filter(sp => sp.isFavorite);
            return this.sortSpellsByCategory(list);
        },

        sortSpellsByCategory(spellsList) {
            const getCategoryRank = (sp) => {
                const hasDamage = sp.damage && sp.damage !== '—';
                if (hasDamage) return 1;    // 1: Damage
                if (sp.isHealing) return 2;  // 2: Heal
                return 3;                   // 3: Utility
            };

            return [...spellsList].sort((a, b) => {
                const rankA = getCategoryRank(a);
                const rankB = getCategoryRank(b);
                if (rankA !== rankB) return rankA - rankB;
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
            });
        },

        get combatSpells() {
            return this.favoriteSpells;
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
            if (!Array.isArray(this.data.conditions)) return [];
            return this.data.conditions.map(entry => {
                const id = typeof entry === 'string' ? entry : entry.id;
                const source = (typeof entry === 'object' && entry && entry.source) ? entry.source : '';
                const condObj = this.allConditions.find(c => c.id === id);
                if (!condObj) return null;
                return {
                    ...condObj,
                    source: source || 'General / Unknown'
                };
            }).filter(Boolean);
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

        get dynamicBonusActions() {
            const list = [];
            const seen = new Set();

            // 1. From tactical resources
            (this.data.combat?.resources || []).forEach(r => {
                const cost = (r.actionCost || '').toLowerCase();
                if (cost.includes('bonus')) {
                    const key = normalizeKey(r.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: r.name,
                            desc: r.desc || (r.usesKey ? `Expend 1 use (${r.reset} reset).` : 'Bonus action resource.')
                        });
                    }
                }
            });

            // 2. From traits
            (this.data.combat?.traits || []).forEach(t => {
                const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
                if (text.includes('bonus action') || (t.actionCost && t.actionCost.toLowerCase().includes('bonus'))) {
                    const key = normalizeKey(t.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: t.name,
                            desc: t.desc || 'Bonus action feature.'
                        });
                    }
                }
            });

            // 3. From equipped items
            (this.allEquipped || []).forEach(item => {
                const text = `${item.name || ''} ${item.desc || ''} ${item.notes || ''} ${item.properties || ''} ${item.special || ''}`.toLowerCase();
                const cost = (item.actionCost || '').toLowerCase();
                if (cost.includes('bonus') || text.includes('bonus action') || text.includes('as a bonus action')) {
                    const key = normalizeKey(item.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: item.name,
                            desc: item.desc || item.special || item.notes || 'Equipped item bonus action.'
                        });
                    }
                }
            });

            return list;
        },

        get dynamicReactionActions() {
            const list = [];
            const seen = new Set();

            // 1. From tactical resources
            (this.data.combat?.resources || []).forEach(r => {
                const cost = (r.actionCost || '').toLowerCase();
                if (cost.includes('reaction')) {
                    const key = normalizeKey(r.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: r.name,
                            desc: r.desc || (r.usesKey ? `Expend 1 use (${r.reset} reset).` : 'Reaction resource.')
                        });
                    }
                }
            });

            // 2. From traits
            (this.data.combat?.traits || []).forEach(t => {
                const text = `${t.name || ''} ${t.desc || ''}`.toLowerCase();
                if (text.includes('reaction:') || text.includes('as a reaction') || (t.actionCost && t.actionCost.toLowerCase().includes('reaction'))) {
                    const key = normalizeKey(t.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: t.name,
                            desc: t.desc || 'Reaction feature.'
                        });
                    }
                }
            });

            // 3. From equipped items
            (this.allEquipped || []).forEach(item => {
                const text = `${item.name || ''} ${item.desc || ''} ${item.notes || ''} ${item.properties || ''} ${item.special || ''}`.toLowerCase();
                const cost = (item.actionCost || '').toLowerCase();
                if (cost.includes('reaction') || text.includes('reaction:') || text.includes('as a reaction')) {
                    const key = normalizeKey(item.name);
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({
                            name: item.name,
                            desc: item.desc || item.special || item.notes || 'Equipped item reaction.'
                        });
                    }
                }
            });

            return list;
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

        get shortRestHealingBonus() {
            if (this.stats.songOfRestDie) {
                return { name: "Song of Rest", die: this.stats.songOfRestDie };
            }
            const feat = (this.data.combat?.traits || []).find(t => /short rest.*extra.*(?:hp|hit points)/i.test(t.desc || ''));
            if (feat) {
                return { name: feat.name, die: '1d6' };
            }
            return null;
        },

        get primaryHitDie() {
            return resolveClassHitDie(this.data.identity?.classes?.[0]);
        },

        get shortRestSelectedHitDie() {
            const cls = this.data.identity?.classes?.[this.shortRestClassIndex] || this.data.identity?.classes?.[0];
            return resolveClassHitDie(cls) || 'd8';
        },

        getClassHitDie(cls) {
            return resolveClassHitDie(cls) || 'd8';
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
                name: capitalizeWord(cls.name),
                subclass: cls.subclass ? capitalizeWord(cls.subclass) : '',
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

        // Persistence
        saveState() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (e) {
                console.error("[Storage] Error saving state:", e);
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

        openSpellDetail(spell) {
            if (!spell) return;
            const meta = [];
            meta.push(spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`);
            meta.push(spell.actionType === 'bonus' ? 'Bonus Action' : (spell.actionType === 'reaction' ? 'Reaction' : 'Action'));
            if (spell.range) meta.push(`Range: ${spell.range}`);
            if (spell.duration) meta.push(`Duration: ${spell.duration}`);
            if (spell.useSpellDc) meta.push(`Save: ${spell.saveStat || ''} (DC ${this.stats.spellDC})`);
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

        // Armor, Protection & Magic Accessories
        openArmorModal(index = null) {
            this.editingArmorIndex = index;
            this.selectedSpellToAdd = '';
            this.selectedResToAdd = '';
            this.selectedSkillAdvToAdd = '';
            if (index !== null && this.data.inventory?.armors?.[index]) {
                const a = this.data.inventory.armors[index];
                this.armorForm = {
                    name: a.name || '',
                    type: a.type || 'light',
                    baseAc: a.baseAc !== undefined ? a.baseAc : 12,
                    stealthDisadv: !!a.stealthDisadv,
                    special: a.special || '',
                    grantedSpells: Array.isArray(a.grantedSpells) ? [...a.grantedSpells] : [],
                    resistances: Array.isArray(a.resistances) ? [...a.resistances] : [],
                    bonusAttr: a.statBonuses?.attr || '',
                    attrMode: a.statBonuses?.attrMode || (a.statBonuses?.attrVal ? 'bonus' : 'advantage'),
                    bonusAttrVal: a.statBonuses?.attrVal || 0,
                    saveType: a.statBonuses?.saveType || '',
                    saveMode: a.statBonuses?.saveMode || (a.statBonuses?.saveVal ? 'bonus' : 'advantage'),
                    saveVal: a.statBonuses?.saveVal || 0,
                    advantageSkills: Array.isArray(a.advantageSkills) ? [...a.advantageSkills] : [],
                    equipped: a.equipped !== undefined ? !!a.equipped : false
                };
            } else {
                this.armorForm = {
                    name: '',
                    type: 'light',
                    baseAc: 12,
                    stealthDisadv: false,
                    special: '',
                    grantedSpells: [],
                    resistances: [],
                    bonusAttr: '',
                    attrMode: 'bonus',
                    bonusAttrVal: 0,
                    saveType: '',
                    saveMode: 'bonus',
                    saveVal: 0,
                    advantageSkills: [],
                    equipped: false
                };
            }
            this.modalArmorOpen = true;
        },

        addSpellToArmorForm() {
            const sp = (this.selectedSpellToAdd || '').trim();
            if (!sp) return;
            if (!Array.isArray(this.armorForm.grantedSpells)) this.armorForm.grantedSpells = [];
            if (!this.armorForm.grantedSpells.includes(sp)) {
                this.armorForm.grantedSpells.push(sp);
            }
            this.selectedSpellToAdd = '';
        },

        removeSpellFromArmorForm(idx) {
            if (Array.isArray(this.armorForm.grantedSpells)) {
                this.armorForm.grantedSpells.splice(idx, 1);
            }
        },

        addResToArmorForm() {
            const res = (this.selectedResToAdd || '').trim();
            if (!res) return;
            if (!Array.isArray(this.armorForm.resistances)) this.armorForm.resistances = [];
            if (!this.armorForm.resistances.includes(res)) {
                this.armorForm.resistances.push(res);
            }
            this.selectedResToAdd = '';
        },

        removeResFromArmorForm(idx) {
            if (Array.isArray(this.armorForm.resistances)) {
                this.armorForm.resistances.splice(idx, 1);
            }
        },

        addSkillAdvToArmorForm() {
            const sk = (this.selectedSkillAdvToAdd || '').trim();
            if (!sk) return;
            if (!Array.isArray(this.armorForm.advantageSkills)) this.armorForm.advantageSkills = [];
            if (!this.armorForm.advantageSkills.includes(sk)) {
                this.armorForm.advantageSkills.push(sk);
            }
            this.selectedSkillAdvToAdd = '';
        },

        removeSkillAdvFromArmorForm(idx) {
            if (Array.isArray(this.armorForm.advantageSkills)) {
                this.armorForm.advantageSkills.splice(idx, 1);
            }
        },

        handleSaveArmor() {
            const name = this.armorForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.armors)) this.data.inventory.armors = [];

            const isEdit = this.editingArmorIndex !== null;
            const existing = isEdit ? this.data.inventory.armors[this.editingArmorIndex] : null;

            const parsedAc = parseInt(this.armorForm.baseAc, 10);
            const baseAc = isNaN(parsedAc) ? (this.armorForm.type === 'shield' ? 2 : (this.armorForm.type === 'accessory' ? 0 : 10)) : Math.max(0, parsedAc);

            const grantedSpells = [...(this.armorForm.grantedSpells || [])];
            const resistances = [...(this.armorForm.resistances || [])];
            const advantageSkills = [...(this.armorForm.advantageSkills || [])];

            const statBonuses = {};
            if (this.armorForm.bonusAttr) {
                statBonuses.attr = this.armorForm.bonusAttr;
                statBonuses.attrMode = this.armorForm.attrMode || 'bonus';
                if (statBonuses.attrMode === 'bonus') {
                    const val = parseInt(this.armorForm.bonusAttrVal, 10) || 0;
                    if (val) {
                        statBonuses[this.armorForm.bonusAttr] = val;
                        statBonuses.attrVal = val;
                    }
                }
            }
            if (this.armorForm.saveType) {
                statBonuses.saveType = this.armorForm.saveType;
                statBonuses.saveMode = this.armorForm.saveMode || 'bonus';
                if (statBonuses.saveMode === 'bonus') {
                    const saveVal = parseInt(this.armorForm.saveVal, 10) || 0;
                    if (saveVal) {
                        statBonuses.saveVal = saveVal;
                    }
                }
            }

            const armorObj = {
                name,
                type: this.armorForm.type,
                baseAc,
                stealthDisadv: !!this.armorForm.stealthDisadv,
                equipped: existing ? !!existing.equipped : (this.armorForm.equipped || false),
                special: this.armorForm.special.trim(),
                grantedSpells,
                resistances,
                advantageSkills,
                statBonuses
            };

            if (isEdit) {
                this.data.inventory.armors[this.editingArmorIndex] = armorObj;
            } else {
                this.data.inventory.armors.push(armorObj);
            }

            this.equipRevision++;
            this.saveState();
            this.modalArmorOpen = false;
            this.editingArmorIndex = null;
        },

        async removeArmor(index) {
            const a = this.data.inventory?.armors?.[index];
            if (!a) return;
            const ok = await this.uiConfirm(`Do you want to remove the armor/protection "${a.name}"?`, "Remove Armor", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.inventory.armors.splice(index, 1);
            this.saveState();
        },

        // ================= CONDITIONS =================
        hasCondition(id) {
            if (!Array.isArray(this.data.conditions)) return false;
            return this.data.conditions.some(c => (typeof c === 'string' ? c : c.id) === id);
        },

        getConditionSource(id) {
            if (!Array.isArray(this.data.conditions)) return '';
            const entry = this.data.conditions.find(c => (typeof c === 'string' ? c : c.id) === id);
            if (!entry) return '';
            return (typeof entry === 'object' && entry.source) ? entry.source : '';
        },

        async toggleCondition(id) {
            if (!Array.isArray(this.data.conditions)) this.data.conditions = [];
            const condObj = this.allConditions.find(c => c.id === id);
            const condName = condObj ? condObj.name : id;
            const condIcon = condObj ? condObj.icon : '✨';
            const existingIdx = this.data.conditions.findIndex(c => (typeof c === 'string' ? c : c.id) === id);

            if (existingIdx >= 0) {
                this.data.conditions.splice(existingIdx, 1);
                this.logEvent('✨', 'Condition Removed', `Cleared "${condName}" condition.`);
            } else {
                const source = await this.uiPrompt(
                    `Enter the source or cause for the "${condName}" condition (e.g. Poison Spray spell, Ghoul attack, Trap):`,
                    `Apply Condition: ${condName}`,
                    "",
                    "e.g. Enemy Spell, Poison Trap, Monster Attack...",
                    condIcon,
                    "Apply Condition"
                );
                if (source === null) return; // User clicked Cancel

                const finalSource = (source || '').trim() || 'Unknown';
                this.data.conditions.push({
                    id,
                    source: finalSource
                });
                this.logEvent(condIcon, 'Condition Gained', `Gained "${condName}" condition (Source: ${finalSource}).`);

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
            this.data.conditions = this.data.conditions.filter(c => (typeof c === 'string' ? c : c.id) !== id);
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
            const srcText = cond.source ? `\n\n🎯 Source: ${cond.source}` : '';
            this.uiAlert(`${cond.summary}${srcText}`, `${cond.icon} Condition: ${cond.name}`, cond.icon);
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

        onDeathSaveChange() {
            this.saveState();
            const fails = (this.data.deathSaves?.failures || []).filter(Boolean).length;
            const succs = (this.data.deathSaves?.successes || []).filter(Boolean).length;

            if (fails >= 3) {
                this.logEvent('☠️', 'Character Died', 'Accumulated 3 death saving throw failures. Character is deceased.');
                this.uiAlert('You have accumulated 3 Death Saving Throw Failures. Under D&D 5e rules, your character has died.', 'Character Deceased', '☠️');
            } else if (succs >= 3) {
                this.logEvent('✨', 'Stabilized', 'Accumulated 3 death saving throw successes. Character is stable.');
                this.uiAlert('You have accumulated 3 Death Saving Throw Successes! Your character is now stable at 0 HP.', 'Stabilized!', '✨');
            }
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
            this.storySpellToAdd = '';
            this.storyResToAdd = '';
            this.storySkillAdvToAdd = '';
            if (this.editingStoryItemIndex !== null && this.data.inventory?.story?.[this.editingStoryItemIndex]) {
                const st = this.data.inventory.story[this.editingStoryItemIndex];
                this.storyItemForm = {
                    name: st.name || '',
                    desc: st.desc || '',
                    isSpecial: !!st.isSpecial,
                    isMagic: st.isMagic !== undefined ? !!st.isMagic : true,
                    equipped: st.equipped !== undefined ? !!st.equipped : false,
                    grantedSpells: Array.isArray(st.grantedSpells) ? [...st.grantedSpells] : [],
                    resistances: Array.isArray(st.resistances) ? [...st.resistances] : [],
                    bonusAttr: st.statBonuses?.attr || '',
                    attrMode: st.statBonuses?.attrMode || (st.statBonuses?.attrVal ? 'bonus' : 'advantage'),
                    bonusAttrVal: st.statBonuses?.attrVal || 0,
                    saveType: st.statBonuses?.saveType || '',
                    saveMode: st.statBonuses?.saveMode || (st.statBonuses?.saveVal ? 'bonus' : 'advantage'),
                    saveVal: st.statBonuses?.saveVal || 0,
                    advantageSkills: Array.isArray(st.advantageSkills) ? [...st.advantageSkills] : []
                };
            } else {
                this.storyItemForm = {
                    name: '',
                    desc: '',
                    isSpecial: false,
                    isMagic: true,
                    equipped: false,
                    grantedSpells: [],
                    resistances: [],
                    bonusAttr: '',
                    attrMode: 'bonus',
                    bonusAttrVal: 0,
                    saveType: '',
                    saveMode: 'bonus',
                    saveVal: 0,
                    advantageSkills: []
                };
            }
            this.modalStoryItemOpen = true;
        },

        addSpellToStoryForm() {
            const sp = (this.storySpellToAdd || '').trim();
            if (!sp) return;
            if (!Array.isArray(this.storyItemForm.grantedSpells)) this.storyItemForm.grantedSpells = [];
            if (!this.storyItemForm.grantedSpells.includes(sp)) {
                this.storyItemForm.grantedSpells.push(sp);
            }
            this.storySpellToAdd = '';
        },

        removeSpellFromStoryForm(idx) {
            if (Array.isArray(this.storyItemForm.grantedSpells)) {
                this.storyItemForm.grantedSpells.splice(idx, 1);
            }
        },

        addResToStoryForm() {
            const res = (this.storyResToAdd || '').trim();
            if (!res) return;
            if (!Array.isArray(this.storyItemForm.resistances)) this.storyItemForm.resistances = [];
            if (!this.storyItemForm.resistances.includes(res)) {
                this.storyItemForm.resistances.push(res);
            }
            this.storyResToAdd = '';
        },

        removeResFromStoryForm(idx) {
            if (Array.isArray(this.storyItemForm.resistances)) {
                this.storyItemForm.resistances.splice(idx, 1);
            }
        },

        addSkillAdvToStoryForm() {
            const sk = (this.storySkillAdvToAdd || '').trim();
            if (!sk) return;
            if (!Array.isArray(this.storyItemForm.advantageSkills)) this.storyItemForm.advantageSkills = [];
            if (!this.storyItemForm.advantageSkills.includes(sk)) {
                this.storyItemForm.advantageSkills.push(sk);
            }
            this.storySkillAdvToAdd = '';
        },

        removeSkillAdvFromStoryForm(idx) {
            if (Array.isArray(this.storyItemForm.advantageSkills)) {
                this.storyItemForm.advantageSkills.splice(idx, 1);
            }
        },

        handleSaveStoryItem() {
            const name = this.storyItemForm.name.trim();
            if (!name) return;
            if (!Array.isArray(this.data.inventory.story)) this.data.inventory.story = [];

            const isEdit = this.editingStoryItemIndex !== null && this.editingStoryItemIndex >= 0;
            const existing = isEdit ? this.data.inventory.story[this.editingStoryItemIndex] : null;

            const grantedSpells = [...(this.storyItemForm.grantedSpells || [])];
            const resistances = [...(this.storyItemForm.resistances || [])];
            const advantageSkills = [...(this.storyItemForm.advantageSkills || [])];

            const statBonuses = {};
            if (this.storyItemForm.bonusAttr) {
                statBonuses.attr = this.storyItemForm.bonusAttr;
                statBonuses.attrMode = this.storyItemForm.attrMode || 'bonus';
                if (statBonuses.attrMode === 'bonus') {
                    const val = parseInt(this.storyItemForm.bonusAttrVal, 10) || 0;
                    if (val) {
                        statBonuses[this.storyItemForm.bonusAttr] = val;
                        statBonuses.attrVal = val;
                    }
                }
            }
            if (this.storyItemForm.saveType) {
                statBonuses.saveType = this.storyItemForm.saveType;
                statBonuses.saveMode = this.storyItemForm.saveMode || 'bonus';
                if (statBonuses.saveMode === 'bonus') {
                    const saveVal = parseInt(this.storyItemForm.saveVal, 10) || 0;
                    if (saveVal) {
                        statBonuses.saveVal = saveVal;
                    }
                }
            }

            const item = {
                name,
                desc: this.storyItemForm.desc.trim(),
                isSpecial: !!this.storyItemForm.isSpecial,
                isMagic: !!this.storyItemForm.isMagic,
                equipped: existing ? !!existing.equipped : (this.storyItemForm.equipped || false),
                grantedSpells,
                resistances,
                advantageSkills,
                statBonuses
            };

            if (isEdit) {
                this.data.inventory.story[this.editingStoryItemIndex] = item;
            } else {
                this.data.inventory.story.push(item);
            }
            this.equipRevision++;
            this.saveState();
            this.modalStoryItemOpen = false;
            this.editingStoryItemIndex = null;
        },

        toggleEquipItem(item) {
            if (!item) return;
            item.equipped = !item.equipped;
            this.equipRevision++;
            this.saveState();
        },

        onEquipChange(item) {
            if (!item) return;
            this.equipRevision++;
            this.saveState();
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
            const defaultSource = this.data.identity?.classes?.[0]?.name || 'Class';
            this.spellCompendiumSource = defaultSource;
            this.spellManualForm = {
                name: '',
                level: 1,
                actionType: 'action',
                range: '60 ft',
                duration: 'Instantaneous',
                damage: '',
                conc: false,
                desc: '',
                source: defaultSource
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
            const isGrantedByItem = this.allEquipped.some(item =>
                (item.grantedSpells || []).some(s => normalizeKey(s) === normalizeKey(spellName))
            );
            if (isGrantedByItem) {
                await this.uiAlert(`"${spellName}" is granted by an equipped item. To remove it, unequip the item.`, "Item Spell", "📦");
                return;
            }
            const ok = await this.uiConfirm(`Do you want to remove "${spellName}" from your spellbook?`, "Remove Spell", "🗑️", "Remove", "bg-red-600 hover:bg-red-500");
            if (!ok) return;

            this.data.magic.spells = (this.data.magic.spells || []).filter(s => normalizeKey(s.name) !== normalizeKey(spellName));
            this.saveState();
        },

        toggleSpellFavorite(spellName) {
            if (!spellName) return;
            const norm = normalizeKey(spellName);
            if (!Array.isArray(this.data.magic.favorites)) this.data.magic.favorites = [];
            const idx = this.data.magic.favorites.indexOf(norm);
            if (idx >= 0) {
                this.data.magic.favorites.splice(idx, 1);
            } else {
                this.data.magic.favorites.push(norm);
            }

            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            if (sp) {
                sp.favorite = this.data.magic.favorites.includes(norm);
            }
            this.saveState();
        },

        isSpellFavorite(spellName) {
            if (!spellName) return false;
            const norm = normalizeKey(spellName);
            if (Array.isArray(this.data.magic?.favorites) && this.data.magic.favorites.includes(norm)) {
                return true;
            }
            const sp = (this.data.magic?.spells || []).find(s => normalizeKey(s.name) === norm);
            return !!sp?.favorite;
        },

        // ================= LEVEL UP & ATTRIBUTES =================
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
            if (target === current) return;
            cls.level = target;

            const hitDieFaces = parseInt(String(cls.hitDie || resolveClassHitDie(cls)).replace('d', ''), 10) || 8;
            const avgRoll = Math.floor(hitDieFaces / 2) + 1;
            const conMod = Math.floor(((this.levelUpForm.attributes.CON || 10) - 10) / 2);
            const hpChange = Math.max(1, avgRoll + conMod);

            if (delta > 0) {
                this.levelUpForm.maxHp = (parseInt(this.levelUpForm.maxHp, 10) || 0) + hpChange;
            } else if (delta < 0) {
                this.levelUpForm.maxHp = Math.max(1, (parseInt(this.levelUpForm.maxHp, 10) || 0) - hpChange);
            }
        },

        onNewClassSelected() {
            const found = findCompendiumClass(this.levelUpForm.newClassName);
            if (found?.obj?.hitDie) {
                this.levelUpForm.newClassHitDie = found.obj.hitDie;
            }
        },

        addNewClassToLevelUpForm() {
            const name = this.levelUpForm.newClassName.trim();
            if (!name) return;
            const compClass = findCompendiumClass(name);
            const resolvedHitDie = compClass?.obj?.hitDie || this.levelUpForm.newClassHitDie || 'd8';
            this.levelUpForm.classes.push({
                name: capitalizeWord(name),
                subclass: capitalizeWord(this.levelUpForm.newClassSubclass.trim()),
                level: 1,
                hitDie: resolvedHitDie
            });
            this.levelUpForm.newClassName = '';
            this.levelUpForm.newClassSubclass = '';
            this.levelUpForm.newClassHitDie = 'd8';
        },

        removeClassFromLevelUpForm(cIdx) {
            if (this.levelUpForm.classes.length <= 1) return;
            this.levelUpForm.classes.splice(cIdx, 1);
        },

        handleSaveLevelUp() {
            this.data.identity.classes = JSON.parse(JSON.stringify(this.levelUpForm.classes)).map(c => ({
                ...c,
                name: capitalizeWord(c.name),
                subclass: c.subclass ? capitalizeWord(c.subclass) : ''
            }));
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

            // 2. Detect & auto-add newly unlocked class features / clean stale
            const { newResources, newTraits, staleResourceIds, staleTraitNames } = detectClassFeaturesToSync(this.data);
            if (staleResourceIds.size > 0) {
                this.data.combat.resources = (this.data.combat.resources || []).filter(r => !staleResourceIds.has(r.id));
            }
            if (staleTraitNames.size > 0) {
                this.data.combat.traits = (this.data.combat.traits || []).filter(t => !staleTraitNames.has(normalizeKey(t.name)));
            }
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
            const { newResources, newTraits, staleResourceIds, staleTraitNames } = detectClassFeaturesToSync(this.data);
            let addedCount = 0;
            if (staleResourceIds.size > 0) {
                this.data.combat.resources = (this.data.combat.resources || []).filter(r => !staleResourceIds.has(r.id));
            }
            if (staleTraitNames.size > 0) {
                this.data.combat.traits = (this.data.combat.traits || []).filter(t => !staleTraitNames.has(normalizeKey(t.name)));
            }
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
            this.shortRestClassIndex = 0;
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
            const hitDieFaces = parseInt(this.shortRestSelectedHitDie.replace('d', ''), 10) || 8;

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
                    await this.uiAlert("Invalid file format. Please import a valid character.json file.", "Error", "❌");
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