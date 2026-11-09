import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SCHEMA_FILE_PATH = path.join(ROOT_DIR, 'db', 'schema.sql');
const SEED_SQL_PATH = path.join(ROOT_DIR, 'db', 'compendium-seed.sql');

const SCHOOL_MAP = {
    A: 'Abjuration',
    C: 'Conjuration',
    D: 'Divination',
    E: 'Enchantment',
    V: 'Evocation',
    I: 'Illusion',
    N: 'Necromancy',
    T: 'Transmutation'
};

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escapeSql(val) {
    if (val === null || val === undefined) return "''";
    if (typeof val === 'number') return String(val);
    return "'" + String(val).replace(/'/g, "''") + "'";
}

function formatSpellTime(rawTime) {
    if (!Array.isArray(rawTime) || rawTime.length === 0) return '1 action';
    const first = rawTime[0];
    if (!first || typeof first !== 'object') return String(first || '1 action');
    const num = first.number ?? 1;
    const unit = first.unit || 'action';
    return `${num} ${unit}`.trim();
}

function formatSpellRange(rawRange) {
    if (!rawRange) return 'Self';
    if (rawRange.distance) {
        const amt = rawRange.distance.amount ? `${rawRange.distance.amount} ` : '';
        const type = rawRange.distance.type || 'feet';
        return `${amt}${type}`.trim();
    }
    if (rawRange.type) {
        return rawRange.type.charAt(0).toUpperCase() + rawRange.type.slice(1);
    }
    return 'Self';
}

function parseSpellConcentrationAndDuration(rawDuration) {
    const list = Array.isArray(rawDuration) ? rawDuration : (rawDuration ? [rawDuration] : []);
    let isConc = false;
    let durationText = 'Instantaneous';

    for (const d of list) {
        if (!d) continue;
        if (d.concentration === true || String(d.type || '').toLowerCase().includes('conc')) {
            isConc = true;
        }
        if (d.type === 'timed' && d.duration) {
            const amt = d.duration.amount ?? 1;
            const unit = d.duration.type || 'minute';
            durationText = `${amt} ${unit}${amt > 1 ? 's' : ''}`;
        } else if (d.type === 'instant') {
            durationText = 'Instantaneous';
        } else if (d.type === 'permanent') {
            durationText = 'Until dispelled';
        } else if (d.type === 'special') {
            durationText = 'Special';
        }
    }

    if (isConc && !durationText.toLowerCase().startsWith('concentration')) {
        durationText = `Concentration, up to ${durationText}`;
    }

    return { concentration: isConc ? 1 : 0, duration: durationText };
}

function extractSpellClasses(raw) {
    const classes = new Set();
    const fromClassList = raw?.classes?.fromClassList || [];
    for (const c of fromClassList) {
        if (c?.name) classes.add(c.name);
    }
    return Array.from(classes);
}

/**
 * Generates SQL batch for all compendium tables directly from JSON files.
 * Does NOT require or create any local SQLite database file.
 * @returns {string} Combined SQL string
 */
export function generateCompendiumSql() {
    const classCompendiumPath = path.join(ROOT_DIR, 'src', 'dnd-data', 'class-compendium.json');
    const raceCompendiumPath = path.join(ROOT_DIR, 'src', 'dnd-data', 'race-compendium.json');
    const bgCompendiumPath = path.join(ROOT_DIR, 'src', 'dnd-data', 'background-compendium.json');
    const spellCompendiumPath = path.join(ROOT_DIR, 'src', 'dnd-data', 'spell-compendium.json');

    const classCompendium = JSON.parse(fs.readFileSync(classCompendiumPath, 'utf8'));
    const raceCompendium = JSON.parse(fs.readFileSync(raceCompendiumPath, 'utf8'));
    const backgroundCompendium = JSON.parse(fs.readFileSync(bgCompendiumPath, 'utf8'));
    const spellCompendium = JSON.parse(fs.readFileSync(spellCompendiumPath, 'utf8'));

    const sqlStatements = [];

    // 1. Classes
    let classesCount = 0;
    for (const [key, cls] of Object.entries(classCompendium)) {
        const id = slugify(key);
        const name = cls.name || key;
        const hitDie = cls.hitDie || 'd8';
        const spellAbility = cls.spellcasting?.ability || '';
        const casterProg = cls.spellcasting?.casterType || 'none';
        const dataJson = JSON.stringify(cls);

        sqlStatements.push(`INSERT OR REPLACE INTO compendium_classes (id, name, hit_die, spellcasting_ability, caster_progression, data_json) VALUES (${escapeSql(id)}, ${escapeSql(name)}, ${escapeSql(hitDie)}, ${escapeSql(spellAbility)}, ${escapeSql(casterProg)}, ${escapeSql(dataJson)});`);
        classesCount++;
    }

    // 2. Races
    let racesCount = 0;
    for (const [key, rc] of Object.entries(raceCompendium)) {
        const id = slugify(key);
        const name = rc.name || key;
        const sourceBook = rc.source || 'PHB';
        const speed = rc.speed || '30 ft.';
        const dataJson = JSON.stringify(rc);

        sqlStatements.push(`INSERT OR REPLACE INTO compendium_races (id, name, source_book, speed, data_json) VALUES (${escapeSql(id)}, ${escapeSql(name)}, ${escapeSql(sourceBook)}, ${escapeSql(speed)}, ${escapeSql(dataJson)});`);
        racesCount++;
    }

    // 3. Backgrounds
    let bgCount = 0;
    for (const [key, bg] of Object.entries(backgroundCompendium)) {
        const id = slugify(key);
        const name = bg.name || key;
        const sourceBook = bg.source || 'PHB';
        const skills = Array.isArray(bg.skillProficiencies) ? bg.skillProficiencies : [];
        const dataJson = JSON.stringify(bg);

        sqlStatements.push(`INSERT OR REPLACE INTO compendium_backgrounds (id, name, source_book, skills_json, data_json) VALUES (${escapeSql(id)}, ${escapeSql(name)}, ${escapeSql(sourceBook)}, ${escapeSql(JSON.stringify(skills))}, ${escapeSql(dataJson)});`);
        bgCount++;
    }

    // 4. Spells
    const rawSpells = Array.isArray(spellCompendium.spell) ? spellCompendium.spell : [];
    const seenSpellNames = new Set();
    const seenSpellSlugs = new Set();
    let spellsCount = 0;

    for (const sp of rawSpells) {
        if (!sp || !sp.name) continue;
        const normName = sp.name.trim();
        const slug = slugify(normName);
        if (!slug || seenSpellNames.has(normName.toLowerCase()) || seenSpellSlugs.has(slug)) {
            continue;
        }
        seenSpellNames.add(normName.toLowerCase());
        seenSpellSlugs.add(slug);

        const level = typeof sp.level === 'number' ? sp.level : (parseInt(sp.level, 10) || 0);
        const school = SCHOOL_MAP[sp.school] || String(sp.school || 'Universal');
        const castingTime = formatSpellTime(sp.time);
        const range = formatSpellRange(sp.range);
        const { concentration, duration } = parseSpellConcentrationAndDuration(sp.duration);
        const ritual = sp.meta?.ritual ? 1 : 0;
        const classes = extractSpellClasses(sp);
        const dataJson = JSON.stringify(sp);

        sqlStatements.push(`INSERT OR REPLACE INTO compendium_spells (id, name, source_book, level, school, casting_time, range, duration, concentration, ritual, classes_json, data_json) VALUES (${escapeSql(slug)}, ${escapeSql(normName)}, ${escapeSql(String(sp.source || 'PHB'))}, ${Math.max(0, Math.min(9, level))}, ${escapeSql(school)}, ${escapeSql(castingTime)}, ${escapeSql(range)}, ${escapeSql(duration)}, ${concentration}, ${ritual}, ${escapeSql(JSON.stringify(classes))}, ${escapeSql(dataJson)});`);
        spellsCount++;
    }

    console.log(`[Compendium D1] Generated SQL for ${classesCount} classes, ${racesCount} races, ${bgCount} backgrounds, ${spellsCount} spells (${sqlStatements.length} total statements).`);
    return sqlStatements.join('\n');
}

/**
 * Main seeding runner
 */
export async function seedCompendiumToD1({ remote = false, fileOnly = false } = {}) {
    const sql = generateCompendiumSql();
    fs.writeFileSync(SEED_SQL_PATH, sql, 'utf8');
    console.log(`[Compendium D1] Saved SQL seed to ${SEED_SQL_PATH} (${(fs.statSync(SEED_SQL_PATH).size / 1024).toFixed(1)} KB).`);

    if (fileOnly) return;

    const targetFlag = remote ? '--remote' : '--local';
    const envOptions = {
        ...process.env,
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
    };

    // 1. First ensure schema tables exist in D1
    console.log(`[Compendium D1] Ensuring D1 schema is initialized (${targetFlag})...`);
    execSync(`npx wrangler d1 execute DorianDndApp ${targetFlag} --file="${SCHEMA_FILE_PATH}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: envOptions
    });

    // 2. Execute compendium seed
    console.log(`[Compendium D1] Seeding compendium tables into Cloudflare D1 (${targetFlag})...`);
    execSync(`npx wrangler d1 execute DorianDndApp ${targetFlag} --file="${SEED_SQL_PATH}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: envOptions
    });

    console.log(`[Compendium D1] Compendium tables successfully seeded into Cloudflare D1 (${targetFlag})!`);
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed-compendium-d1.js')) {
    const isRemote = process.argv.includes('--remote');
    const isFileOnly = process.argv.includes('--file-only');
    seedCompendiumToD1({ remote: isRemote, fileOnly: isFileOnly }).catch(err => {
        console.error('[Compendium D1] Seeding failed:', err);
        process.exit(1);
    });
}
