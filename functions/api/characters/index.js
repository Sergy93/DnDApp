import {
    jsonResponse,
    errorResponse,
    extractCharacterDbPayload,
    getCharacterPayloadValues,
    CHARACTER_UPSERT_SQL
} from '../_utils.js';

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

        const deleteConflictingSlugStmt = context.env.DB.prepare(`
            DELETE FROM characters WHERE user_id = ? AND slug = ? AND id != ?
        `).bind(userId, payload.slug, payload.id);

        const upsertStmt = context.env.DB.prepare(CHARACTER_UPSERT_SQL).bind(
            ...getCharacterPayloadValues(payload)
        );

        const deleteTombstoneStmt = context.env.DB.prepare(`
            DELETE FROM character_tombstones WHERE id = ? AND user_id = ?
        `).bind(payload.id, userId);

        await context.env.DB.batch([deleteConflictingSlugStmt, upsertStmt, deleteTombstoneStmt]);

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
