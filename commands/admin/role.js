'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { replySuccess, replyError } = require('../../src/utils/replies');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Give or remove a role from a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Give a member a role')
                .addUserOption(o => o.setName('user').setDescription('The member').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('The role to give').setRequired(true))
        )

        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove a role from a member')
                .addUserOption(o => o.setName('user').setDescription('The member').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('The role to remove').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return replyError(interaction, 'Could not find that member in this server.');
        }

        const botMember = interaction.guild.members.me;

        if (role.position >= botMember.roles.highest.position) {
            return replyError(
                interaction,
                `I can't manage the **${role.name}** role because it's higher than or equal to my highest role.`
            );
        }

        const isOwner = interaction.guild.ownerId === interaction.user.id;
        if (!isOwner && interaction.member.roles.highest.position <= role.position) {
            return replyError(
                interaction,
                `You can't manage the **${role.name}** role because it's higher than or equal to your highest role.`
            );
        }

        try {
            if (subcommand === 'add') {
                if (member.roles.cache.has(role.id)) {
                    return replyError(interaction, `${member} already has **${role.name}**.`);
                }
                await member.roles.add(role);
                return replySuccess(interaction, `Gave **${role.name}** to ${member}.`);
            }

            if (subcommand === 'remove') {
                if (!member.roles.cache.has(role.id)) {
                    return replyError(interaction, `${member} doesn't have **${role.name}**.`);
                }
                await member.roles.remove(role);
                return replySuccess(interaction, `Removed **${role.name}** from ${member}.`);
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            return replyError(interaction, 'Failed to update that role. Check my permissions and role position.');
        }
    },
};
