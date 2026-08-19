const { SlashCommandBuilder } = require('discord.js');

const {
    getPlayer,
    stop,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and leave the voice channel'),

    async execute(interaction) {
        const player = getPlayer(
            interaction.guild.id
        );

        if (!player) {
            return interaction.reply({
                content: '❌ The bot is not playing music.',
                ephemeral: true,
            });
        }

        stop(interaction.guild.id);

        await interaction.reply(
            '⏹️ Music stopped and the queue was cleared.'
        );
    },
};