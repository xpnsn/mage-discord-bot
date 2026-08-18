const {
    SlashCommandBuilder,
    PermissionFlagsBits,
} = require('discord.js');

const welcomeEmbed = require('../../src/embeds/welcome');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-embed')
        .setDescription('Generate a sample welcome embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = welcomeEmbed(interaction.member);

        await interaction.channel.send({
            content: `Hey <@${interaction.user.id}>!`,
            embeds: [embed],
        });

        await interaction.reply({
            content: 'Welcome embed generated!',
            ephemeral: true,
        });
    },
};