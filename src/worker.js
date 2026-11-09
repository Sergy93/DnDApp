import { onRequest as middleware } from '../functions/api/_middleware.js';
import { onRequestGet as getAuthMe } from '../functions/api/auth/me.js';
import { onRequestGet as getCharacters, onRequestPost as postCharacters } from '../functions/api/characters/index.js';
import { onRequestGet as getCharacterBySlug, onRequestDelete as deleteCharacter } from '../functions/api/characters/[slug].js';
import { onRequestPost as postSync } from '../functions/api/sync.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. Silent fallback for favicon.ico if not in static assets
        if (url.pathname === '/favicon.ico') {
            if (env.ASSETS) {
                const assetRes = await env.ASSETS.fetch(request);
                if (assetRes.status !== 404) return assetRes;
            }
            return new Response(null, { status: 204 });
        }

        // 2. Route /api/* endpoints through Pages Functions handlers
        if (url.pathname.startsWith('/api/')) {
            const pathname = url.pathname.replace(/\/+$/, '');
            const context = {
                request,
                env,
                ctx,
                params: {},
                data: {}
            };

            const runApi = async () => {
                context.next = async () => {
                    if (pathname === '/api/auth/me' && request.method === 'GET') {
                        return getAuthMe(context);
                    }
                    if (pathname === '/api/characters') {
                        if (request.method === 'GET') return getCharacters(context);
                        if (request.method === 'POST') return postCharacters(context);
                    }
                    if (pathname.startsWith('/api/characters/')) {
                        const slug = decodeURIComponent(pathname.replace('/api/characters/', ''));
                        context.params.slug = slug;
                        if (request.method === 'GET') return getCharacterBySlug(context);
                        if (request.method === 'DELETE') return deleteCharacter(context);
                    }
                    if (pathname === '/api/sync' && request.method === 'POST') {
                        return postSync(context);
                    }

                    return new Response(JSON.stringify({
                        success: false,
                        error: `Endpoint not found: ${request.method} ${pathname}`
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                };

                return middleware(context);
            };

            try {
                return await runApi();
            } catch (err) {
                return new Response(JSON.stringify({
                    success: false,
                    error: err.message || 'Internal API Error'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 3. Fallback: serve static assets from ./src directory
        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return new Response('Not Found', { status: 404 });
    }
};
