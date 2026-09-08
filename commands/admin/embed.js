'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedStore = require('../../src/embeds/embedStore');
const guildConfig = require('../../src/config/guildConfig');
const { replySuccess, replyError } = require('../../src/utils/replies');

const EVENT_CHOICES = [
    { name: 'Welcome', value: 'welcome' },
    { name: 'Leave', value: 'leave' },
    { name: 'Boost', value: 'boost' },
];

const FIELD_OPTIONS = (builder, { descriptionHint } = {}) =>
    builder
        .addStringOption(o => o.setName('title').setDescription('Embed title'))
        .addStringOption(o =>
            o
                .setName('description')
                .setDescription(descriptionHint || 'Embed description. Supports {user} {username} {server} {memberCount}')
        )
        .addStringOption(o => o.setName('color').setDescription('Hex color, e.g. #5865F2'))
        .addStringOption(o => o.setName('image').setDescription('Image URL'))
        .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL'))
        .addStringOption(o => o.setName('footer').setDescription('Footer text. Supports the same placeholders'));

function fieldsFromOptions(interaction) {
    const fields = {};

    for (const key of ['title', 'description', 'color', 'image', 'thumbnail', 'footer']) {
        const value = interaction.options.getString(key);

        if (value !== null) {
            fields[key] = value
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t');
        }
    }

    return fields;
}

function previewContext(interaction) {
    return {
        userMention: `<@${interaction.user.id}>`,
        username: interaction.user.username,
        serverName: interaction.guild.name,
        memberCount: interaction.guild.memberCount,
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage reusable embeds')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            FIELD_OPTIONS(
                sub
                    .setName('create')
                    .setDescription('Create a new embed')
                    .addStringOption(o =>
                        o.setName('name').setDescription('A short unique name for this embed').setRequired(true)
                    )
            )
        )

        .addSubcommand(sub =>
            FIELD_OPTIONS(
                sub
                    .setName('edit')
                    .setDescription('Edit an existing embed')
                    .addStringOption(o =>
                        o
                            .setName('name')
                            .setDescription('Name of the embed to edit')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
        )

        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Delete an embed')
                .addStringOption(o =>
                    o.setName('name').setDescription('Name of the embed to delete').setRequired(true).setAutocomplete(true)
                )
        )

        .addSubcommand(sub => sub.setName('list').setDescription('List all embeds in this server'))

        .addSubcommand(sub =>
            sub
                .setName('preview')
                .setDescription('Preview an embed (only visible to you)')
                .addStringOption(o =>
                    o.setName('name').setDescription('Name of the embed').setRequired(true).setAutocomplete(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('send')
                .setDescription('Send an embed to a channel')
                .addStringOption(o =>
                    o.setName('name').setDescription('Name of the embed').setRequired(true).setAutocomplete(true)
                )
                .addChannelOption(o =>
                    o
                        .setName('channel')
                        .setDescription('Channel to send it to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(o => o.setName('content').setDescription('Optional plain text sent above the embed'))
        )

        .addSubcommand(sub =>
            sub
                .setName('bind')
                .setDescription('Use a custom embed for a bot event instead of the built-in default')
                .addStringOption(o =>
                    o.setName('event').setDescription('Which event to bind').setRequired(true).addChoices(...EVENT_CHOICES)
                )
                .addStringOption(o =>
                    o.setName('name').setDescription('Name of the embed to use').setRequired(true).setAutocomplete(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('unbind')
                .setDescription('Revert an event back to its built-in default embed')
                .addStringOption(o =>
                    o.setName('event').setDescription('Which event to unbind').setRequired(true).addChoices(...EVENT_CHOICES)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const names = embedStore.listEmbeds(interaction.guild.id);

        const filtered = names.filter(name => name.toLowerCase().includes(focused)).slice(0, 25);

        await interaction.respond(filtered.map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'create') {
                const name = interaction.options.getString('name');
                embedStore.createEmbed(guildId, name, fieldsFromOptions(interaction));
                return replySuccess(interaction, `Embed \`${name}\` created. Try \`/embed preview name:${name}\`.`);
            }

            if (subcommand === 'edit') {
                const name = interaction.options.getString('name');
                embedStore.editEmbed(guildId, name, fieldsFromOptions(interaction));
                return replySuccess(interaction, `Embed \`${name}\` updated.`);
            }

            if (subcommand === 'delete') {
                const name = interaction.options.getString('name');
                const deleted = embedStore.deleteEmbed(guildId, name);
                return deleted
                    ? replySuccess(interaction, `Embed \`${name}\` deleted.`)
                    : replyError(interaction, `No embed named \`${name}\` was found.`);
            }

            if (subcommand === 'list') {
                const names = embedStore.listEmbeds(guildId);
                return interaction.reply({
                    content: names.length
                        ? `**Embeds in this server:**\n${names.map(n => `\`${n}\``).join(', ')}`
                        : 'No custom embeds have been created yet.',
                    ephemeral: true,
                });
            }

            if (subcommand === 'preview' || subcommand === 'send') {
                const name = interaction.options.getString('name');
                const fields = embedStore.getEmbed(guildId, name);

                if (!fields) return replyError(interaction, `No embed named \`${name}\` was found.`);

                const embed = embedStore.buildEmbed(fields, previewContext(interaction));

                if (subcommand === 'preview') {
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const channel = interaction.options.getChannel('channel');
                const content = interaction.options.getString('content') || undefined;

                await channel.send({ content, embeds: [embed] });
                return replySuccess(interaction, `Embed \`${name}\` sent to ${channel}.`);
            }

            if (subcommand === 'bind') {
                const event = interaction.options.getString('event');
                const name = interaction.options.getString('name');

                if (!embedStore.getEmbed(guildId, name)) {
                    return replyError(interaction, `No embed named \`${name}\` was found.`);
                }

                guildConfig.bindEmbed(guildId, event, name);
                return replySuccess(interaction, `**${event}** messages will now use the \`${name}\` embed.`);
            }

            if (subcommand === 'unbind') {
                const event = interaction.options.getString('event');
                guildConfig.unbindEmbed(guildId, event);
                return replySuccess(interaction, `**${event}** messages will use the default embed again.`);
            }
        } catch (error) {
            return replyError(interaction, error.message);
        }
    },
};
