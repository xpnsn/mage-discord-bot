const { SlashCommandBuilder } = require('discord.js');

const {
    getPlayer,
    pause,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),

    async execute(interaction) {
        const player = getPlayer(
            interaction.guild.id
        );

        if (!player || !player.currentTrack) {
            return interaction.reply({
                content: '❌ Nothing is currently playing.',
                ephemeral: true,
            });
        }

        if (player.audioPlayer.state.status === 'paused') {
            return interaction.reply({
                content: '⏸️ The music is already paused.',
                ephemeral: true,
            });
        }

        const success = pause(
            interaction.guild.id
        );

        if (!success) {
            return interaction.reply({
                content: '❌ Failed to pause the music.',
                ephemeral: true,
            });
        }

        await interaction.reply(
            `⏸️ Paused **${player.currentTrack.name}**`
        );
    },
};