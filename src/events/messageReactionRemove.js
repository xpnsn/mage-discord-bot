'use strict';

const selfRoles = require('../config/selfRoles');

module.exports = {
    name: 'messageReactionRemove',
    async execute(client, reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();
        } catch (error) {
            console.error('Failed to fetch partial reaction:', error);
            return;
        }

        const { message } = reaction;
        if (!message.guild) return;

        const panel = selfRoles.findPanelByMessage(message.guild.id, message.id);
        if (!panel) return;

        const emojiKey = reaction.emoji.id || reaction.emoji.name;
        const mapping = panel.roles[emojiKey];
        if (!mapping) return;

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        try {
            if (member.roles.cache.has(mapping.roleId)) {
                await member.roles.remove(mapping.roleId);
            }
        } catch (error) {
            console.error('Failed to remove self-role:', error);
        }
    },
};