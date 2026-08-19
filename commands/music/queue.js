const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const {
    getPlayer,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),

    async execute(interaction) {
        const player = getPlayer(
            interaction.guild.id
        );

        if (!player || !player.currentTrack) {
            return interaction.reply({
                content: '📭 The music queue is empty.',
                ephemeral: true,
            });
        }

        const current = player.currentTrack;

        const queue = player.queue;

        let description =
            `🎵 **Now Playing**\n` +
            `> **${current.name}**\n\n`;

        if (queue.length === 0) {
            description += '📭 **Queue is empty.**';
        } else {
            description += '**Up Next:**\n';

            queue.forEach((track, index) => {
                description +=
                    `\`${index + 1}.\` **${track.name}**\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Music Queue')
            .setDescription(description)
            .setFooter({
                text: `${queue.length} song${queue.length === 1 ? '' : 's'} in queue`,
            });

        await interaction.reply({
            embeds: [embed],
        });
    },
};