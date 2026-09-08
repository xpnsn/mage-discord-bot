'use strict';

const boostEmbed = require('../embeds/boost');
const { getChannel, getRole } = require('../config/guildConfig');
const { resolveEventEmbed } = require('../utils/embedResolver');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(client, oldMember, newMember) {
        // Only care about a member who just started boosting.
        if (oldMember.premiumSince || !newMember.premiumSince) return;

        const boostRoleId = getRole(newMember.guild.id, 'boost');

        if (!boostRoleId) {
            console.warn('Boost role is not configured. Use /config set-role.');
            return;
        }

        try {
            if (!newMember.roles.cache.has(boostRoleId)) {
                await newMember.roles.add(boostRoleId);
            }
        } catch (error) {
            console.error('Failed to add booster role:', error);
        }

        const channelId = getChannel(newMember.guild.id, 'boost');

        if (!channelId) {
            console.warn('Boost channel is not configured. Use /config set-channel.');
            return;
        }

        const channel = newMember.guild.channels.cache.get(channelId);

        if (!channel) {
            console.warn(`Boost channel ${channelId} was not found.`);
            return;
        }

        const embed = resolveEventEmbed(
            newMember.guild.id,
            'boost',
            {
                userMention: `<@${newMember.id}>`,
                username: newMember.user.username,
                serverName: newMember.guild.name,
                memberCount: newMember.guild.memberCount,
            },
            () => boostEmbed(newMember)
        );

        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to send boost message:', error);
        }
    },
};
