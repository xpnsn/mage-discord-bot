'use strict';

const leaveEmbed = require('../embeds/leave');
const { getChannel } = require('../config/guildConfig');
const { resolveEventEmbed } = require('../utils/embedResolver');

module.exports = {
    name: 'guildMemberRemove',
    async execute(client, member) {
        const channelId = getChannel(member.guild.id, 'leave');
        const channel = channelId && member.guild.channels.cache.get(channelId);

        if (!channel) return;

        const embed = resolveEventEmbed(
            member.guild.id,
            'leave',
            {
                userMention: `<@${member.id}>`,
                username: member.user.username,
                serverName: member.guild.name,
                memberCount: member.guild.memberCount,
            },
            () => leaveEmbed(member)
        );

        await channel.send({ embeds: [embed] });
    },
};
