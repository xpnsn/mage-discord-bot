'use strict';

const { getRole } = require('../src/config/guildConfig');

// Explicit check for well-known GIF sites whose domains don't happen to
// contain the word "gif" itself, so the keyword check below wouldn't
// catch a bare link to them.
const GIF_DOMAIN_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:tenor\.com|c\.tenor\.com|giphy\.com|media\.giphy\.com|gfycat\.com|redgifs\.com)\/\S+/i;

// Catch-all for every other GIF site (klipy, gifer, makeagif, gfycat,
// reddit.com/r/gifs, a bare .gif file link, etc.) — anywhere a link
// contains "gif" as a distinct word. The negative lookahead skips
// "gift"/"gifted"/"gifting" so normal links aren't misflagged.
const GIF_KEYWORD_REGEX = /gif(?!t)/i;

// A single "word" that looks like a link, tested per-token rather than
// against the whole message so that ordinary sentences containing "gif"
// or "link"-looking words (with no actual URL) are left alone.
const LINK_TOKEN_REGEX =
    /^(?:https?:\/\/|www\.)\S+$|^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/\S*)?$/i;

function hasGifAttachment(message) {
    return message.attachments.some(
        (attachment) =>
            attachment.contentType === 'image/gif' || (attachment.name || '').toLowerCase().endsWith('.gif')
    );
}

function getLinkTokens(content) {
    return content.split(/\s+/).filter((token) => LINK_TOKEN_REGEX.test(token));
}

function isGifToken(token) {
    return GIF_DOMAIN_REGEX.test(token) || GIF_KEYWORD_REGEX.test(token);
}

/**
 * Returns 'gif', 'link', or null (nothing to moderate) for a message.
 * A message with any gif-looking link is classified as a gif even if it
 * also contains other links, since gif permission is checked first.
 */
function classify(message) {
    if (hasGifAttachment(message)) return 'gif';

    const linkTokens = getLinkTokens(message.content);
    if (!linkTokens.length) return null;

    return linkTokens.some(isGifToken) ? 'gif' : 'link';
}

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Ignore DMs
        if (!message.guild) return;

        // Ignore bots
        if (message.author.bot) return;

        const kind = classify(message);
        if (!kind) return;

        const permittedRoleId = getRole(message.guild.id, kind);

        // Safety check in case the role isn't configured
        if (!permittedRoleId) {
            const label = kind === 'gif' ? 'Gif' : 'Link';
            console.warn(`${label}-permission role is not configured. Use /config set-role type:${label}.`);
            return;
        }

        // User has permission to send this type of content
        if (message.member.roles.cache.has(permittedRoleId) || message.member.permissions.has('Administrator')) {
            return;
        }

        try {
            await message.delete();

            const warning = await message.channel.send({
                content: `${message.author}, you don't have permission to send ${kind === 'gif' ? 'GIFs' : 'links'} here. ${kind === 'gif' ? '🎞️' : '🔗'}`,
            });

            setTimeout(() => {
                warning.delete().catch(() => {});
            }, 5000);

        } catch (error) {
            console.error(`Failed to delete unauthorized ${kind}:`, error);
        }
    });
};