const {
    SlashCommandBuilder,
} = require('discord.js');

const ytdlp = require('yt-dlp-exec');

const {
    addTrack,
} = require('../../src/music/musicManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song by name or YouTube URL')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Song name to search, or a YouTube URL')
                .setRequired(true)
        ),

    async execute(interaction) {
        const member = interaction.member;

        if (!member.voice.channel) {
            return interaction.reply({
                content: '❌ You need to join a voice channel first.',
                ephemeral: true,
            });
        }

        const query = interaction.options.getString('query');

        await interaction.deferReply();

        try {
            const track = await resolveTrack(query, interaction.user.id);

            if (!track) {
                return interaction.editReply(
                    `❌ Couldn't find anything for \`${query}\`.`
                );
            }

            const result = await addTrack(member, track);

            if (result.playing) {
                await interaction.editReply(
                    `🎵 Now playing **${track.name}**`
                );
            } else {
                await interaction.editReply(
                    `🎵 Added **${track.name}** to the queue.\n` +
                    `Position: **${result.position}**`
                );
            }

        } catch (error) {
            console.error('[PLAY]', error);

            await interaction.editReply(
                `❌ Could not play that.\n` +
                `\`${error.message}\``
            );
        }
    },
};

/*
 * Turns whatever the user typed into a playable
 * track: { name, url, requestedBy }.
 *
 * - If it's already a URL, yt-dlp resolves it directly.
 * - Otherwise it's treated as a search term via yt-dlp's
 *   built-in "ytsearch1:" prefix, which returns the top
 *   YouTube result.
 */
async function resolveTrack(query, requestedById) {
    const isUrl = /^https?:\/\//i.test(query);
    const target = isUrl ? query : `ytsearch1:${query}`;

    const info = await ytdlp(target, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        noPlaylist: true,
    });

    /*
     * Search results come back wrapped in an
     * "entries" array; direct URLs don't have one.
     */
    const videoInfo = info.entries ? info.entries[0] : info;

    if (!videoInfo) {
        return null;
    }

    return {
        name: videoInfo.title,
        url: videoInfo.webpage_url || videoInfo.original_url || query,
        requestedBy: requestedById,
    };
}