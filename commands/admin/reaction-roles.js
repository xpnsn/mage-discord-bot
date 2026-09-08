'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embedStore = require('../../src/embeds/embedStore');
const reactionRoleStore = require('../../src/embeds/reactionRoleStore');
const { replySuccess, replyError } = require('../../src/utils/replies');

const MAX_PAIRS = 10;
const CUSTOM_EMOJI_REGEX = /^<a?:(\w+):(\d+)>$/;

// A custom emoji (<:name:id> / <a:name:id>) reacts by "name:id" and is
// keyed by its snowflake. A standard emoji reacts and is keyed by the
// raw character itself — matches what MessageReaction#emoji gives back.
function parseEmoji(raw) {
    const trimmed = raw.trim();
    const match = trimmed.match(CUSTOM_EMOJI_REGEX);

    if (match) {
        const [, name, id] = match;
        return { key: id, reactable: `${name}:${id}` };
    }

    return { key: trimmed, reactable: trimmed };
}

function pairOptions(sub) {
    for (let i = 1; i <= MAX_PAIRS; i++) {
        sub
            .addRoleOption(o =>
                o.setName(`role-${i}`).setDescription(`Role to give for reaction ${i}`).setRequired(i === 1)
            )
            .addStringOption(o =>
                o
                    .setName(`emoji-${i}`)
                    .setDescription(`Emoji members react with for reaction ${i}`)
                    .setRequired(i === 1)
            );
    }
    return sub;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reaction-roles')
        .setDescription('Post an embed where reacting gives members a role')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addSubcommand(sub =>
            pairOptions(
                sub
                    .setName('create')
                    .setDescription('Post an existing embed and wire up to 10 reaction-role pairs')
                    .addStringOption(o =>
                        o
                            .setName('embed')
                            .setDescription('Name of an embed created with /embed create')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
                    .addChannelOption(o =>
                        o
                            .setName('channel')
                            .setDescription('Channel to post the embed in')
                            .addChannelTypes(ChannelType.GuildText)
                            .setRequired(true)
                    )
            ).addRoleOption(o =>
                o.setName('ping-role').setDescription('Role to mention outside the embed when it\'s posted')
            )
        )

        .addSubcommand(sub =>
            sub
                .setName('delete')
                .setDescription('Stop a message from granting roles on reaction')
                .addStringOption(o =>
                    o.setName('message-id').setDescription('ID of the reaction-role message').setRequired(true)
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

        await interaction.deferReply({ ephemeral: true });

        if (subcommand === 'delete') {
            const messageId = interaction.options.getString('message-id');
            const removed = reactionRoleStore.removeMessage(guildId, messageId);
            return removed
                ? replySuccess(interaction, `Message \`${messageId}\` no longer grants roles on reaction.`)
                : replyError(interaction, `No reaction-role message with ID \`${messageId}\` was found.`);
        }

        // subcommand === 'create'
        const embedName = interaction.options.getString('embed');
        const channel = interaction.options.getChannel('channel');
        const pingRole = interaction.options.getRole('ping-role');
        const fields = embedStore.getEmbed(guildId, embedName);

        if (!fields) {
            return replyError(
                interaction,
                `No embed named \`${embedName}\` was found. Create one with \`/embed create\` first.`
            );
        }

        const botMember = interaction.guild.members.me;
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const pairs = [];
        const seenEmojiKeys = new Set();
        const seenRoleIds = new Set();

        for (let i = 1; i <= MAX_PAIRS; i++) {
            const role = interaction.options.getRole(`role-${i}`);
            const emojiRaw = interaction.options.getString(`emoji-${i}`);

            if (!role && !emojiRaw) continue;
            if (!role || !emojiRaw) {
                return replyError(interaction, `Pair ${i} needs both a role and an emoji.`);
            }

            if (role.position >= botMember.roles.highest.position) {
                return replyError(
                    interaction,
                    `I can't manage **${role.name}** — it's higher than or equal to my highest role.`
                );
            }

            if (!isOwner && interaction.member.roles.highest.position <= role.position) {
                return replyError(
                    interaction,
                    `You can't wire up **${role.name}** — it's higher than or equal to your highest role.`
                );
            }

            const { key, reactable } = parseEmoji(emojiRaw);

            if (seenEmojiKeys.has(key)) {
                return replyError(interaction, `The emoji for pair ${i} is used more than once.`);
            }
            if (seenRoleIds.has(role.id)) {
                return replyError(interaction, `**${role.name}** is used more than once.`);
            }

            seenEmojiKeys.add(key);
            seenRoleIds.add(role.id);
            pairs.push({ role, key, reactable, display: emojiRaw.trim() });
        }

        if (pairs.length === 0) {
            return replyError(interaction, 'Add at least one role + emoji pair.');
        }

        const embed = embedStore.buildEmbed(fields, {
            userMention: `<@${interaction.user.id}>`,
            username: interaction.user.username,
            serverName: interaction.guild.name,
            memberCount: interaction.guild.memberCount,
        });

        let message;
        try {
            message = await channel.send({
                content: pingRole ? `${pingRole}` : undefined,
                embeds: [embed],
                allowedMentions: pingRole ? { roles: [pingRole.id] } : { parse: [] },
            });
        } catch (error) {
            console.error('Failed to post reaction-role embed:', error);
            return replyError(interaction, `Couldn't post to ${channel}. Check my permissions there.`);
        }

        for (const pair of pairs) {
            try {
                await message.react(pair.reactable);
            } catch (error) {
                console.error(`Failed to react with ${pair.display}:`, error);
                await message.delete().catch(() => {});
                return replyError(
                    interaction,
                    `Couldn't react with ${pair.display} — is it a valid emoji I have access to? Nothing was posted.`
                );
            }
        }

        const roleMap = {};
        for (const pair of pairs) roleMap[pair.key] = pair.role.id;

        reactionRoleStore.addMessage(guildId, message.id, channel.id, roleMap);

        const summary = pairs.map(p => `${p.display} → ${p.role}`).join('\n');
        const pingNote = pingRole ? ` and pinged ${pingRole}` : '';
        return replySuccess(
            interaction,
            `Reaction-role menu posted in ${channel}${pingNote}.\n${summary}\n\nMessage ID: \`${message.id}\` (use this with \`/reaction-roles delete\` to remove it later).`
        );
    },
};