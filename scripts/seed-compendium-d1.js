import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_FILE_PATH = path.join(ROOT_DIR, 'DorianDndApp.db');
const SCHEMA_FILE_PATH = path.join(ROOT_DIR, 'db', 'schema.sql');
const SEED_SQL_PATH = path.join(ROOT_DIR, 'db', 'compendium-seed.sql');

function escapeSql(val) {
    if (val === null || val === undefined) return "''";
    if (typeof val === 'number') return String(val);
    return "'" + String(val).replace(/'/g, "''") + "'";
}

/**
 * Generates SQL batch for all compendium tables from DorianDndApp.db.
 * @returns {string} Combined SQL string
 */
export function generateCompendiumSql() {
    // Ensure DorianDndApp.db exists; if not, build it first
    if (!fs.existsSync(DB_FILE_PATH)) {
        console.log('[Compendium D1] DorianDndApp.db not found. Building it first...');
        execSync('node scripts/build-db.js', { cwd: ROOT_DIR, stdio: 'inherit' });
    }

    const db = new DatabaseSync(DB_FILE_PATH);
    const sqlStatements = [];

    // 1. Classes
    const classes = db.prepare('SELECT id, name, hit_die, spellcasting_ability, caster_progression, data_json FROM compendium_classes').all();
    for (const c of classes) {
        sqlStatements.push(`INSERT OR REPLACE INTO compendium_classes (id, name, hit_die, spellcasting_ability, caster_progression, data_json) VALUES (${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.hit_die)}, ${escapeSql(c.spellcasting_ability)}, ${escapeSql(c.caster_progression)}, ${escapeSql(c.data_json)});`);
    }

    // 2. Races
    const races = db.prepare('SELECT id, name, source_book, speed, data_json FROM compendium_races').all();
    for (const r of races) {
        sqlStatements.push(`INSERT OR REPLACE INTO compendium_races (id, name, source_book, speed, data_json) VALUES (${escapeSql(r.id)}, ${escapeSql(r.name)}, ${escapeSql(r.source_book)}, ${escapeSql(r.speed)}, ${escapeSql(r.data_json)});`);
    }

    // 3. Backgrounds
    const backgrounds = db.prepare('SELECT id, name, source_book, skills_json, data_json FROM compendium_backgrounds').all();
    for (const b of backgrounds) {
        sqlStatements.push(`INSERT OR REPLACE INTO compendium_backgrounds (id, name, source_book, skills_json, data_json) VALUES (${escapeSql(b.id)}, ${escapeSql(b.name)}, ${escapeSql(b.source_book)}, ${escapeSql(b.skills_json)}, ${escapeSql(b.data_json)});`);
    }

    // 4. Spells
    const spells = db.prepare('SELECT id, name, source_book, level, school, casting_time, range, duration, concentration, ritual, classes_json, data_json FROM compendium_spells').all();
    for (const s of spells) {
        sqlStatements.push(`INSERT OR REPLACE INTO compendium_spells (id, name, source_book, level, school, casting_time, range, duration, concentration, ritual, classes_json, data_json) VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.source_book)}, ${s.level}, ${escapeSql(s.school)}, ${escapeSql(s.casting_time)}, ${escapeSql(s.range)}, ${escapeSql(s.duration)}, ${s.concentration}, ${s.ritual}, ${escapeSql(s.classes_json)}, ${escapeSql(s.data_json)});`);
    }

    db.close();

    console.log(`[Compendium D1] Generated SQL for ${classes.length} classes, ${races.length} races, ${backgrounds.length} backgrounds, ${spells.length} spells (${sqlStatements.length} total statements).`);
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

    // 1. First ensure schema tables exist in D1
    console.log(`[Compendium D1] Ensuring D1 schema is initialized (${targetFlag})...`);
    execSync(`npx wrangler d1 execute DorianDndApp ${targetFlag} --file="${SCHEMA_FILE_PATH}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit'
    });

    // 2. Execute compendium seed
    console.log(`[Compendium D1] Seeding compendium tables into Cloudflare D1 (${targetFlag})...`);
    execSync(`npx wrangler d1 execute DorianDndApp ${targetFlag} --file="${SEED_SQL_PATH}"`, {
        cwd: ROOT_DIR,
        stdio: 'inherit'
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
