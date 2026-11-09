/**
 * Middleware for Cloudflare Pages Functions API.
 * Handles CORS preflights and extracts Cloudflare Access identity / dev fallback.
 */

export async function onRequest(context) {
    // 1. Handle CORS preflight
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, cf-access-jwt-assertion, x-user-id, x-user-email',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // 2. Extract Cloudflare Access identity or fallback
    const cfUserEmail = context.request.headers.get('cf-access-authenticated-user-email');
    const customUserEmail = context.request.headers.get('x-user-email');
    const customUserId = context.request.headers.get('x-user-id');

    if (cfUserEmail) {
        context.data.userEmail = cfUserEmail.trim().toLowerCase();
        context.data.userId = context.data.userEmail;
        context.data.isCloudflareAccess = true;
    } else if (customUserEmail || customUserId) {
        context.data.userEmail = (customUserEmail || customUserId).trim().toLowerCase();
        context.data.userId = customUserId || context.data.userEmail;
        context.data.isCloudflareAccess = false;
    } else {
        // Local development or unauthenticated mode
        context.data.userEmail = 'dev-user@local';
        context.data.userId = 'default-user';
        context.data.isCloudflareAccess = false;
    }

    const response = await context.next();

    // Ensure CORS headers on all API responses
    const headers = new Headers(response.headers);
    if (!headers.has('Access-Control-Allow-Origin')) {
        headers.set('Access-Control-Allow-Origin', '*');
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}
