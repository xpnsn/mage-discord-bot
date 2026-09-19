'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const privateVoice = require('../../src/config/privateVoice');
const { getRole } = require('../../src/config/guildConfig');
const { replySuccess, replyError, replyContent } = require('../../src/utils/replies');

function hasCreateAccess(interaction) {
    if (interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;

    const roleId = getRole(interaction.guild.id, 'privateVc');
    // If no role has been configured, leave it open to everyone.
    return roleId ? interaction.member.roles.cache.has(roleId) : true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Create and manage private voice channels')

        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription('Create your own private voice channel')
                .addStringOption(o => o.setName('name').setDescription("Channel name (default: your username's VC)"))
        )

        .addSubcommand(sub =>
            sub
                .setName('invite')
                .setDescription('Let someone into your private voice channel')
                .addUserOption(o => o.setName('user').setDescription('Who to invite').setRequired(true))
        )

        .addSubcommand(sub =>
            sub
                .setName('kick')
                .setDescription('Remove someone from your private voice channel')
                .addUserOption(o => o.setName('user').setDescription('Who to remove').setRequired(true))
        )

        .addSubcommand(sub =>
            sub
                .setName('set-category')
                .setDescription('[Admin] Set which category private voice channels are created under')
                .addChannelOption(o =>
                    o
                        .setName('category')
                        .setDescription('Category channel')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )

        .addSubcommand(sub => sub.setName('list').setDescription('[Admin] List currently active private voice channels')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // create/invite/kick all hit the Discord API (channel creation,
        // permission edits, member fetch) before replying — defer up
        // front for every subcommand so nothing here risks the 3-second
        // interaction ack window.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'set-category') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return replyError(interaction, 'You need Manage Channels to do that.');
            }

            const category = interaction.options.getChannel('category');
            privateVoice.setCategory(guildId, category.id);
            return replySuccess(interaction, `Private voice channels will now be created under **${category.name}**.`);
        }

        if (subcommand === 'list') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return replyError(interaction, 'You need Manage Channels to do that.');
            }

            const entries = Object.entries(privateVoice.getSettings(guildId).channels);

            if (!entries.length) {
                return replyContent(interaction, { content: 'No private voice channels are active right now.', flags: MessageFlags.Ephemeral });
            }

            const lines = entries.map(([channelId, info]) => `<#${channelId}> — owner: <@${info.ownerId}>`);
            return replyContent(interaction, { content: lines.join('\n'), flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'create') {
            if (!hasCreateAccess(interaction)) {
                return replyError(interaction, "You don't have permission to create a private voice channel.");
            }

            const existingChannelId = privateVoice.findChannelByOwner(guildId, interaction.user.id);

            if (existingChannelId && interaction.guild.channels.cache.has(existingChannelId)) {
                return replyError(interaction, `You already have an active private VC: <#${existingChannelId}>.`);
            }

            const { categoryId } = privateVoice.getSettings(guildId);
            const name = interaction.options.getString('name') || `${interaction.user.username}'s VC`;

            let channel;
            try {
                channel = await interaction.guild.channels.create({
                    name,
                    type: ChannelType.GuildVoice,
                    parent: categoryId || undefined,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
                        },
                    ],
                    reason: `Private VC requested by ${interaction.user.tag}`,
                });
            } catch (error) {
                console.error('Failed to create private VC:', error);
                return replyError(interaction, 'Failed to create the channel. Check my permissions.');
            }

            privateVoice.recordChannel(guildId, channel.id, interaction.user.id);

            if (interaction.member.voice.channelId) {
                await interaction.member.voice.setChannel(channel).catch(() => {});
            }

            return replySuccess(interaction, `Created ${channel}. It'll be deleted automatically once it's empty.`);
        }

        if (subcommand === 'invite' || subcommand === 'kick') {
            const ownerChannelId = privateVoice.findChannelByOwner(guildId, interaction.user.id);

            if (!ownerChannelId) {
                return replyError(interaction, "You don't own an active private voice channel.");
            }

            const channel = interaction.guild.channels.cache.get(ownerChannelId);

            if (!channel) {
                return replyError(interaction, 'Your private voice channel could not be found.');
            }

            const target = interaction.options.getUser('user');

            try {
                if (subcommand === 'invite') {
                    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, Connect: true });
                    return replySuccess(interaction, `${target} can now join ${channel}.`);
                }

                await channel.permissionOverwrites.edit(target.id, { ViewChannel: false, Connect: false });

                const member = await interaction.guild.members.fetch(target.id).catch(() => null);
                if (member?.voice.channelId === channel.id) {
                    await member.voice.disconnect().catch(() => {});
                }

                return replySuccess(interaction, `${target} was removed from ${channel}.`);
            } catch (error) {
                console.error('Failed to update private VC access:', error);
                return replyError(interaction, 'Failed to update that permission. Check my permissions.');
            }
        }
    },
};
