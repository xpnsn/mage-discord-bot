const {
    SlashCommandBuilder,
} = require('discord.js');

const path = require('node:path');
const fs = require('node:fs');

const {
    addTrack,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play an audio file')
        .addStringOption(option =>
            option
                .setName('file')
                .setDescription('Audio file name')
                .setRequired(true)
        ),

    async execute(interaction) {
        const member = interaction.member;

        console.log({
            user: interaction.user.tag,
            guild: interaction.guild?.name,
            voiceChannel:
                member.voice.channel?.name,
            voiceChannelId:
                member.voice.channelId,
        });

        if (!member.voice.channel) {
            return interaction.reply({
                content:
                    '❌ You need to join a voice channel first.',
                ephemeral: true,
            });
        }

        const fileName =
            interaction.options.getString('file');

        const audioFile = path.join(
            __dirname,
            '../../data/music',
            fileName
        );

        if (!fs.existsSync(audioFile)) {
            return interaction.reply({
                content:
                    `❌ File not found: \`${fileName}\``,
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            const result = await addTrack(
                member,
                {
                    name: fileName,
                    path: audioFile,
                    requestedBy:
                        interaction.user.id,
                }
            );

            if (result.playing) {
                await interaction.editReply(
                    `🎵 Now playing **${fileName}**`
                );
            } else {
                await interaction.editReply(
                    `🎵 Added **${fileName}** to the queue.\n` +
                    `Position: **${result.position}**`
                );
            }

        } catch (error) {
            console.error(
                '[PLAY]',
                error
            );

            await interaction.editReply(
                `❌ Could not play audio.\n` +
                `\`${error.message}\``
            );
        }
    },
};