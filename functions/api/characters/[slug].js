import { jsonResponse, errorResponse, mapDbRowToCharacter } from '../_utils.js';

export async function onRequestGet(context) {
    const { userId } = context.data;
    const { slug } = context.params;

    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    try {
        const stmt = context.env.DB.prepare(`
            SELECT * FROM characters
            WHERE (user_id = ? OR (user_id = 'default-user' AND ? IN ('default-user', 'dev-user@local')))
              AND (slug = ? OR id = ?)
            LIMIT 1
        `).bind(userId, userId, slug, slug);

        const row = await stmt.first();
        if (!row) {
            return errorResponse(`Character '${slug}' not found`, 404);
        }

        const character = mapDbRowToCharacter(row);
        return jsonResponse({
            success: true,
            character
        });
    } catch (err) {
        return errorResponse('Failed to fetch character', 500, err.message);
    }
}

export async function onRequestDelete(context) {
    const { userId } = context.data;
    const { slug } = context.params;

    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    try {
        const findStmt = context.env.DB.prepare(`
            SELECT id FROM characters
            WHERE user_id = ? AND (slug = ? OR id = ?)
            LIMIT 1
        `).bind(userId, slug, slug);

        const row = await findStmt.first();
        if (!row) {
            return errorResponse(`Character '${slug}' not found`, 404);
        }

        const charId = row.id;
        const now = Date.now();

        const deleteStmt = context.env.DB.prepare(`
            DELETE FROM characters WHERE id = ? AND user_id = ?
        `).bind(charId, userId);

        const tombstoneStmt = context.env.DB.prepare(`
            INSERT INTO character_tombstones (id, user_id, deleted_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET deleted_at = excluded.deleted_at
        `).bind(charId, userId, now);

        await context.env.DB.batch([deleteStmt, tombstoneStmt]);

        return jsonResponse({
            success: true,
            deletedId: charId
        });
    } catch (err) {
        return errorResponse('Failed to delete character', 500, err.message);
    }
}
