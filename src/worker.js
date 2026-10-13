import htmlContent from './index.html';

export default {
  async fetch(request, env, ctx) {
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
      },
    });
  },
};