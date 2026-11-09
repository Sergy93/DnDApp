import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CHARACTER_FILE = path.join(ROOT_DIR, 'src', 'character.json');

export function generateSeedSql(characterData = null, userId = 'default-user') {
    if (!characterData) {
        characterData = JSON.parse(fs.readFileSync(CHARACTER_FILE, 'utf8'));
    }

    const id = characterData.id || 'dorian-gray';
    const slug = characterData.slug || 'dorian';
    const name = characterData.identity?.name || 'Dorian';
    const race = characterData.identity?.race || 'Custom Lineage';
    const classes = characterData.identity?.classes || [];
    const totalLevel = classes.reduce((sum, c) => sum + (c.level || 0), 0) || 1;
    const classesSummary = classes
        .map(c => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
        .join(' / ') || 'Level 1';

    const nowMs = Date.now();

    function escapeSql(val) {
        if (val === null || val === undefined) return "''";
        return "'" + String(val).replace(/'/g, "''") + "'";
    }

    const identityJson = escapeSql(JSON.stringify(characterData.identity || {}));
    const vitalsJson = escapeSql(JSON.stringify(characterData.vitals || {}));
    const attributesJson = escapeSql(JSON.stringify(characterData.attributes || {}));
    const skillsJson = escapeSql(JSON.stringify(characterData.skills || []));
    const inventoryJson = escapeSql(JSON.stringify(characterData.inventory || {}));
    const magicJson = escapeSql(JSON.stringify(characterData.magic || {}));
    const combatJson = escapeSql(JSON.stringify(characterData.combat || {}));
    const progressionJson = escapeSql(JSON.stringify(characterData.progression || {}));
    const conditionsJson = escapeSql(JSON.stringify(characterData.conditions || []));
    const concentrationJson = escapeSql(JSON.stringify(characterData.concentration || { active: false, spellName: '' }));
    const deathSavesJson = escapeSql(JSON.stringify(characterData.deathSaves || { successes: [false, false, false], failures: [false, false, false] }));
    const statusNotes = escapeSql(characterData.statusNotes || '');
    const questsJson = escapeSql(JSON.stringify(characterData.quests || []));
    const campaignNotes = escapeSql(characterData.campaignNotes || '');

    return `
INSERT INTO characters (
    id, user_id, slug, name, race, total_level, classes_summary,
    identity_json, vitals_json, attributes_json, skills_json,
    inventory_json, magic_json, combat_json, progression_json,
    conditions_json, concentration_json, death_saves_json, status_notes,
    quests_json, campaign_notes,
    version, schema_version, client_updated_at
) VALUES (
    ${escapeSql(id)}, ${escapeSql(userId)}, ${escapeSql(slug)}, ${escapeSql(name)}, ${escapeSql(race)}, ${totalLevel}, ${escapeSql(classesSummary)},
    ${identityJson}, ${vitalsJson}, ${attributesJson}, ${skillsJson},
    ${inventoryJson}, ${magicJson}, ${combatJson}, ${progressionJson},
    ${conditionsJson}, ${concentrationJson}, ${deathSavesJson}, ${statusNotes},
    ${questsJson}, ${campaignNotes},
    1, 1, ${nowMs}
)
ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    name = excluded.name,
    race = excluded.race,
    total_level = excluded.total_level,
    classes_summary = excluded.classes_summary,
    identity_json = excluded.identity_json,
    vitals_json = excluded.vitals_json,
    attributes_json = excluded.attributes_json,
    skills_json = excluded.skills_json,
    inventory_json = excluded.inventory_json,
    magic_json = excluded.magic_json,
    combat_json = excluded.combat_json,
    progression_json = excluded.progression_json,
    conditions_json = excluded.conditions_json,
    concentration_json = excluded.concentration_json,
    death_saves_json = excluded.death_saves_json,
    status_notes = excluded.status_notes,
    quests_json = excluded.quests_json,
    campaign_notes = excluded.campaign_notes,
    client_updated_at = excluded.client_updated_at,
    updated_at = datetime('now');
`;
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed-d1.js')) {
    const isRemote = process.argv.includes('--remote');
    const flag = isRemote ? '--remote' : '--local';

    const tempSqlPath = path.join(ROOT_DIR, 'db', 'temp-seed.sql');
    try {
        const sql = generateSeedSql();
        fs.writeFileSync(tempSqlPath, sql, 'utf8');

        console.log(`Seeding character Dorian into Cloudflare D1 (${flag})...`);
        const out = execSync(`npx wrangler d1 execute DorianDndApp ${flag} --file=./db/temp-seed.sql`, {
            cwd: ROOT_DIR,
            encoding: 'utf8'
        });
        console.log(out);
        console.log(`[seed-d1] Dorian successfully seeded into D1 (${flag})!`);
    } finally {
        if (fs.existsSync(tempSqlPath)) {
            fs.unlinkSync(tempSqlPath);
        }
    }
}
