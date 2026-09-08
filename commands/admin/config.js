'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const guildConfig = require('../../src/config/guildConfig');
const { replySuccess } = require('../../src/utils/replies');

const CHANNEL_CHOICES = [
    { name: 'Welcome', value: 'welcome' },
    { name: 'Leave', value: 'leave' },
    { name: 'Boost', value: 'boost' },
    { name: 'Announcement', value: 'announcement' },
];

const ROLE_CHOICES = [
    { name: 'Welcome', value: 'welcome' },
    { name: 'Boost', value: 'boost' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure the channels and roles this server uses')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName('set-channel')
                .setDescription('Assign a channel for a bot feature')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Which feature this channel is for')
                        .setRequired(true)
                        .addChoices(...CHANNEL_CHOICES)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to use')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('set-role')
                .setDescription('Assign a role for a bot feature')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Which feature this role is for')
                        .setRequired(true)
                        .addChoices(...ROLE_CHOICES)
                )
                .addRoleOption(option =>
                    option.setName('role').setDescription('The role to use').setRequired(true)
                )
        )

        .addSubcommand(sub => sub.setName('view').setDescription('Show the current configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'set-channel') {
            const type = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');

            guildConfig.setChannel(guildId, type, channel.id);
            return replySuccess(interaction, `**${type}** channel set to ${channel}.`);
        }

        if (subcommand === 'set-role') {
            const type = interaction.options.getString('type');
            const role = interaction.options.getRole('role');

            guildConfig.setRole(guildId, type, role.id);
            return replySuccess(interaction, `**${type}** role set to ${role}.`);
        }

        if (subcommand === 'view') {
            const config = guildConfig.getGuild(guildId);

            const channelLines = CHANNEL_CHOICES.map(({ name, value }) => {
                const id = guildConfig.getChannel(guildId, value);
                return `**${name}:** ${id ? `<#${id}>` : '*not set*'}`;
            });

            const roleLines = ROLE_CHOICES.map(({ name, value }) => {
                const id = guildConfig.getRole(guildId, value);
                return `**${name}:** ${id ? `<@&${id}>` : '*not set*'}`;
            });

            const bindingEntries = Object.entries(config.embeds);
            const bindingLines = bindingEntries.length
                ? bindingEntries.map(([event, name]) => `**${event}:** \`${name}\``)
                : ['*none*'];

            await interaction.reply({
                content:
                    `**Channels**\n${channelLines.join('\n')}\n\n` +
                    `**Roles**\n${roleLines.join('\n')}\n\n` +
                    `**Bound embeds**\n${bindingLines.join('\n')}`,
                ephemeral: true,
            });
        }
    },
};
