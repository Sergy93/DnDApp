import { slugify } from '../../helpers/string.helper.js';

/**
 * Single Source of Truth (SSOT) for Character Database Schema & Serialization.
 * Unifies table column definitions, parameter ordering, payload extraction, and SQL UPSERT generation.
 */

export const CHARACTER_COLUMNS = Object.freeze([
    'id',
    'user_id',
    'slug',
    'name',
    'race',
    'total_level',
    'classes_summary',
    'identity_json',
    'vitals_json',
    'attributes_json',
    'skills_json',
    'inventory_json',
    'magic_json',
    'combat_json',
    'progression_json',
    'conditions_json',
    'concentration_json',
    'death_saves_json',
    'status_notes',
    'quests_json',
    'campaign_notes',
    'version',
    'schema_version',
    'client_updated_at'
]);

export const CHARACTER_UPSERT_SQL = `
INSERT INTO characters (
    id, user_id, slug, name, race, total_level, classes_summary,
    identity_json, vitals_json, attributes_json, skills_json,
    inventory_json, magic_json, combat_json, progression_json,
    conditions_json, concentration_json, death_saves_json, status_notes,
    quests_json, campaign_notes,
    version, schema_version, client_updated_at
) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?,
    ?, ?, ?
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
    version = excluded.version,
    client_updated_at = excluded.client_updated_at,
    updated_at = datetime('now')
WHERE characters.client_updated_at <= excluded.client_updated_at;
`.trim();

/**
 * Extracts and serializes a character document into flat D1 / SQLite database parameters.
 * @param {Object} char - Full or partial character object.
 * @param {string} userId - User identifier.
 * @returns {Object} Database payload indexed by column name.
 */
export function extractCharacterDbPayload(char = {}, userId = 'default-user') {
    const id = char.id || 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const name = char.identity?.name || char.name || 'Character';
    const race = char.identity?.race || char.race || 'Unknown';
    const classes = char.identity?.classes || [];
    const totalLevel = Math.max(1, Math.min(20, classes.reduce((sum, c) => sum + (c.level || 0), 0) || Number(char.total_level) || 1));
    const classesSummary = classes.length > 0
        ? classes.map(c => `${c.name || 'Class'}${c.subclass ? ` (${c.subclass})` : ''} ${c.level || 1}`).join(' / ')
        : (char.classes_summary || `Level ${totalLevel}`);

    const slug = char.slug || slugify(name);
    const clientUpdatedAt = Number(char.client_updated_at || char.clientUpdatedAt || Date.now());

    return {
        id,
        user_id: userId,
        slug,
        name,
        race,
        total_level: totalLevel,
        classes_summary: classesSummary,
        identity_json: JSON.stringify(char.identity || {}),
        vitals_json: JSON.stringify(char.vitals || {}),
        attributes_json: JSON.stringify(char.attributes || {}),
        skills_json: JSON.stringify(char.skills || []),
        inventory_json: JSON.stringify(char.inventory || {}),
        magic_json: JSON.stringify(char.magic || {}),
        combat_json: JSON.stringify(char.combat || {}),
        progression_json: JSON.stringify(char.progression || {}),
        conditions_json: JSON.stringify(char.conditions || []),
        concentration_json: JSON.stringify(char.concentration || { active: false, spellName: '' }),
        death_saves_json: JSON.stringify(char.deathSaves || char.death_saves || { successes: [false, false, false], failures: [false, false, false] }),
        status_notes: String(char.statusNotes || char.status_notes || ''),
        quests_json: JSON.stringify(char.quests || []),
        campaign_notes: String(char.campaignNotes || char.campaign_notes || ''),
        version: Number(char.version) || 1,
        schema_version: Number(char.schema_version) || 1,
        client_updated_at: clientUpdatedAt
    };
}

/**
 * Returns payload values as an ordered array corresponding strictly to CHARACTER_COLUMNS.
 * @param {Object} payload - Object returned by extractCharacterDbPayload.
 * @returns {Array} Ordered parameter values for db.prepare(...).bind(...).
 */
export function getCharacterPayloadValues(payload) {
    return CHARACTER_COLUMNS.map(col => payload[col]);
}

/**
 * Maps a SQLite/D1 characters row to a full character document matching client schema.
 * @param {Object} row - Raw SQL row.
 * @returns {Object|null}
 */
export function mapDbRowToCharacter(row) {
    if (!row) return null;

    const safeParse = (str, fallback) => {
        if (!str) return fallback;
        try {
            return JSON.parse(str);
        } catch {
            return fallback;
        }
    };

    return {
        id: row.id,
        slug: row.slug,
        version: row.version || 1,
        schema_version: row.schema_version || 1,
        client_updated_at: Number(row.client_updated_at) || Date.now(),
        identity: safeParse(row.identity_json, { name: row.name, race: row.race }),
        vitals: safeParse(row.vitals_json, {}),
        attributes: safeParse(row.attributes_json, {}),
        skills: safeParse(row.skills_json, []),
        inventory: safeParse(row.inventory_json, {}),
        magic: safeParse(row.magic_json, {}),
        combat: safeParse(row.combat_json, {}),
        progression: safeParse(row.progression_json, {}),
        conditions: safeParse(row.conditions_json, []),
        concentration: safeParse(row.concentration_json, { active: false, spellName: '' }),
        deathSaves: safeParse(row.death_saves_json, { successes: [false, false, false], failures: [false, false, false] }),
        statusNotes: row.status_notes || '',
        quests: safeParse(row.quests_json, []),
        campaignNotes: row.campaign_notes || '',
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
