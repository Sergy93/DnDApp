/**
 * Shared utility helpers for Cloudflare Pages Functions API.
 */

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

/**
 * Maps a SQLite/D1 characters row to a full character document matching client schema.
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

/**
 * Prepares character object for SQL INSERT / UPSERT into D1.
 */
export function extractCharacterDbPayload(char, userId) {
    const id = char.id || 'char_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const name = char.identity?.name || char.name || 'Character';
    const race = char.identity?.race || char.race || 'Unknown';
    const classes = char.identity?.classes || [];
    const totalLevel = Math.max(1, Math.min(20, classes.reduce((sum, c) => sum + (c.level || 0), 0) || Number(char.total_level) || 1));
    const classesSummary = classes.length > 0
        ? classes.map(c => `${c.name || 'Class'}${c.subclass ? ` (${c.subclass})` : ''} ${c.level || 1}`).join(' / ')
        : (char.classes_summary || `Level ${totalLevel}`);

    const slug = char.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'character';
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
