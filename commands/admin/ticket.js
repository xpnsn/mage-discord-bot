'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedStore = require('../../src/embeds/embedStore');
const ticketConfig = require('../../src/config/ticketConfig');
const { normalizeEmoji } = require('../../src/utils/emoji');
const { replySuccess, replyError } = require('../../src/utils/replies');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Set up and manage the ticket system')

        .addSubcommandGroup(group =>
            group
                .setName('panel')
                .setDescription('Manage ticket panels')

                .addSubcommand(sub =>
                    sub
                        .setName('create')
                        .setDescription('Post a saved embed as a NEW ticket panel message')
                        .addStringOption(o =>
                            o.setName('name').setDescription('A short unique name for this panel').setRequired(true)
                        )
                        .addChannelOption(o =>
                            o
                                .setName('channel')
                                .setDescription('Channel to post the panel in')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                        .addStringOption(o =>
                            o
                                .setName('embed')
                                .setDescription('Saved embed to use (from /embed create)')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(o =>
                            o.setName('emoji').setDescription('Emoji members react with to open a ticket').setRequired(true)
                        )
                        .addChannelOption(o =>
                            o
                                .setName('category')
                                .setDescription('Category new ticket channels are created under')
                                .addChannelTypes(ChannelType.GuildCategory)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('link')
                        .setDescription('Attach a panel to an EXISTING message instead of posting a new one')
                        .addStringOption(o =>
                            o.setName('name').setDescription('A short unique name for this panel').setRequired(true)
                        )
                        .addChannelOption(o =>
                            o
                                .setName('channel')
                                .setDescription('Channel the existing message is in')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)
                        )
                        .addStringOption(o =>
                            o.setName('message-id').setDescription('ID of the existing message (right-click it → Copy Message ID)').setRequired(true)
                        )
                        .addStringOption(o =>
                            o.setName('emoji').setDescription('Emoji members react with to open a ticket').setRequired(true)
                        )
                        .addChannelOption(o =>
                            o
                                .setName('category')
                                .setDescription('Category new ticket channels are created under')
                                .addChannelTypes(ChannelType.GuildCategory)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('add-staff')
                        .setDescription('Let a role see and manage tickets from this panel')
                        .addStringOption(o =>
                            o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                        )
                        .addRoleOption(o => o.setName('role').setDescription('Staff role').setRequired(true))
                )

                .addSubcommand(sub =>
                    sub
                        .setName('remove-staff')
                        .setDescription('Remove a staff role from this panel')
                        .addStringOption(o =>
                            o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                        )
                        .addRoleOption(o => o.setName('role').setDescription('Staff role').setRequired(true))
                )

                .addSubcommand(sub =>
                    sub
                        .setName('set-category')
                        .setDescription('Change which category new tickets from this panel are created under')
                        .addStringOption(o =>
                            o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                        )
                        .addChannelOption(o =>
                            o
                                .setName('category')
                                .setDescription('Category new ticket channels are created under')
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(true)
                        )
                )

                .addSubcommand(sub => sub.setName('list').setDescription('List ticket panels in this server'))

                .addSubcommand(sub =>
                    sub
                        .setName('delete')
                        .setDescription('Delete a ticket panel (the original message is left as-is)')
                        .addStringOption(o =>
                            o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                        )
                )
        )

        .addSubcommand(sub => sub.setName('close').setDescription('Close (delete) the current ticket channel')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const guildId = interaction.guild.id;

        const source = focused.name === 'embed' ? embedStore.listEmbeds(guildId) : ticketConfig.listPanels(guildId);

        const filtered = source.filter(v => v.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);

        await interaction.respond(filtered.map(v => ({ name: v, value: v })));
    },

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (group === 'panel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return replyError(interaction, 'You need Manage Channels to configure ticket panels.');
            }

            try {
                if (subcommand === 'create') {
                    const name = interaction.options.getString('name');
                    const channel = interaction.options.getChannel('channel');
                    const embedName = interaction.options.getString('embed');
                    const rawEmoji = interaction.options.getString('emoji');
                    const category = interaction.options.getChannel('category');

                    if (ticketConfig.getPanel(guildId, name)) {
                        return replyError(interaction, `A ticket panel named \`${name}\` already exists.`);
                    }

                    const fields = embedStore.getEmbed(guildId, embedName);

                    if (!fields) {
                        return replyError(interaction, `No saved embed named \`${embedName}\` was found. Create one with \`/embed create\`.`);
                    }

                    const embed = embedStore.buildEmbed(fields, {
                        serverName: interaction.guild.name,
                        memberCount: interaction.guild.memberCount,
                    });

                    let message;
                    try {
                        message = await channel.send({ embeds: [embed] });
                        await message.react(rawEmoji);
                    } catch (error) {
                        console.error('Failed to post ticket panel:', error);
                        return replyError(interaction, 'Failed to post the panel or react to it. Check my permissions in that channel.');
                    }

                    ticketConfig.createPanel(guildId, name, {
                        messageId: message.id,
                        channelId: channel.id,
                        emoji: normalizeEmoji(rawEmoji),
                        emojiDisplay: rawEmoji,
                        categoryId: category ? category.id : null,
                    });

                    return replySuccess(
                        interaction,
                        `Ticket panel \`${name}\` posted in ${channel} (message ID: \`${message.id}\`). Add staff with \`/ticket panel add-staff name:${name} role:<role>\`.`
                    );
                }

                if (subcommand === 'link') {
                    const name = interaction.options.getString('name');
                    const channel = interaction.options.getChannel('channel');
                    const messageId = interaction.options.getString('message-id');
                    const rawEmoji = interaction.options.getString('emoji');
                    const category = interaction.options.getChannel('category');

                    if (ticketConfig.getPanel(guildId, name)) {
                        return replyError(interaction, `A ticket panel named \`${name}\` already exists.`);
                    }

                    const message = await channel.messages.fetch(messageId).catch(() => null);

                    if (!message) {
                        return replyError(
                            interaction,
                            `Couldn't find a message with ID \`${messageId}\` in ${channel}. Double-check the ID and that I can see that channel.`
                        );
                    }

                    try {
                        await message.react(rawEmoji);
                    } catch (error) {
                        console.error('Failed to react to linked ticket panel:', error);
                        return replyError(interaction, "Failed to react with that emoji — make sure it's valid.");
                    }

                    ticketConfig.createPanel(guildId, name, {
                        messageId: message.id,
                        channelId: channel.id,
                        emoji: normalizeEmoji(rawEmoji),
                        emojiDisplay: rawEmoji,
                        categoryId: category ? category.id : null,
                    });

                    return replySuccess(
                        interaction,
                        `Ticket panel \`${name}\` linked to that existing message. Add staff with \`/ticket panel add-staff name:${name} role:<role>\`.`
                    );
                }

                if (subcommand === 'add-staff') {
                    const name = interaction.options.getString('name');
                    const role = interaction.options.getRole('role');
                    ticketConfig.addStaffRole(guildId, name, role.id);
                    return replySuccess(interaction, `**${role.name}** can now see and manage tickets from \`${name}\`.`);
                }

                if (subcommand === 'remove-staff') {
                    const name = interaction.options.getString('name');
                    const role = interaction.options.getRole('role');
                    ticketConfig.removeStaffRole(guildId, name, role.id);
                    return replySuccess(interaction, `**${role.name}** removed from \`${name}\` staff.`);
                }

                if (subcommand === 'set-category') {
                    const name = interaction.options.getString('name');
                    const category = interaction.options.getChannel('category');
                    ticketConfig.setCategory(guildId, name, category.id);
                    return replySuccess(interaction, `New tickets from \`${name}\` will be created under **${category.name}**.`);
                }

                if (subcommand === 'list') {
                    const names = ticketConfig.listPanels(guildId);

                    if (!names.length) {
                        return interaction.reply({ content: 'No ticket panels have been created yet.', ephemeral: true });
                    }

                    const lines = names.map(name => {
                        const panel = ticketConfig.getPanel(guildId, name);
                        const staff = panel.staffRoles.map(id => `<@&${id}>`).join(', ') || '*none*';

                        return (
                            `**${name}** ${panel.emojiDisplay} in <#${panel.channelId}> — message ID: \`${panel.messageId}\`\n` +
                            `Category: ${panel.categoryId ? `<#${panel.categoryId}>` : '*none*'} | Staff: ${staff} | Tickets opened: ${panel.counter}`
                        );
                    });

                    return interaction.reply({ content: lines.join('\n\n'), ephemeral: true });
                }

                if (subcommand === 'delete') {
                    const name = interaction.options.getString('name');
                    const deleted = ticketConfig.deletePanel(guildId, name);

                    return deleted
                        ? replySuccess(interaction, `Ticket panel \`${name}\` deleted. Existing ticket channels are unaffected.`)
                        : replyError(interaction, `No ticket panel named \`${name}\` was found.`);
                }
            } catch (error) {
                return replyError(interaction, error.message);
            }

            return;
        }

        if (subcommand === 'close') {
            const ticket = ticketConfig.getTicket(guildId, interaction.channel.id);

            if (!ticket) {
                return replyError(interaction, 'This is not an open ticket channel.');
            }

            const panel = ticketConfig.getPanel(guildId, ticket.panelName);
            const isOwner = interaction.user.id === ticket.userId;
            const isStaff = panel && panel.staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));
            const isManager = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

            if (!isOwner && !isStaff && !isManager) {
                return replyError(interaction, "You don't have permission to close this ticket.");
            }

            await interaction.reply('🔒 Closing this ticket in 5 seconds...');
            ticketConfig.deleteTicket(guildId, interaction.channel.id);

            setTimeout(() => {
                interaction.channel.delete('Ticket closed').catch(error => {
                    console.error('Failed to delete ticket channel:', error);
                });
            }, 5000);
        }
    },
};
