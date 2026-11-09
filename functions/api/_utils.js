/**
 * Shared utility helpers for Cloudflare Pages Functions API.
 */

export {
    CHARACTER_COLUMNS,
    CHARACTER_UPSERT_SQL,
    extractCharacterDbPayload,
    getCharacterPayloadValues,
    mapDbRowToCharacter
} from '../../src/domain/character/character-db.schema.js';

export function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, cf-access-jwt-assertion, x-user-id, x-user-email',
            ...extraHeaders
        }
    });
}

export function errorResponse(message, status = 400, details = null) {
    return jsonResponse({
        success: false,
        error: message,
        details
    }, status);
}

export async function ensureCharactersSchema(db) {
    if (!db || typeof db.prepare !== 'function') return;
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                race TEXT NOT NULL,
                total_level INTEGER NOT NULL,
                classes_summary TEXT NOT NULL,
                identity_json TEXT NOT NULL,
                vitals_json TEXT NOT NULL,
                attributes_json TEXT NOT NULL,
                skills_json TEXT NOT NULL DEFAULT '[]',
                inventory_json TEXT NOT NULL,
                magic_json TEXT NOT NULL,
                combat_json TEXT NOT NULL,
                progression_json TEXT NOT NULL,
                conditions_json TEXT NOT NULL DEFAULT '[]',
                concentration_json TEXT NOT NULL DEFAULT '{"active":false,"spellName":""}',
                death_saves_json TEXT NOT NULL DEFAULT '{"successes":[false,false,false],"failures":[false,false,false]}',
                status_notes TEXT NOT NULL DEFAULT '',
                quests_json TEXT NOT NULL DEFAULT '[]',
                campaign_notes TEXT NOT NULL DEFAULT '',
                version INTEGER NOT NULL DEFAULT 1,
                schema_version INTEGER NOT NULL DEFAULT 1,
                client_updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `).run();

        await db.prepare(`
            CREATE TABLE IF NOT EXISTS character_tombstones (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                deleted_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
            );
        `).run();
    } catch {
        // Schema auto-creation is best effort
    }
}
