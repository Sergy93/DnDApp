import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_FILE_PATH = path.join(ROOT_DIR, 'DorianDndApp.db');
const SCHEMA_FILE_PATH = path.join(ROOT_DIR, 'db', 'schema.sql');

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

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
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

function buildDatabase() {
    console.log('Building SQLite database: DorianDndApp.db ...');

    // Remove existing database files for a clean deterministic build
    for (const ext of ['', '-wal', '-shm']) {
        const target = `${DB_FILE_PATH}${ext}`;
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
        }
    }

    const db = new DatabaseSync(DB_FILE_PATH);

    // Configure SQLite pragmas for maximum durability and integrity
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = FULL;');

    // Execute DDL schema
    const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    db.exec(schemaSql);

    // Load source JSON files
    const characterData = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'src', 'character.json'), 'utf8')
    );
    const classCompendium = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'src', 'dnd-data', 'class-compendium.json'), 'utf8')
    );
    const backgroundCompendium = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'src', 'dnd-data', 'background-compendium.json'), 'utf8')
    );

    const spellCompendium = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'src', 'dnd-data', 'spell-compendium.json'), 'utf8')
    );
    const rawSpells = Array.isArray(spellCompendium.spell) ? spellCompendium.spell : [];

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
        // 1. Insert Primary Character (Dorian)
        const classesList = Array.isArray(characterData.identity?.classes)
            ? characterData.identity.classes
            : [];
        const totalLevel = classesList.reduce((sum, c) => sum + (parseInt(c.level, 10) || 0), 0) || 1;
        const classesSummary = classesList
            .map(c => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
            .join(' / ');

        const insertCharacter = db.prepare(`
            INSERT INTO characters (
                id, user_id, name, race, total_level, classes_summary,
                identity_json, vitals_json, attributes_json, skills_json,
                inventory_json, magic_json, combat_json, progression_json,
                conditions_json, concentration_json, death_saves_json, status_notes,
                version, schema_version
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                1, 1
            )
        `);

        const characterId = 'dorian-gray';
        insertCharacter.run(
            characterId,
            'default-user',
            characterData.identity?.name || 'Dorian',
            characterData.identity?.race || 'Unknown',
            totalLevel,
            classesSummary || 'Level 1',
            JSON.stringify(characterData.identity || {}),
            JSON.stringify(characterData.vitals || {}),
            JSON.stringify(characterData.attributes || {}),
            JSON.stringify(characterData.skills || []),
            JSON.stringify(characterData.inventory || {}),
            JSON.stringify(characterData.magic || {}),
            JSON.stringify(characterData.combat || {}),
            JSON.stringify(characterData.progression || {}),
            JSON.stringify(characterData.conditions || []),
            JSON.stringify(characterData.concentration || { active: false, spellName: '' }),
            JSON.stringify(characterData.deathSaves || { successes: [false, false, false], failures: [false, false, false] }),
            String(characterData.statusNotes || '')
        );

        // 2. Insert Session Logs
        const insertLog = db.prepare(`
            INSERT INTO session_logs (id, character_id, entry_text, timestamp)
            VALUES (?, ?, ?, ?)
        `);

        const sessionLogs = Array.isArray(characterData.sessionLog) ? characterData.sessionLog : [];
        sessionLogs.forEach((entry, idx) => {
            const logId = entry.id ? String(entry.id) : `log-${idx + 1}`;
            const text = typeof entry === 'string' ? entry : (entry.text || JSON.stringify(entry));
            const time = entry.time || entry.timestamp || new Date().toISOString();
            insertLog.run(logId, characterId, text, String(time));
        });

        // 3. Insert Compendium Spells (deduplicated by name/slug)
        const insertSpell = db.prepare(`
            INSERT INTO compendium_spells (
                id, name, source_book, level, school, casting_time,
                range, duration, concentration, ritual, classes_json, data_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const seenSpellNames = new Set();
        const seenSpellSlugs = new Set();
        let spellsInserted = 0;

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

            insertSpell.run(
                slug,
                normName,
                String(sp.source || 'PHB'),
                Math.max(0, Math.min(9, level)),
                school,
                castingTime,
                range,
                duration,
                concentration,
                ritual,
                JSON.stringify(classes),
                JSON.stringify(sp)
            );
            spellsInserted++;
        }

        // 4. Insert Compendium Classes
        const insertClass = db.prepare(`
            INSERT INTO compendium_classes (
                id, name, hit_die, spellcasting_ability, caster_progression, data_json
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        let classesInserted = 0;
        for (const [key, cls] of Object.entries(classCompendium)) {
            const id = slugify(key);
            const name = cls.name || key;
            const hitDie = cls.hitDie || 'd8';
            const spellAbility = cls.spellcasting?.ability || '';
            const casterProg = cls.spellcasting?.casterType || 'none';

            insertClass.run(
                id,
                name,
                hitDie,
                spellAbility,
                casterProg,
                JSON.stringify(cls)
            );
            classesInserted++;
        }

        // 5. Insert Compendium Backgrounds
        const insertBackground = db.prepare(`
            INSERT INTO compendium_backgrounds (
                id, name, source_book, skills_json, data_json
            ) VALUES (?, ?, ?, ?, ?)
        `);

        let backgroundsInserted = 0;
        for (const [key, bg] of Object.entries(backgroundCompendium)) {
            const id = slugify(key);
            const name = bg.name || key;
            const sourceBook = bg.source || 'PHB';
            const skills = Array.isArray(bg.skillProficiencies) ? bg.skillProficiencies : [];

            insertBackground.run(
                id,
                name,
                sourceBook,
                JSON.stringify(skills),
                JSON.stringify(bg)
            );
            backgroundsInserted++;
        }

        db.exec('COMMIT;');

        // Run integrity and foreign key verification
        const integrityResult = db.prepare('PRAGMA integrity_check;').get();
        const fkErrors = db.prepare('PRAGMA foreign_key_check;').all();

        if (integrityResult?.integrity_check !== 'ok' || fkErrors.length > 0) {
            throw new Error(
                `Database integrity verification failed: integrity=${JSON.stringify(integrityResult)}, fkErrors=${JSON.stringify(fkErrors)}`
            );
        }

        // Checkpoint WAL into main database file so DorianDndApp.db is a single self-contained file
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
        db.exec('PRAGMA journal_mode = DELETE;');

        console.log('====================================================');
        console.log('DorianDndApp.db created and verified successfully!');
        console.log(`- File: ${DB_FILE_PATH}`);
        console.log(`- Integrity Check: ${integrityResult.integrity_check.toUpperCase()}`);
        console.log(`- Characters seeded: 1 (${characterData.identity?.name} - Level ${totalLevel})`);
        console.log(`- Session logs seeded: ${sessionLogs.length}`);
        console.log(`- Spells seeded: ${spellsInserted}`);
        console.log(`- Classes seeded: ${classesInserted}`);
        console.log(`- Backgrounds seeded: ${backgroundsInserted}`);
        console.log('====================================================');
    } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
    } finally {
        db.close();
    }
}

buildDatabase();
