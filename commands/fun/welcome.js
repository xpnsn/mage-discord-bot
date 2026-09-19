const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const welcomeEmbed = require('../../src/embeds/welcome');
const { resolveEventEmbed } = require('../../src/utils/embedResolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-embed')
        .setDescription('Generate a sample welcome embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // channel.send() is a network call — defer so we don't risk the
        // 3-second interaction ack window.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const embed = resolveEventEmbed(
            interaction.guild.id,
            'welcome',
            {
                userMention: `<@${interaction.user.id}>`,
                username: interaction.user.username,
                serverName: interaction.guild.name,
                memberCount: interaction.guild.memberCount,
            },
            () => welcomeEmbed(interaction.member)
        );

        await interaction.channel.send({
            content: `Hey <@${interaction.user.id}>!`,
            embeds: [embed],
        });

        await interaction.editReply({ content: 'Welcome embed generated!' });
    },
};
