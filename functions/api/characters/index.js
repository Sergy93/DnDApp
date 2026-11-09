import { jsonResponse, errorResponse, extractCharacterDbPayload } from '../_utils.js';

export async function onRequestGet(context) {
    const { userId } = context.data;
    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    try {
        const stmt = context.env.DB.prepare(`
            SELECT id, user_id, slug, name, race, total_level, classes_summary, client_updated_at, created_at, updated_at
            FROM characters
            WHERE user_id = ? OR (user_id = 'default-user' AND ? IN ('default-user', 'dev-user@local'))
            ORDER BY client_updated_at DESC
        `).bind(userId, userId);

        const { results } = await stmt.all();
        return jsonResponse({
            success: true,
            characters: results || []
        });
    } catch (err) {
        return errorResponse('Failed to fetch characters', 500, err.message);
    }
}

export async function onRequestPost(context) {
    const { userId } = context.data;
    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    try {
        const body = await context.request.json();
        const rawChar = body.character || body;
        const payload = extractCharacterDbPayload(rawChar, userId);

        const upsertStmt = context.env.DB.prepare(`
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
            WHERE characters.client_updated_at <= excluded.client_updated_at
        `).bind(
            payload.id,
            payload.user_id,
            payload.slug,
            payload.name,
            payload.race,
            payload.total_level,
            payload.classes_summary,
            payload.identity_json,
            payload.vitals_json,
            payload.attributes_json,
            payload.skills_json,
            payload.inventory_json,
            payload.magic_json,
            payload.combat_json,
            payload.progression_json,
            payload.conditions_json,
            payload.concentration_json,
            payload.death_saves_json,
            payload.status_notes,
            payload.quests_json,
            payload.campaign_notes,
            payload.version,
            payload.schema_version,
            payload.client_updated_at
        );

        const deleteTombstoneStmt = context.env.DB.prepare(`
            DELETE FROM character_tombstones WHERE id = ? AND user_id = ?
        `).bind(payload.id, userId);

        await context.env.DB.batch([upsertStmt, deleteTombstoneStmt]);

        return jsonResponse({
            success: true,
            character: {
                id: payload.id,
                slug: payload.slug,
                client_updated_at: payload.client_updated_at
            }
        });
    } catch (err) {
        return errorResponse('Failed to upsert character', 500, err.message);
    }
}
