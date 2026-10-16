import htmlContent from './index.html';

export default {
  async fetch(request, env, ctx) {
    // If Cloudflare ASSETS binding exists, let it serve static files first
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.html')) {
      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
        },
      });
    }

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  },
};