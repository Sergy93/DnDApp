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
