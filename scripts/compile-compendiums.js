import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_SOURCES, COMPENDIUM_CONFIG } from './compendium.config.js';
import { SCHOOL_MAP } from '../src/domain/constants/dnd.constants.js';
import { normalizeKey } from '../src/helpers/string.helper.js';

export { normalizeKey };

const SKILL_MAP = {
    athletics: 'Athletics',
    acrobatics: 'Acrobatics',
    sleightofhand: 'Sleight of Hand',
    stealth: 'Stealth',
    arcana: 'Arcana',
    history: 'History',
    investigation: 'Investigation',
    nature: 'Nature',
    religion: 'Religion',
    animalhandling: 'Animal Handling',
    insight: 'Insight',
    medicine: 'Medicine',
    perception: 'Perception',
    survival: 'Survival',
    deception: 'Deception',
    intimidation: 'Intimidation',
    performance: 'Performance',
    persuasion: 'Persuasion'
};

export function clean5eToolsText(text) {
    if (!text) return '';
    if (Array.isArray(text)) return text.map(clean5eToolsText).filter(Boolean).join('\n\n');
    if (typeof text === 'object') {
        const title = text.name ? `${text.name}: ` : '';
        if (text.entries) return (title + clean5eToolsText(text.entries)).trim();
        if (text.items) return (title + text.items.map(clean5eToolsText).join('\n')).trim();
        if (text.rows) {
            // Table formatting
            const header = text.colLabels ? text.colLabels.join(' | ') + '\n' : '';
            const rows = text.rows.map(r => r.map(c => clean5eToolsText(c)).join(' | ')).join('\n');
            return (header + rows).trim();
        }
        return '';
    }
    return String(text).replace(/\{@([a-zA-Z]+) ([^}]+)\}/gi, (_, tag, content) => {
        const parts = content.split('|');
        const t = tag.toLowerCase();
        if (t === 'scaledamage' || t === 'scaledice') return parts[2] || parts[0];
        return parts[0];
    });
}

function formatSkillName(key) {
    const norm = normalizeKey(key);
    return SKILL_MAP[norm] || key.charAt(0).toUpperCase() + key.slice(1);
}

// ==========================================
// 1. SPELLS COMPILER
// ==========================================
function parseSpell(raw, config) {
    if (!raw || typeof raw !== 'object' || !raw.name) return null;

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
        const sMap = {
            strength: 'STR',
            dexterity: 'DEX',
            constitution: 'CON',
            intelligence: 'INT',
            wisdom: 'WIS',
            charisma: 'CHA'
        };
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

    const spellObj = {
        name: raw.name.trim(),
        source: raw.source || 'PHB',
        sourceBook: raw.source || 'PHB',
        level: typeof raw.level === 'number' ? raw.level : (parseInt(raw.level, 10) || 0),
        school: SCHOOL_MAP[raw.school] || String(raw.school || 'Universal'),
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

    if (config.customExtractors && typeof config.customExtractors === 'object') {
        for (const [key, extractorFn] of Object.entries(config.customExtractors)) {
            try {
                spellObj[key] = extractorFn(raw);
            } catch (err) {
                console.warn(`Warning: Extractor "${key}" failed on spell "${raw.name}":`, err.message);
            }
        }
    }

    if (Array.isArray(config.includeRawFields)) {
        for (const field of config.includeRawFields) {
            if (raw[field] !== undefined) {
                spellObj[field] = raw[field];
            }
        }
    }

    return spellObj;
}

export function compileSpellsCompendium() {
    const config = COMPENDIUM_CONFIG.spells;
    console.log('[compile-compendiums] Compiling spells compendium...');

    let rawSpells = [];

    if (fs.existsSync(config.sourcesDir)) {
        for (const file of config.sourceFiles) {
            const filePath = path.join(config.sourcesDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const spells = Array.isArray(parsed.spell) ? parsed.spell : [];
                    rawSpells.push(...spells);
                    console.log(`  Loaded ${spells.length} spells from 5eTools/${file}`);
                } catch (err) {
                    console.warn(`  Failed to parse ${file}: ${err.message}`);
                }
            }
        }
    } else if (fs.existsSync(config.outputFile)) {
        const existing = JSON.parse(fs.readFileSync(config.outputFile, 'utf8'));
        rawSpells = Array.isArray(existing.spell) ? existing.spell : (Array.isArray(existing) ? existing : []);
    }

    const spellMap = new Map();
    for (const raw of rawSpells) {
        const parsed = parseSpell(raw, config);
        if (parsed && parsed.name) {
            const key = normalizeKey(parsed.name);
            if (!spellMap.has(key)) {
                spellMap.set(key, parsed);
            }
        }
    }

    const compiledSpells = Array.from(spellMap.values()).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );

    const output = { spell: compiledSpells };
    const jsonStr = JSON.stringify(output);
    fs.mkdirSync(path.dirname(config.outputFile), { recursive: true });
    fs.writeFileSync(config.outputFile, jsonStr, 'utf8');

    const sizeKb = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1);
    console.log(`[compile-compendiums] Successfully compiled ${compiledSpells.length} spells to ${config.outputFile} (${sizeKb} KB)`);
    return compiledSpells.length;
}

// ==========================================
// 2. CLASSES COMPILER
// ==========================================
export function compileClassesCompendium() {
    const config = COMPENDIUM_CONFIG.classes;
    const allowed = COMPENDIUM_CONFIG.allowedSources;
    console.log('[compile-compendiums] Compiling classes compendium...');

    let existingCompendium = {};
    if (fs.existsSync(config.outputFile)) {
        try {
            existingCompendium = JSON.parse(fs.readFileSync(config.outputFile, 'utf8'));
        } catch (_) {}
    }

    const compiledClasses = {};

    for (const classKey of config.includedClasses) {
        const filePath = path.join(config.sourcesDir, `class-${classKey}.json`);
        if (!fs.existsSync(filePath)) {
            console.warn(`  Class file not found: ${filePath}`);
            continue;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Find primary class definition in allowed sources (PHB for core 12, TCE for Artificer)
        const classObj = (data.class || []).find(c => allowed.includes(c.source));
        if (!classObj) {
            console.warn(`  No allowed source found for class "${classKey}" in ${allowed.join(', ')}`);
            continue;
        }

        const hitDie = classObj.hd?.faces ? `d${classObj.hd.faces}` : 'd8';
        const casterProg = config.casterProgressionMap[classKey] || null;
        let spellcasting = null;
        if (casterProg && classObj.spellcastingAbility) {
            spellcasting = {
                ability: classObj.spellcastingAbility.toUpperCase(),
                casterType: casterProg
            };
        }

        // Base features per level (1..20)
        const baseFeatures = {};
        for (let lvl = 1; lvl <= 20; lvl++) {
            baseFeatures[String(lvl)] = [];
        }

        const classFeatures = (data.classFeature || []).filter(f =>
            f.classSource === classObj.source &&
            allowed.includes(f.source) &&
            f.className.toLowerCase() === classObj.name.toLowerCase()
        );

        for (const feat of classFeatures) {
            const lvl = String(feat.level || 1);
            if (baseFeatures[lvl]) {
                const prefix = feat.isClassFeatureVariant ? 'Optional: ' : '';
                const featText = `${prefix}${feat.name}: ${clean5eToolsText(feat.entries)}`;
                baseFeatures[lvl].push(featText);
            }
        }

        // Subclasses
        const subclasses = {};
        const allowedSubclasses = (data.subclass || []).filter(s =>
            allowed.includes(s.source) &&
            s.classSource === classObj.source &&
            s.className.toLowerCase() === classObj.name.toLowerCase()
        );

        // Subclass aliases mapping
        const subclassAliases = existingCompendium[classKey]?.subclassAliases || {};

        for (const sub of allowedSubclasses) {
            const subKey = normalizeKey(sub.shortName || sub.name);
            const subFeatures = {};

            const subFeatEntries = (data.subclassFeature || []).filter(f =>
                f.classSource === classObj.source &&
                f.subclassSource === sub.source &&
                f.subclassShortName === sub.shortName
            );

            for (const f of subFeatEntries) {
                // Skip subclass flavor introductory entry matching name
                if (f.name === sub.name) continue;
                const lvl = String(f.level || 3);
                if (!subFeatures[lvl]) subFeatures[lvl] = [];
                subFeatures[lvl].push(`${f.name}: ${clean5eToolsText(f.entries)}`);
            }

            const subSpellcasting = config.subclassSpellcasting?.[subKey] ||
                existingCompendium[classKey]?.subclasses?.[subKey]?.spellcasting;

            subclasses[subKey] = {
                name: `${sub.name} (${sub.source})`,
                features: subFeatures
            };

            if (subSpellcasting) {
                subclasses[subKey].spellcasting = subSpellcasting;
            }

            // Ensure alias exists
            if (!subclassAliases[subKey]) {
                subclassAliases[subKey] = { name: sub.name };
            }
        }

        const classEntry = {
            name: classObj.name,
            hitDie,
            spellcasting,
            baseFeatures,
            subclasses,
            subclassAliases
        };

        // Merge diceScales from config and existing compendium
        const mergedDiceScales = {
            ...(existingCompendium[classKey]?.diceScales || {}),
            ...(config.diceScalesMap?.[classKey] || {})
        };
        if (Object.keys(mergedDiceScales).length > 0) {
            classEntry.diceScales = mergedDiceScales;
        }

        // Merge featuresSync from config and existing compendium
        const mergedFeaturesSync = existingCompendium[classKey]?.featuresSync || config.featuresSyncMap?.[classKey];
        if (mergedFeaturesSync) {
            classEntry.featuresSync = mergedFeaturesSync;
        }

        compiledClasses[classKey] = classEntry;
        console.log(`  Compiled class "${classObj.name}" with ${Object.keys(subclasses).length} subclasses`);
    }

    const jsonStr = JSON.stringify(compiledClasses, null, 2);
    fs.mkdirSync(path.dirname(config.outputFile), { recursive: true });
    fs.writeFileSync(config.outputFile, jsonStr, 'utf8');

    const sizeKb = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1);
    console.log(`[compile-compendiums] Successfully compiled ${Object.keys(compiledClasses).length} classes to ${config.outputFile} (${sizeKb} KB)`);
    return Object.keys(compiledClasses).length;
}

function formatSpellTitle(str) {
    if (!str) return '';
    return str.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

// ==========================================
// 3. RACES COMPILER
// ==========================================
function parseInnateSpells(additionalSpells) {
    if (!Array.isArray(additionalSpells)) return [];
    const list = [];
    for (const entry of additionalSpells) {
        // known cantrips or 1st-level spells
        if (entry && entry.known && typeof entry.known === 'object') {
            for (const [lvl, spells] of Object.entries(entry.known)) {
                const spellList = Array.isArray(spells) ? spells : (typeof spells === 'string' ? [spells] : (spells?._ || []));
                for (const sp of spellList) {
                    if (typeof sp !== 'string') continue;
                    const isCantrip = sp.includes('#c') || parseInt(lvl, 10) === 0;
                    const rawName = sp.replace(/#.*$/, '').split('|')[0].replace(/\{@spell /gi, '').replace(/\}/g, '').trim();
                    list.push({
                        name: formatSpellTitle(rawName),
                        level: isCantrip ? 0 : (parseInt(lvl, 10) || 0),
                        minLevel: 1
                    });
                }
            }
        }
        // innate daily spells
        if (entry && entry.innate && typeof entry.innate === 'object') {
            for (const [charLvl, dailyBlock] of Object.entries(entry.innate)) {
                if (!dailyBlock) continue;
                const rawSpells = dailyBlock.daily?.['1'] || dailyBlock['1'] || dailyBlock;
                const spellList = Array.isArray(rawSpells) ? rawSpells : (typeof rawSpells === 'string' ? [rawSpells] : []);
                for (const sp of spellList) {
                    if (typeof sp !== 'string') continue;
                    const rawName = sp.replace(/#.*$/, '').split('|')[0].replace(/\{@spell /gi, '').replace(/\}/g, '').trim();
                    const minLvl = parseInt(charLvl, 10) || 1;
                    const spellLevel = minLvl >= 5 ? 2 : (minLvl >= 3 ? 1 : 0);
                    list.push({
                        name: formatSpellTitle(rawName),
                        level: spellLevel,
                        minLevel: minLvl,
                        uses: 1,
                        reset: 'Long Rest'
                    });
                }
            }
        }
    }
    return list;
}

export function compileRacesCompendium() {
    const config = COMPENDIUM_CONFIG.races;
    const allowed = config.allowedSources || ALLOWED_SOURCES;
    console.log('[compile-compendiums] Compiling races compendium...');

    let existingCompendium = {};
    if (fs.existsSync(config.outputFile)) {
        try {
            existingCompendium = JSON.parse(fs.readFileSync(config.outputFile, 'utf8'));
        } catch (_) {}
    }

    if (!fs.existsSync(config.sourceFile)) {
        console.warn(`  Races source file not found: ${config.sourceFile}`);
        return 0;
    }

    const data = JSON.parse(fs.readFileSync(config.sourceFile, 'utf8'));
    const rawRaces = data.race || [];
    const rawSubraces = data.subrace || [];

    const compiledRaces = {};

    const filteredRaces = rawRaces.filter(r => allowed.includes(r.source));

    for (const r of filteredRaces) {
        const raceKey = normalizeKey(r.name);
        if (compiledRaces[raceKey]) continue;

        let speedStr = '30 ft.';
        if (typeof r.speed === 'number') speedStr = `${r.speed} ft.`;
        else if (typeof r.speed === 'object' && r.speed.walk) speedStr = `${r.speed.walk} ft.`;

        const darkvision = r.darkvision || 0;
        const sensesStr = darkvision ? `Darkvision (${darkvision} ft.)` : '';

        // Resistances
        const resistances = [];
        if (Array.isArray(r.resist)) {
            for (const res of r.resist) {
                if (typeof res === 'string') resistances.push(res.toLowerCase());
                else if (res.resist && Array.isArray(res.resist)) {
                    resistances.push(...res.resist.map(x => String(x).toLowerCase()));
                }
            }
        }

        // Languages
        const languages = ['Common'];
        if (Array.isArray(r.languageProficiencies)) {
            for (const lp of r.languageProficiencies) {
                for (const [lang, val] of Object.entries(lp)) {
                    if (val === true && lang !== 'other') {
                        languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
                    }
                }
            }
        }

        // Traits
        const traits = [];
        const excludedTraitNames = ['age', 'size', 'speed', 'languages', 'alignment'];
        for (const e of (r.entries || [])) {
            if (e.name && !excludedTraitNames.includes(e.name.toLowerCase())) {
                traits.push({
                    name: e.name,
                    desc: clean5eToolsText(e.entries)
                });
            }
        }

        // Subraces
        const subraces = {};
        const matchingSubraces = rawSubraces.filter(s =>
            s.raceName === r.name &&
            s.name &&
            normalizeKey(s.name) !== '' &&
            allowed.includes(s.source)
        );

        for (const s of matchingSubraces) {
            const subKey = normalizeKey(s.name);
            let subSpeed = undefined;
            if (typeof s.speed === 'number') subSpeed = `${s.speed} ft.`;
            else if (typeof s.speed === 'object' && s.speed.walk) subSpeed = `${s.speed.walk} ft.`;

            const subDarkvision = s.darkvision !== undefined ? s.darkvision : undefined;
            const subSenses = subDarkvision ? `Darkvision (${subDarkvision} ft.)` : undefined;

            const subResist = [];
            if (Array.isArray(s.resist)) {
                for (const res of s.resist) {
                    if (typeof res === 'string') subResist.push(res.toLowerCase());
                    else if (res.resist && Array.isArray(res.resist)) {
                        subResist.push(...res.resist.map(x => String(x).toLowerCase()));
                    }
                }
            }

            const subTraits = [];
            for (const e of (s.entries || [])) {
                if (e.name && !excludedTraitNames.includes(e.name.toLowerCase())) {
                    subTraits.push({
                        name: e.name,
                        desc: clean5eToolsText(e.entries)
                    });
                }
            }

            const innateSpells = parseInnateSpells(s.additionalSpells);

            const subObj = {
                name: `${r.name} (${s.name})`,
                traits: subTraits
            };
            if (subSpeed) subObj.speed = subSpeed;
            if (subDarkvision !== undefined) subObj.darkvision = subDarkvision;
            if (subSenses) subObj.senses = subSenses;
            if (subResist.length > 0) subObj.resistances = subResist;
            if (innateSpells.length > 0) subObj.innateSpells = innateSpells;

            if (subraces[subKey]) {
                if (subResist.length > 0) {
                    subraces[subKey].resistances = Array.from(new Set([
                        ...(subraces[subKey].resistances || []),
                        ...subResist
                    ]));
                }
                if (innateSpells.length > 0 && (!subraces[subKey].innateSpells || subraces[subKey].innateSpells.length === 0)) {
                    subraces[subKey].innateSpells = innateSpells;
                }
                if (subSpeed) subraces[subKey].speed = subSpeed;
                if (subDarkvision !== undefined) subraces[subKey].darkvision = subDarkvision;
                if (subSenses) subraces[subKey].senses = subSenses;
                const existingTraitNames = new Set((subraces[subKey].traits || []).map(t => t.name.toLowerCase()));
                for (const t of subTraits) {
                    if (!existingTraitNames.has(t.name.toLowerCase())) {
                        subraces[subKey].traits.push(t);
                    }
                }
            } else {
                subraces[subKey] = subObj;
            }
        }

        compiledRaces[raceKey] = {
            name: r.name,
            speed: speedStr,
            senses: sensesStr,
            darkvision,
            resistances: Array.from(new Set(resistances)),
            languages: Array.from(new Set(languages)),
            traits,
            subraces
        };
    }

    // Preserve custom or legacy race entries from existing compendium if configured
    if (config.preserveCustomRaces) {
        let preservedCount = 0;
        for (const [key, baseObj] of Object.entries(existingCompendium)) {
            if (!compiledRaces[key]) {
                compiledRaces[key] = baseObj;
                preservedCount++;
            } else if (baseObj.subraces) {
                // Merge subraces
                for (const [subKey, subObj] of Object.entries(baseObj.subraces)) {
                    if (!compiledRaces[key].subraces[subKey]) {
                        compiledRaces[key].subraces[subKey] = subObj;
                        preservedCount++;
                    }
                }
            }
        }
        if (preservedCount > 0) {
            console.log(`  Preserved ${preservedCount} supplementary/legacy race/subrace entries from existing compendium`);
        }
    }

    const jsonStr = JSON.stringify(compiledRaces, null, 2);
    fs.mkdirSync(path.dirname(config.outputFile), { recursive: true });
    fs.writeFileSync(config.outputFile, jsonStr, 'utf8');

    const sizeKb = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1);
    console.log(`[compile-compendiums] Successfully compiled ${Object.keys(compiledRaces).length} races to ${config.outputFile} (${sizeKb} KB)`);
    return Object.keys(compiledRaces).length;
}

// ==========================================
// 4. BACKGROUNDS COMPILER
// ==========================================
export function compileBackgroundsCompendium() {
    const config = COMPENDIUM_CONFIG.backgrounds;
    const allowed = config.allowedSources || ALLOWED_SOURCES;
    console.log('[compile-compendiums] Compiling backgrounds compendium...');

    if (!fs.existsSync(config.sourceFile)) {
        console.warn(`  Backgrounds source file not found: ${config.sourceFile}`);
        return 0;
    }

    const data = JSON.parse(fs.readFileSync(config.sourceFile, 'utf8'));
    const rawBackgrounds = data.background || [];
    const filtered = rawBackgrounds.filter(b => allowed.includes(b.source));

    const compiledBackgrounds = {};

    for (const bg of filtered) {
        const bgKey = normalizeKey(bg.name);
        if (compiledBackgrounds[bgKey]) continue;

        // Extract skills
        const skillProficiencies = [];
        if (Array.isArray(bg.skillProficiencies)) {
            for (const sp of bg.skillProficiencies) {
                for (const [k, v] of Object.entries(sp)) {
                    if (v === true) skillProficiencies.push(formatSkillName(k));
                    else if (typeof v === 'string') skillProficiencies.push(v);
                }
            }
        }

        // Extract tools
        const toolProficiencies = [];
        if (Array.isArray(bg.toolProficiencies)) {
            for (const tp of bg.toolProficiencies) {
                for (const [k, v] of Object.entries(tp)) {
                    if (v === true) toolProficiencies.push(k.replace(/([A-Z])/g, ' $1').toLowerCase());
                    else if (typeof v === 'string') toolProficiencies.push(v);
                }
            }
        }

        // Extract languages
        let languages = 'None';
        if (Array.isArray(bg.languageProficiencies)) {
            const list = [];
            for (const lp of bg.languageProficiencies) {
                if (lp.anyStandard) list.push(`${lp.anyStandard} standard languages of your choice`);
                else if (lp.other) list.push(`${lp.other} languages of your choice`);
                else {
                    for (const [lang, val] of Object.entries(lp)) {
                        if (val === true) list.push(lang.charAt(0).toUpperCase() + lang.slice(1));
                    }
                }
            }
            if (list.length > 0) languages = list.join(', ');
        }

        // Extract feature and description
        let featObj = { name: 'None', desc: '' };
        const descParts = [];

        for (const entry of (bg.entries || [])) {
            if (typeof entry === 'object' && entry.name && entry.name.toLowerCase().startsWith('feature:')) {
                featObj = {
                    name: entry.name.replace(/^feature:\s*/i, '').trim(),
                    desc: clean5eToolsText(entry.entries)
                };
            } else if (typeof entry === 'string') {
                descParts.push(entry);
            } else if (typeof entry === 'object' && !entry.name?.toLowerCase().includes('suggested')) {
                descParts.push(clean5eToolsText(entry));
            }
        }

        // Extract suggested characteristics if present
        let suggestedCharacteristics = null;
        const charEntry = (bg.entries || []).find(e =>
            typeof e === 'object' && e.name && e.name.toLowerCase().includes('suggested')
        );
        if (charEntry && Array.isArray(charEntry.entries)) {
            const traits = [];
            const ideals = [];
            const bonds = [];
            const flaws = [];
            for (const sub of charEntry.entries) {
                if (sub.type === 'table' && sub.caption) {
                    const cap = sub.caption.toLowerCase();
                    const items = (sub.rows || []).map(r => clean5eToolsText(r[1] || r[0]));
                    if (cap.includes('trait')) traits.push(...items);
                    else if (cap.includes('ideal')) ideals.push(...items);
                    else if (cap.includes('bond')) bonds.push(...items);
                    else if (cap.includes('flaw')) flaws.push(...items);
                }
            }
            if (traits.length || ideals.length || bonds.length || flaws.length) {
                suggestedCharacteristics = {
                    personalityTraits: traits,
                    ideals,
                    bonds,
                    flaws
                };
            }
        }

        compiledBackgrounds[bgKey] = {
            name: bg.name,
            source: bg.source,
            desc: descParts.join('\n\n').trim(),
            skillProficiencies: Array.from(new Set(skillProficiencies)),
            toolProficiencies: Array.from(new Set(toolProficiencies)),
            languages,
            feature: featObj
        };

        if (suggestedCharacteristics) {
            compiledBackgrounds[bgKey].suggestedCharacteristics = suggestedCharacteristics;
        }
    }

    const jsonStr = JSON.stringify(compiledBackgrounds, null, 2);
    fs.mkdirSync(path.dirname(config.outputFile), { recursive: true });
    fs.writeFileSync(config.outputFile, jsonStr, 'utf8');

    const sizeKb = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1);
    console.log(`[compile-compendiums] Successfully compiled ${Object.keys(compiledBackgrounds).length} backgrounds to ${config.outputFile} (${sizeKb} KB)`);
    return Object.keys(compiledBackgrounds).length;
}

// ==========================================
// 5. MASTER COMPILER RUNNER
// ==========================================
export function compileAllCompendiums() {
    console.log('====================================================');
    console.log(`[compile-compendiums] Starting build with ALLOWED_SOURCES = [${ALLOWED_SOURCES.join(', ')}]`);
    console.log('====================================================');
    const spellsCount = compileSpellsCompendium();
    const classesCount = compileClassesCompendium();
    const racesCount = compileRacesCompendium();
    const backgroundsCount = compileBackgroundsCompendium();

    console.log('====================================================');
    console.log(`[compile-compendiums] Summary:`);
    console.log(`  - Spells:       ${spellsCount} spells`);
    console.log(`  - Classes:      ${classesCount} classes`);
    console.log(`  - Races:        ${racesCount} races`);
    console.log(`  - Backgrounds:  ${backgroundsCount} backgrounds`);
    console.log('====================================================');
    return { spellsCount, classesCount, racesCount, backgroundsCount };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('compile-compendiums.js')) {
    compileAllCompendiums();
}
