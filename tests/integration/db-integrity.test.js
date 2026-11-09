import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateCompendiumSql } from '../../scripts/seed-compendium-d1.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const SEED_SQL_PATH = path.join(ROOT_DIR, 'db', 'compendium-seed.sql');

test('Cloudflare D1 Compendium SQL Seed Integrity', async (t) => {
    await t.test('generateCompendiumSql generates valid D1 SQL statements from JSON compendiums', () => {
        const sql = generateCompendiumSql();
        assert.ok(sql.length > 500000, 'Seed SQL should contain comprehensive statements');

        // Check statement counts
        const classInserts = (sql.match(/INSERT OR REPLACE INTO compendium_classes/g) || []).length;
        const raceInserts = (sql.match(/INSERT OR REPLACE INTO compendium_races/g) || []).length;
        const bgInserts = (sql.match(/INSERT OR REPLACE INTO compendium_backgrounds/g) || []).length;
        const spellInserts = (sql.match(/INSERT OR REPLACE INTO compendium_spells/g) || []).length;

        assert.equal(classInserts, 13, 'Must seed all 13 canonical classes');
        assert.equal(raceInserts, 11, 'Must seed all 11 canonical races');
        assert.equal(bgInserts, 20, 'Must seed all 20 canonical backgrounds');
        assert.equal(spellInserts, 477, 'Must seed all 477 canonical spells');
    });

    await t.test('compendium-seed.sql file exists and is populated without local db', () => {
        assert.ok(fs.existsSync(SEED_SQL_PATH), 'compendium-seed.sql must exist');
        const content = fs.readFileSync(SEED_SQL_PATH, 'utf8');
        assert.ok(content.includes('compendium_spells'), 'Seed SQL must contain spell data');
        assert.ok(content.includes('compendium_classes'), 'Seed SQL must contain class data');
    });
});
