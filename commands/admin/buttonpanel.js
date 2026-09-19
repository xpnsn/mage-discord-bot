'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const embedStore = require('../../src/embeds/embedStore');
const buttonPanels = require('../../src/config/buttonPanels');
const { replySuccess, replyError, replyContent } = require('../../src/utils/replies');

const STYLE_CHOICES = [
    { name: 'Primary (blurple)', value: 'Primary' },
    { name: 'Secondary (gray)', value: 'Secondary' },
    { name: 'Success (green)', value: 'Success' },
    { name: 'Danger (red)', value: 'Danger' },
];

const STYLE_MAP = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
};

// Panel name and button key both get embedded in the button's custom_id
// (bp:<name>:<key>) so a click can be resolved back to a panel/button
// without needing anything held in memory. Keep them simple so that's safe.
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function assertSafeId(value, label) {
    if (!SAFE_ID_REGEX.test(value)) {
        throw new Error(`${label} can only contain letters, numbers, hyphens and underscores.`);
    }
}

function buildComponents(panelName, buttons) {
    const rows = [];

    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(
            buttons.slice(i, i + 5).map(b => {
                const button = new ButtonBuilder()
                    .setCustomId(`bp:${panelName}:${b.key}`)
                    .setLabel(b.label)
                    .setStyle(STYLE_MAP[b.style] || ButtonStyle.Primary);

                if (b.emoji) button.setEmoji(b.emoji);

                return button;
            })
        );

        rows.push(row);
    }

    return rows;
}

async function refreshPanelMessage(guild, panelName, panel) {
    const channel = guild.channels.cache.get(panel.channelId);
    if (!channel) throw new Error('The panel channel could not be found.');

    const message = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (!message) throw new Error('The panel message could not be found — it may have been deleted.');

    await message.edit({ components: buildComponents(panelName, panel.buttons) });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonpanel')
        .setDescription('Post a saved embed with buttons — each button privately shows a different embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription('Post a saved embed as a NEW button panel message')
                .addStringOption(o =>
                    o.setName('name').setDescription('A short unique name for this panel').setRequired(true).setMaxLength(50)
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
        )

        .addSubcommand(sub =>
            sub
                .setName('link')
                .setDescription('Attach a panel to an EXISTING message instead of posting a new one')
                .addStringOption(o =>
                    o.setName('name').setDescription('A short unique name for this panel').setRequired(true).setMaxLength(50)
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
        )

        .addSubcommand(sub =>
            sub
                .setName('add-button')
                .setDescription('Add a button to a panel; clicking it privately shows a saved embed')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName('key').setDescription('Short unique id for this button, e.g. "rules"').setRequired(true).setMaxLength(40)
                )
                .addStringOption(o => o.setName('label').setDescription('Text shown on the button').setRequired(true).setMaxLength(80))
                .addStringOption(o =>
                    o
                        .setName('embed')
                        .setDescription('Saved embed to show when clicked')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName('style').setDescription('Button color (default: Primary)').addChoices(...STYLE_CHOICES)
                )
                .addStringOption(o => o.setName('emoji').setDescription('Optional emoji shown on the button'))
        )

        .addSubcommand(sub =>
            sub
                .setName('remove-button')
                .setDescription('Remove a button from a panel')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o => o.setName('key').setDescription('The button key to remove').setRequired(true))
        )

        .addSubcommand(sub => sub.setName('list').setDescription('List button panels in this server'))

        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Delete a button panel (the original message is left as-is)')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const guildId = interaction.guild.id;

        const source = focused.name === 'embed' ? embedStore.listEmbeds(guildId) : buttonPanels.listPanels(guildId);

        const filtered = source.filter(v => v.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);

        await interaction.respond(filtered.map(v => ({ name: v, value: v })));
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // create/link/add-button/remove-button all post or edit a message —
        // defer up front so nothing here risks the 3-second ack window.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            if (subcommand === 'create') {
                const name = interaction.options.getString('name');
                const channel = interaction.options.getChannel('channel');
                const embedName = interaction.options.getString('embed');

                assertSafeId(name, 'Panel name');

                if (buttonPanels.getPanel(guildId, name)) {
                    return replyError(interaction, `A button panel named \`${name}\` already exists.`);
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
                } catch (error) {
                    console.error('Failed to post button panel:', error);
                    return replyError(interaction, 'Failed to post the panel. Check my permissions in that channel.');
                }

                buttonPanels.createPanel(guildId, name, { messageId: message.id, channelId: channel.id });

                return replySuccess(
                    interaction,
                    `Panel \`${name}\` posted in ${channel} (message ID: \`${message.id}\`). Add buttons with \`/buttonpanel add-button\`.`
                );
            }

            if (subcommand === 'link') {
                const name = interaction.options.getString('name');
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message-id');

                assertSafeId(name, 'Panel name');

                if (buttonPanels.getPanel(guildId, name)) {
                    return replyError(interaction, `A button panel named \`${name}\` already exists.`);
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);

                if (!message) {
                    return replyError(
                        interaction,
                        `Couldn't find a message with ID \`${messageId}\` in ${channel}. Double-check the ID and that I can see that channel.`
                    );
                }

                buttonPanels.createPanel(guildId, name, { messageId: message.id, channelId: channel.id });

                return replySuccess(interaction, `Panel \`${name}\` linked to that existing message. Add buttons with \`/buttonpanel add-button\`.`);
            }

            if (subcommand === 'add-button') {
                const name = interaction.options.getString('name');
                const key = interaction.options.getString('key');
                const label = interaction.options.getString('label');
                const embedName = interaction.options.getString('embed');
                const style = interaction.options.getString('style') || 'Primary';
                const emoji = interaction.options.getString('emoji');

                assertSafeId(key, 'Button key');

                if (!embedStore.getEmbed(guildId, embedName)) {
                    return replyError(interaction, `No saved embed named \`${embedName}\` was found. Create one with \`/embed create\`.`);
                }

                const panel = buttonPanels.addButton(guildId, name, { key, label, style, emoji, embedName });

                await refreshPanelMessage(interaction.guild, name, panel);

                return replySuccess(interaction, `Button **${label}** added to \`${name}\` — clicking it shows \`${embedName}\`.`);
            }

            if (subcommand === 'remove-button') {
                const name = interaction.options.getString('name');
                const key = interaction.options.getString('key');

                const removed = buttonPanels.removeButton(guildId, name, key);

                if (!removed) {
                    return replyError(interaction, `No button with key \`${key}\` was found on \`${name}\`.`);
                }

                const panel = buttonPanels.getPanel(guildId, name);
                await refreshPanelMessage(interaction.guild, name, panel);

                return replySuccess(interaction, `Button \`${key}\` removed from \`${name}\`.`);
            }

            if (subcommand === 'list') {
                const names = buttonPanels.listPanels(guildId);

                if (!names.length) {
                    return replyContent(interaction, { content: 'No button panels have been created yet.', flags: MessageFlags.Ephemeral });
                }

                const lines = names.map(name => {
                    const panel = buttonPanels.getPanel(guildId, name);
                    const buttons =
                        panel.buttons.map(b => `\`${b.key}\` "${b.label}" → ${b.embedName}`).join('\n') || '*no buttons yet*';

                    return `**${name}** in <#${panel.channelId}> — message ID: \`${panel.messageId}\`\n${buttons}`;
                });

                return replyContent(interaction, { content: lines.join('\n\n'), flags: MessageFlags.Ephemeral });
            }

            if (subcommand === 'delete') {
                const name = interaction.options.getString('name');
                const deleted = buttonPanels.deletePanel(guildId, name);

                return deleted
                    ? replySuccess(
                          interaction,
                          `Button panel \`${name}\` deleted. The original message was left as-is — its buttons will stop working.`
                      )
                    : replyError(interaction, `No button panel named \`${name}\` was found.`);
            }
        } catch (error) {
            return replyError(interaction, error.message);
        }
    },
};
