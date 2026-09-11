'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedStore = require('../../src/embeds/embedStore');
const selfRoles = require('../../src/config/selfRoles');
const { replySuccess, replyError } = require('../../src/utils/replies');

const MODE_CHOICES = [
    { name: 'Multiple roles', value: 'multiple' },
    { name: 'Single role only', value: 'unique' },
];

// A custom emoji option value looks like <:name:123456789012345678> or
// <a:name:123...> for animated. Reaction events identify custom emojis by
// their snowflake ID (not the display string), so that's what we key the
// panel's role map on. Unicode emojis are keyed by the literal character.
function normalizeEmoji(raw) {
    const custom = raw.match(/^<a?:\w+:(\d+)>$/);
    return custom ? custom[1] : raw;
}

// Parses a bulk mapping string like "😀=@Role1, 🎮=@Role2, <:pog:123>=@Role3"
// into [{ rawEmoji, roleId }]. Splits on the LAST "=" in each pair so custom
// emoji syntax (which itself contains colons) can't confuse the parser.
function parseRolePairs(text) {
    return text
        .split(',')
        .map(pair => pair.trim())
        .filter(Boolean)
        .map(pair => {
            const eqIndex = pair.lastIndexOf('=');
            const rawEmoji = eqIndex === -1 ? '' : pair.slice(0, eqIndex).trim();
            const rawRole = eqIndex === -1 ? '' : pair.slice(eqIndex + 1).trim();
            const roleId = rawRole.match(/\d+/)?.[0];

            if (!rawEmoji || !roleId) {
                throw new Error(`Couldn't parse "${pair}" — expected format emoji=@role`);
            }

            return { rawEmoji, roleId };
        });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selfrole')
        .setDescription('Post or attach a self-role panel and manage its emoji-to-role mappings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addSubcommand(sub =>
            sub
                .setName('create')
                .setDescription('Post a saved embed as a NEW self-role panel message')
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
                    o
                        .setName('mode')
                        .setDescription('Can a member hold more than one role from this panel? (default: multiple)')
                        .addChoices(...MODE_CHOICES)
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
                    o
                        .setName('mode')
                        .setDescription('Can a member hold more than one role from this panel? (default: multiple)')
                        .addChoices(...MODE_CHOICES)
                )
                .addStringOption(o =>
                    o
                        .setName('roles')
                        .setDescription('Optional: restore mappings in one go, e.g. "😀=@Role1, 🎮=@Role2"')
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('add-role')
                .setDescription('Map an emoji on a panel to a role')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o =>
                    o.setName('emoji').setDescription('Emoji to react with (unicode or a custom server emoji)').setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName('role').setDescription('Role to give when a member reacts with this emoji').setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('remove-role')
                .setDescription('Remove an emoji mapping from a panel')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
                .addStringOption(o => o.setName('emoji').setDescription('Emoji to remove').setRequired(true))
        )

        .addSubcommand(sub => sub.setName('list').setDescription('List self-role panels in this server'))

        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Delete a self-role panel (the original message is left as-is)')
                .addStringOption(o =>
                    o.setName('name').setDescription('Panel name').setRequired(true).setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const guildId = interaction.guild.id;

        const source = focused.name === 'embed' ? embedStore.listEmbeds(guildId) : selfRoles.listPanels(guildId);

        const filtered = source.filter(v => v.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25);

        await interaction.respond(filtered.map(v => ({ name: v, value: v })));
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'create') {
                const name = interaction.options.getString('name');
                const channel = interaction.options.getChannel('channel');
                const embedName = interaction.options.getString('embed');
                const mode = interaction.options.getString('mode') || 'multiple';

                if (selfRoles.getPanel(guildId, name)) {
                    return replyError(interaction, `A self-role panel named \`${name}\` already exists.`);
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
                    console.error('Failed to post self-role panel:', error);
                    return replyError(interaction, 'Failed to post the panel. Check my permissions in that channel.');
                }

                selfRoles.createPanel(guildId, name, { messageId: message.id, channelId: channel.id, mode });

                return replySuccess(
                    interaction,
                    `Panel \`${name}\` posted in ${channel} (message ID: \`${message.id}\` — save this in case you need \`/selfrole link\` later).\n` +
                    `Now add roles with \`/selfrole add-role name:${name} emoji:<emoji> role:<role>\`.`
                );
            }

            if (subcommand === 'link') {
                const name = interaction.options.getString('name');
                const channel = interaction.options.getChannel('channel');
                const messageId = interaction.options.getString('message-id');
                const mode = interaction.options.getString('mode') || 'multiple';
                const rolesInput = interaction.options.getString('roles');

                if (selfRoles.getPanel(guildId, name)) {
                    return replyError(interaction, `A self-role panel named \`${name}\` already exists.`);
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);

                if (!message) {
                    return replyError(
                        interaction,
                        `Couldn't find a message with ID \`${messageId}\` in ${channel}. Double-check the ID and that I can see that channel.`
                    );
                }

                let pairs = [];
                if (rolesInput) {
                    try {
                        pairs = parseRolePairs(rolesInput);
                    } catch (error) {
                        return replyError(interaction, `${error.message}. Panel was NOT created — fix the "roles" text and try again.`);
                    }
                }

                selfRoles.createPanel(guildId, name, { messageId: message.id, channelId: channel.id, mode });

                if (!pairs.length) {
                    return replySuccess(
                        interaction,
                        `Panel \`${name}\` linked to that existing message. Now add roles with \`/selfrole add-role\`.`
                    );
                }

                const results = [];
                for (const { rawEmoji, roleId } of pairs) {
                    const role = interaction.guild.roles.cache.get(roleId);

                    if (!role) {
                        results.push(`⚠️ ${rawEmoji} → role \`${roleId}\` not found in this server, skipped`);
                        continue;
                    }

                    try {
                        await message.react(rawEmoji);
                        selfRoles.addRole(guildId, name, normalizeEmoji(rawEmoji), roleId, rawEmoji);
                        results.push(`${rawEmoji} → **${role.name}**`);
                    } catch (error) {
                        console.error('Failed to restore role mapping:', error);
                        results.push(`⚠️ ${rawEmoji} → failed to react, skipped`);
                    }
                }

                return replySuccess(interaction, `Panel \`${name}\` linked and roles restored:\n${results.join('\n')}`);
            }

            if (subcommand === 'add-role') {
                const name = interaction.options.getString('name');
                const rawEmoji = interaction.options.getString('emoji');
                const role = interaction.options.getRole('role');

                const panel = selfRoles.getPanel(guildId, name);
                if (!panel) return replyError(interaction, `No self-role panel named \`${name}\` was found.`);

                const channel = interaction.guild.channels.cache.get(panel.channelId);
                const message = channel && (await channel.messages.fetch(panel.messageId).catch(() => null));

                if (!message) {
                    return replyError(interaction, 'The original panel message could not be found — it may have been deleted.');
                }

                try {
                    await message.react(rawEmoji);
                } catch (error) {
                    console.error('Failed to react with emoji:', error);
                    return replyError(interaction, "Failed to react with that emoji — make sure it's a valid emoji I have access to.");
                }

                selfRoles.addRole(guildId, name, normalizeEmoji(rawEmoji), role.id, rawEmoji);

                return replySuccess(interaction, `${rawEmoji} on \`${name}\` now gives **${role.name}**.`);
            }

            if (subcommand === 'remove-role') {
                const name = interaction.options.getString('name');
                const rawEmoji = interaction.options.getString('emoji');
                const emojiKey = normalizeEmoji(rawEmoji);

                const removed = selfRoles.removeRole(guildId, name, emojiKey);

                if (!removed) {
                    return replyError(interaction, `${rawEmoji} isn't mapped on \`${name}\`.`);
                }

                const panel = selfRoles.getPanel(guildId, name);
                const channel = panel && interaction.guild.channels.cache.get(panel.channelId);
                const message = channel && (await channel.messages.fetch(panel.messageId).catch(() => null));
                const reaction = message?.reactions.cache.get(emojiKey) ?? message?.reactions.cache.find(r => r.emoji.name === rawEmoji);

                if (reaction) await reaction.remove().catch(() => {});

                return replySuccess(interaction, `Removed ${rawEmoji} from \`${name}\`.`);
            }

            if (subcommand === 'list') {
                const names = selfRoles.listPanels(guildId);

                if (!names.length) {
                    return interaction.reply({ content: 'No self-role panels have been created yet.', ephemeral: true });
                }

                const lines = names.map(name => {
                    const panel = selfRoles.getPanel(guildId, name);
                    const mappings = Object.values(panel.roles)
                        .map(m => `${m.display} → <@&${m.roleId}>`)
                        .join(', ');

                    return `**${name}** (${panel.mode}) in <#${panel.channelId}> — message ID: \`${panel.messageId}\`\n${mappings || '*no roles mapped yet*'}`;
                });

                return interaction.reply({ content: lines.join('\n\n'), ephemeral: true });
            }

            if (subcommand === 'delete') {
                const name = interaction.options.getString('name');
                const deleted = selfRoles.deletePanel(guildId, name);

                return deleted
                    ? replySuccess(interaction, `Panel \`${name}\` deleted. The original message and reactions were left as-is.`)
                    : replyError(interaction, `No self-role panel named \`${name}\` was found.`);
            }
        } catch (error) {
            return replyError(interaction, error.message);
        }
    },
};