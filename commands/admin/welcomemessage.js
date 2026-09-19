'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const welcomeMessage = require('../../src/config/welcomemessage');
const { unescapeText } = require('../../src/utils/textFormatting');
const { replySuccess } = require('../../src/utils/replies');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcometext')
        .setDescription('A plain-text welcome message that auto-deletes (no embed) — separate from the welcome embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub
                .setName('set')
                .setDescription('Configure and enable the auto-deleting welcome message')
                .addChannelOption(o =>
                    o
                        .setName('channel')
                        .setDescription('Channel to post it in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o
                        .setName('message')
                        .setDescription('Text to send. Supports {user} {username} {server} {memberCount}')
                        .setRequired(true)
                )
                .addIntegerOption(o =>
                    o
                        .setName('delete-after')
                        .setDescription('Seconds before it auto-deletes (default 30)')
                        .setMinValue(5)
                        .setMaxValue(3600)
                )
        )

        .addSubcommand(sub => sub.setName('disable').setDescription('Turn off the auto-deleting welcome message'))

        .addSubcommand(sub => sub.setName('view').setDescription('Show the current welcome message configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const channel = interaction.options.getChannel('channel');
            const message = unescapeText(interaction.options.getString('message'));
            const deleteAfter = interaction.options.getInteger('delete-after') || 30;

            welcomeMessage.setConfig(guildId, { channelId: channel.id, template: message, deleteAfter });

            return replySuccess(
                interaction,
                `New members will get a text welcome in ${channel}, auto-deleted after ${deleteAfter}s.`
            );
        }

        if (subcommand === 'disable') {
            welcomeMessage.disable(guildId);
            return replySuccess(interaction, 'Auto-deleting welcome message disabled.');
        }

        if (subcommand === 'view') {
            const settings = welcomeMessage.getSettings(guildId);

            if (!settings.enabled) {
                return interaction.reply({ content: 'Auto-deleting welcome message is currently disabled.', flags: MessageFlags.Ephemeral });
            }

            return interaction.reply({
                content:
                    `**Enabled** in ${settings.channelId ? `<#${settings.channelId}>` : '*unknown channel*'}, deletes after ${settings.deleteAfter}s\n` +
                    `Message: ${settings.template}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
