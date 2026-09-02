const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const boostEmbed = require('./../../src/embeds/boost');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testboost')
        .setDescription('Simulate a server boost')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const member = interaction.member;

        // Add booster role
        const boostRoleId = process.env.BOOST_ROLE_ID;

        if (boostRoleId && !member.roles.cache.has(boostRoleId)) {
            await member.roles.add(boostRoleId);
        }

        // Get boost channel
        const channel = interaction.guild.channels.cache.get(
            process.env.BOOST_CHANNEL_ID
        );

        if (!channel) {
            return interaction.reply({
                content: '❌ Boost channel not found.',
                ephemeral: true
            });
        }

        // Send boost embed
        await channel.send({
            embeds: [boostEmbed(member)]
        });

        await interaction.reply({
            content: '✅ Boost event simulated successfully!',
            ephemeral: true
        });
    }
};