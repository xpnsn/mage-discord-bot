'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { replySuccess, replyError } = require('../../src/utils/replies');
const { getChannel } = require('../../src/config/guildConfig');
const embedStore = require('../../src/embeds/embedStore');
const { unescapeText } = require('../../src/utils/textFormatting');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o =>
            o
                .setName('embed')
                .setDescription('Send a saved embed (from /embed create) instead of a one-off message')
                .setAutocomplete(true)
        )
        .addStringOption(o => o.setName('message').setDescription('The announcement text (ignored if "embed" is set)'))
        .addStringOption(o => o.setName('title').setDescription('Optional title (ignored if "embed" is set)'))
        .addChannelOption(o =>
            o
                .setName('channel')
                .setDescription('Channel to announce in (defaults to the configured announcement channel)')
                .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(o => o.setName('ping-role').setDescription('Role to mention with the announcement'))
        .addStringOption(o => o.setName('color').setDescription('Hex color, e.g. #5865F2 (ignored if "embed" is set)'))
        .addStringOption(o => o.setName('image').setDescription('Image URL (ignored if "embed" is set)')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const names = embedStore.listEmbeds(interaction.guild.id);

        const filtered = names.filter(name => name.toLowerCase().includes(focused)).slice(0, 25);

        await interaction.respond(filtered.map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        const savedEmbedName = interaction.options.getString('embed');
        const pingRole = interaction.options.getRole('ping-role');

        const explicitChannel = interaction.options.getChannel('channel');
        const configuredChannelId = getChannel(interaction.guild.id, 'announcement');
        const channel = explicitChannel || (configuredChannelId && interaction.guild.channels.cache.get(configuredChannelId));

        if (!channel) {
            return replyError(
                interaction,
                'No channel was provided and no announcement channel is configured. Use `/config set-channel type:Announcement` or pass a channel.'
            );
        }

        let embed;

        if (savedEmbedName) {
            // Use a saved embed (created with /embed create) so the
            // announcement content lives in data/embeds.json, not the code.
            const fields = embedStore.getEmbed(interaction.guild.id, savedEmbedName);

            if (!fields) {
                return replyError(interaction, `No saved embed named \`${savedEmbedName}\` was found. Create one with \`/embed create\`.`);
            }

            embed = embedStore.buildEmbed(fields, {
                userMention: `<@${interaction.user.id}>`,
                username: interaction.user.username,
                serverName: interaction.guild.name,
                memberCount: interaction.guild.memberCount,
            });
        } else {
            // One-off announcement built from the raw options, same as before.
            const message = unescapeText(interaction.options.getString('message'));
            const title = unescapeText(interaction.options.getString('title'));
            const color = interaction.options.getString('color') || '#5865F2';
            const image = interaction.options.getString('image');

            if (!message) {
                return replyError(interaction, 'Provide either `message` for a one-off announcement, or `embed` to send a saved embed.');
            }

            if (!/^#?[0-9a-fA-F]{6}$/.test(color)) {
                return replyError(interaction, 'Color must be a hex code like #5865F2.');
            }

            embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(message)
                .setFooter({ text: `Announced by ${interaction.user.username}` })
                .setTimestamp();

            if (title) embed.setTitle(title);
            if (image) embed.setImage(image);
        }

        try {
            await channel.send({
                content: pingRole ? `${pingRole}` : undefined,
                embeds: [embed],
                allowedMentions: pingRole ? { roles: [pingRole.id] } : { parse: [] },
            });
        } catch (error) {
            console.error('Failed to send announcement:', error);
            return replyError(interaction, 'Failed to send the announcement. Check my permissions in that channel.');
        }

        return replySuccess(interaction, `Announcement sent to ${channel}.`);
    },
};