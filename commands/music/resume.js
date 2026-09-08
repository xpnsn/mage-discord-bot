const { SlashCommandBuilder } = require('discord.js');

const {
    getPlayer,
    resume,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),

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

        if (player.audioPlayer.state.status !== 'paused') {
            return interaction.reply({
                content: '▶️ The music is not paused.',
                ephemeral: true,
            });
        }

        const success = resume(
            interaction.guild.id
        );

        if (!success) {
            return interaction.reply({
                content: '❌ Failed to resume the music.',
                ephemeral: true,
            });
        }

        await interaction.reply(
            `▶️ Resumed **${player.currentTrack.name}**`
        );
    },
};