const { SlashCommandBuilder } = require('discord.js');

const {
    getPlayer,
    skip,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

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

        const currentSong =
            player.currentTrack.name;

        const success = await skip(
            interaction.guild.id
        );

        if (!success) {
            return interaction.reply({
                content: '❌ Failed to skip the song.',
                ephemeral: true,
            });
        }

        await interaction.reply(
            `⏭️ Skipped **${currentSong}**`
        );
    },
};