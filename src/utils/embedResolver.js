'use strict';

const { getBoundEmbedName } = require('../config/guildConfig');
const { getEmbed, buildEmbed } = require('../embeds/embedStore');

/**
 * Returns the embed to use for a lifecycle event (welcome/leave/boost).
 *
 * If an admin bound a custom embed via `/embed bind`, it's built (with
 * placeholders filled in) and returned. Otherwise `fallbackFn` is called
 * to build the original hardcoded embed for that event, so servers that
 * haven't configured anything keep the exact same behavior.
 */
function resolveEventEmbed(guildId, eventKey, context, fallbackFn) {
    const boundName = getBoundEmbedName(guildId, eventKey);

    if (boundName) {
        const fields = getEmbed(guildId, boundName);

        if (fields) {
            return buildEmbed(fields, context);
        }

        console.warn(
            `[EmbedResolver] Guild ${guildId} has "${eventKey}" bound to missing embed "${boundName}" — falling back to default.`
        );
    }

    return fallbackFn();
}

module.exports = { resolveEventEmbed };
