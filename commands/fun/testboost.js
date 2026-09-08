const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const boostEmbed = require('../../src/embeds/boost');
const { getChannel, getRole } = require('../../src/config/guildConfig');
const { resolveEventEmbed } = require('../../src/utils/embedResolver');
const { replyError, replySuccess } = require('../../src/utils/replies');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testboost')
        .setDescription('Simulate a server boost')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const member = interaction.member;
        const guildId = interaction.guild.id;

        // Add booster role
        const boostRoleId = getRole(guildId, 'boost');

        if (boostRoleId && !member.roles.cache.has(boostRoleId)) {
            await member.roles.add(boostRoleId);
        }

        // Get boost channel
        const channelId = getChannel(guildId, 'boost');
        const channel = channelId && interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return replyError(interaction, 'Boost channel not configured. Use `/config set-channel type:Boost`.');
        }

        // Send boost embed (respects a bound custom embed, if any)
        const embed = resolveEventEmbed(
            guildId,
            'boost',
            {
                userMention: `<@${member.id}>`,
                username: member.user.username,
                serverName: interaction.guild.name,
                memberCount: interaction.guild.memberCount,
            },
            () => boostEmbed(member)
        );

        await channel.send({ embeds: [embed] });

        return replySuccess(interaction, 'Boost event simulated successfully!');
    }
};
