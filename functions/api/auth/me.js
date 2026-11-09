import { jsonResponse } from '../_utils.js';

export async function onRequestGet(context) {
    const { userId, userEmail, isCloudflareAccess } = context.data;
    const authenticated = isCloudflareAccess || (userId !== 'default-user' && userId !== 'dev-user@local');

    return jsonResponse({
        success: true,
        authenticated,
        user: {
            id: userId,
            email: userEmail
        },
        mode: isCloudflareAccess ? 'cloudflare-access' : 'local'
    });
}
