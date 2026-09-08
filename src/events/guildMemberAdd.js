'use strict';

const welcomeEmbed = require('../embeds/welcome');
const { getChannel, getRole } = require('../config/guildConfig');
const { resolveEventEmbed } = require('../utils/embedResolver');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        const channelId = getChannel(member.guild.id, 'welcome');
        const roleId = getRole(member.guild.id, 'welcome');

        const channel = channelId && member.guild.channels.cache.get(channelId);
        const role = roleId && member.guild.roles.cache.get(roleId);

        if (!channel) return;

        if (!role) {
            console.error('Welcome role not found.');
            return;
        }

        try {
            await member.roles.add(role);
        } catch (error) {
            console.error('Failed to assign welcome role:', error);
        }

        const embed = resolveEventEmbed(
            member.guild.id,
            'welcome',
            {
                userMention: `<@${member.id}>`,
                username: member.user.username,
                serverName: member.guild.name,
                memberCount: member.guild.memberCount,
            },
            () => welcomeEmbed(member)
        );

        await channel.send({
            content: `Hey <@${member.id}>!`,
            embeds: [embed],
        });
    },
};
