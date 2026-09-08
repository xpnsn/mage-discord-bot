const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require('discord.js');

const {
    getPlayer,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),

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

        const track = player.currentTrack;

        const status =
            player.audioPlayer.state.status;

        const statusText =
            status === 'paused'
                ? '⏸️ Paused'
                : '▶️ Playing';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Now Playing')
            .setDescription(
                `## ${track.name}\n\n` +
                `${statusText}`
            )
            .addFields(
                {
                    name: 'Queue',
                    value: `${player.queue.length} song${player.queue.length === 1 ? '' : 's'}`,
                    inline: true,
                },
                {
                    name: 'Volume',
                    value: `${Math.round(player.volume * 100)}%`,
                    inline: true,
                },
                {
                    name: 'Loop',
                    value: player.loop,
                    inline: true,
                }
            )
            .setFooter({
                text: 'Music Player',
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};