'use strict';

const reactionRoleStore = require('../embeds/reactionRoleStore');

function emojiKey(emoji) {
    return emoji.id ?? emoji.name;
}

module.exports = {
    name: 'messageReactionAdd',
    async execute(client, reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();
        } catch (error) {
            console.error('[ReactionRoles] Failed to fetch partial reaction:', error);
            return;
        }

        const { message } = reaction;
        if (!message.guild) return;

        const roleId = reactionRoleStore.getRoleForReaction(message.guild.id, message.id, emojiKey(reaction.emoji));
        if (!roleId) return;

        const role = message.guild.roles.cache.get(roleId);
        if (!role) return;

        const botMember = message.guild.members.me;
        if (role.position >= botMember.roles.highest.position) return;

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member || member.roles.cache.has(role.id)) return;

        await member.roles.add(role).catch(error => {
            console.error(`[ReactionRoles] Failed to add role ${role.id} to ${user.id}:`, error);
        });
    },
};
