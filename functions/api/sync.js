import { jsonResponse, errorResponse, mapDbRowToCharacter, extractCharacterDbPayload } from './_utils.js';

export async function onRequestPost(context) {
    const { userId } = context.data;
    if (!context.env.DB) {
        return errorResponse('Database binding DB is missing', 500);
    }

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
            statements.push(
                context.env.DB.prepare(`
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
        return errorResponse('Failed to execute sync batch', 500, err.message);
    }
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
        const characters = await context.env.DB.prepare(`
            SELECT id, slug, name, client_updated_at FROM characters WHERE user_id = ?
        `).bind(userId).all();

        const count = characters.results ? characters.results.length : 0;
        return jsonResponse({
            success: true,
            status: 'operational',
            method: 'GET',
            message: 'Sync API is active. To perform bidirectional sync, send a POST request with localChanges and lastSyncTimestamp.',
            userId,
            characterCount: count,
            characters: characters.results || [],
            serverTimestamp: Date.now()
        });
    } catch (err) {
        return errorResponse('Sync diagnostic check failed', 500, err.message);
    }
}
