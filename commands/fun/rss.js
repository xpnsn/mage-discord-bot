const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const {
    setupFeed,
    removeFeed,
    getFeedConfig,
    testFeed
} = require('../../src/rss/rssManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rss')
        .setDescription('Manage RSS feeds')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub
                .setName('setup')
                .setDescription('Setup an RSS feed')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('RSS feed URL')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel where RSS posts will be sent')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to mention when a new item is posted')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('interval')
                        .setDescription('Check interval in minutes')
                        .setMinValue(1)
                        .setMaxValue(60)
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove the RSS feed')
        )

        .addSubcommand(sub =>
            sub
                .setName('status')
                .setDescription('Show RSS feed configuration')
        )

        .addSubcommand(sub =>
            sub
                .setName('test')
                .setDescription('Fetch and post the latest RSS item')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const url = interaction.options.getString('url');
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const interval =
                interaction.options.getInteger('interval') || 10;

            await interaction.deferReply({ ephemeral: true });

            try {
                await setupFeed(
                    interaction.guild.id,
                    {
                        url,
                        channelId: channel.id,
                        roleId: role?.id || null,
                        interval
                    }
                );

                await interaction.editReply(
                    `✅ RSS feed configured!\n\n` +
                    `**Feed:** ${url}\n` +
                    `**Channel:** ${channel}\n` +
                    `**Role:** ${role ? role : 'None'}\n` +
                    `**Interval:** ${interval} minute(s)`
                );
            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    `❌ Failed to setup RSS feed.\n\`${error.message}\``
                );
            }
        }

        if (subcommand === 'remove') {
            const removed = removeFeed(interaction.guild.id);

            await interaction.reply({
                content: removed
                    ? '✅ RSS feed removed.'
                    : 'ℹ️ No RSS feed is configured.',
                ephemeral: true
            });
        }

        if (subcommand === 'status') {
            const config = getFeedConfig(interaction.guild.id);

            if (!config) {
                return interaction.reply({
                    content: '❌ No RSS feed configured.',
                    ephemeral: true
                });
            }

            const roleText = config.roleId
                ? `<@&${config.roleId}>`
                : 'None';

            await interaction.reply({
                content:
                    `**RSS Configuration**\n\n` +
                    `**Feed:** ${config.url}\n` +
                    `**Channel:** <#${config.channelId}>\n` +
                    `**Role:** ${roleText}\n` +
                    `**Interval:** ${config.interval} minute(s)`,
                ephemeral: true
            });
        }

        if (subcommand === 'test') {
            await interaction.deferReply({ ephemeral: true });

            try {
                await testFeed(
                    interaction.client,
                    interaction.guild.id
                );

                await interaction.editReply(
                    '✅ Test RSS item sent to the configured channel.'
                );
            } catch (error) {
                console.error(error);

                await interaction.editReply(
                    `❌ RSS test failed.\n\`${error.message}\``
                );
            }
        }
    }
};