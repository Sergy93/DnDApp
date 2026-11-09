import {
    jsonResponse,
    errorResponse,
    mapDbRowToCharacter,
    extractCharacterDbPayload,
    getCharacterPayloadValues,
    CHARACTER_UPSERT_SQL,
    ensureCharactersSchema
} from './_utils.js';

export async function onRequestPost(context) {
    const { userId } = context.data;
    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    const runSync = async (isRetry = false) => {
        try {
            const body = await context.request.json().catch(() => ({}));
            const lastSyncTimestamp = Number(body.lastSyncTimestamp) || 0;
            const localChanges = Array.isArray(body.localChanges) ? body.localChanges : [];
            const localDeletions = Array.isArray(body.localDeletions) ? body.localDeletions : [];

            const statements = [];
            const now = Date.now();

            // 1. Process local deletions
            for (const delId of localDeletions) {
                statements.push(
                    context.env.DB.prepare(`
                        DELETE FROM characters WHERE id = ? AND user_id = ?
                    `).bind(delId, userId)
                );
                statements.push(
                    context.env.DB.prepare(`
                        INSERT INTO character_tombstones (id, user_id, deleted_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET deleted_at = excluded.deleted_at
                    `).bind(delId, userId, now)
                );
            }

            // 2. Process local changes (Upsert with client_updated_at comparison)
            for (const char of localChanges) {
                const payload = extractCharacterDbPayload(char, userId);

                // Reconcile slug uniqueness: if a character already exists for this user with the same slug but a different id,
                // replace the conflicting row so (user_id, slug) unique constraint is satisfied.
                statements.push(
                    context.env.DB.prepare(`
                        DELETE FROM characters
                        WHERE user_id = ? AND slug = ? AND id != ?
                    `).bind(userId, payload.slug, payload.id)
                );

                statements.push(
                    context.env.DB.prepare(CHARACTER_UPSERT_SQL).bind(
                        ...getCharacterPayloadValues(payload)
                    )
                );
                statements.push(
                    context.env.DB.prepare(`
                        DELETE FROM character_tombstones WHERE id = ? AND user_id = ?
                    `).bind(payload.id, userId)
                );
            }

            if (statements.length > 0) {
                await context.env.DB.batch(statements);
            }

            // 3. Fetch remote changes modified since lastSyncTimestamp
            const serverChangesStmt = context.env.DB.prepare(`
                SELECT * FROM characters
                WHERE (user_id = ? OR (user_id = 'default-user' AND ? IN ('default-user', 'dev-user@local')))
                  AND client_updated_at > ?
                ORDER BY client_updated_at ASC
            `).bind(userId, userId, lastSyncTimestamp);

            const { results: rawChanges } = await serverChangesStmt.all();
            const serverChanges = (rawChanges || []).map(mapDbRowToCharacter);

            // 4. Fetch remote tombstones deleted since lastSyncTimestamp
            const serverDeletionsStmt = context.env.DB.prepare(`
                SELECT id, deleted_at FROM character_tombstones
                WHERE user_id = ? AND deleted_at > ?
                ORDER BY deleted_at ASC
            `).bind(userId, lastSyncTimestamp);

            const { results: rawDeletions } = await serverDeletionsStmt.all();
            const serverDeletions = rawDeletions || [];

            return jsonResponse({
                success: true,
                serverChanges,
                serverDeletions,
                syncTimestamp: now
            });
        } catch (err) {
            if (!isRetry && err.message && err.message.includes('no such table')) {
                await ensureCharactersSchema(context.env.DB);
                return runSync(true);
            }
            return errorResponse('Failed to execute sync batch', 500, err.message);
        }
    };

    return runSync(false);
}

/**
 * Health check & diagnostic endpoint for GET /api/sync
 */
export async function onRequestGet(context) {
    const { userId } = context.data;
    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

    try {
        let characters;
        try {
            characters = await context.env.DB.prepare(`
                SELECT id, slug, name, client_updated_at FROM characters WHERE user_id = ?
            `).bind(userId).all();
        } catch (dbErr) {
            if (dbErr.message && dbErr.message.includes('no such table')) {
                await ensureCharactersSchema(context.env.DB);
                characters = await context.env.DB.prepare(`
                    SELECT id, slug, name, client_updated_at FROM characters WHERE user_id = ?
                `).bind(userId).all();
            } else {
                throw dbErr;
            }
        }

        const count = characters?.results ? characters.results.length : 0;
        return jsonResponse({
            success: true,
            status: 'operational',
            method: 'GET',
            message: 'Sync API is active. To perform bidirectional sync, send a POST request with localChanges and lastSyncTimestamp.',
            userId,
            characterCount: count,
            characters: characters?.results || [],
            serverTimestamp: Date.now()
        });
    } catch (err) {
        return errorResponse('Sync diagnostic check failed', 500, err.message);
    }
}
