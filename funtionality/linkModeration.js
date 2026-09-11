'use strict';

const { getRole } = require('../src/config/guildConfig');

// Matches:
// https://example.com
// http://example.com
// www.example.com
// example.com
// discord.gg/example
// discord.com/invite/example
const LINK_REGEX =
    /(?:https?:\/\/|www\.)\S+|(?:^|\s)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/\S*)?/i;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Ignore DMs
        if (!message.guild) return;

        // Ignore bots
        if (message.author.bot) return;

        // Ignore messages without links
        if (!LINK_REGEX.test(message.content)) return;

        const linkPermRoleId = getRole(message.guild.id, 'link');

        // Safety check in case the role isn't configured
        if (!linkPermRoleId) {
            console.warn('Link-permission role is not configured. Use /config set-role type:Link.');
            return;
        }

        // User has permission to send links
        if (message.member.roles.cache.has(linkPermRoleId) || message.member.permissions.has('Administrator')) {
            return;
        }

        try {
            await message.delete();

            // Optional warning
            const warning = await message.channel.send({
                content: `${message.author}, you don't have permission to send links here. 🔗`,
            });

            setTimeout(() => {
                warning.delete().catch(() => {});
            }, 5000);

        } catch (error) {
            console.error('Failed to delete unauthorized link:', error);
        }
    });
};