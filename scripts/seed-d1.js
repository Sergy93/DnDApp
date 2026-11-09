import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
    CHARACTER_COLUMNS,
    extractCharacterDbPayload
} from '../src/domain/character/character-db.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CHARACTER_FILE = path.join(ROOT_DIR, 'src', 'character.json');

export function generateSeedSql(characterData = null, userId = 'default-user') {
    if (!characterData) {
        characterData = JSON.parse(fs.readFileSync(CHARACTER_FILE, 'utf8'));
    }

    const payload = extractCharacterDbPayload({
        id: 'dorian-gray',
        slug: 'dorian',
        ...characterData
    }, userId);

    function escapeSql(val) {
        if (val === null || val === undefined) return "''";
        if (typeof val === 'number') return String(val);
        return "'" + String(val).replace(/'/g, "''") + "'";
    }

    const valueList = CHARACTER_COLUMNS.map(col => escapeSql(payload[col])).join(', ');
    const updateClauses = CHARACTER_COLUMNS
        .filter(c => c !== 'id' && c !== 'user_id' && c !== 'schema_version')
        .map(c => `    ${c} = excluded.${c}`)
        .join(',\n');

    return `
INSERT INTO characters (
    ${CHARACTER_COLUMNS.join(', ')}
) VALUES (
    ${valueList}
)
ON CONFLICT(id) DO UPDATE SET
${updateClauses},
    updated_at = datetime('now');
`.trim();
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('seed-d1.js')) {
    const isRemote = process.argv.includes('--remote');
    const targetFlag = isRemote ? '--remote' : '--local';
    const sql = generateSeedSql();
    const tempSqlPath = path.join(ROOT_DIR, '.temp-seed.sql');

    try {
        fs.writeFileSync(tempSqlPath, sql, 'utf8');
        console.log(`[D1 Seed] Seeding Dorian into Cloudflare D1 (${targetFlag})...`);
        execSync(`npx wrangler d1 execute DorianDndApp ${targetFlag} --file="${tempSqlPath}"`, {
            cwd: ROOT_DIR,
            stdio: 'inherit'
        });
        console.log(`[D1 Seed] Seed completed successfully.`);
    } finally {
        if (fs.existsSync(tempSqlPath)) {
            fs.unlinkSync(tempSqlPath);
        }
    }
}
