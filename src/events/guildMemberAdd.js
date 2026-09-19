'use strict';

const welcomeEmbed = require('../embeds/welcome');
const { getChannel, getRole } = require('../config/guildConfig');
const { resolveEventEmbed } = require('../utils/embedResolver');
const { applyPlaceholders } = require('../embeds/embedStore');
const welcomeMessage = require('../config/welcomeMessageConfig');

function placeholderContext(member) {
    return {
        userMention: `<@${member.id}>`,
        username: member.user.username,
        serverName: member.guild.name,
        memberCount: member.guild.memberCount,
    };
}

// The role-assign + embed welcome (existing behavior, driven by /config
// and /embed bind).
async function sendWelcomeEmbed(member) {
    const channelId = getChannel(member.guild.id, 'welcome');
    const roleId = getRole(member.guild.id, 'welcome');

    const channel = channelId && member.guild.channels.cache.get(channelId);
    const role = roleId && member.guild.roles.cache.get(roleId);

    if (!channel) return;

    if (!role) {
        console.error('Welcome role not found.');
        return;
    }

    try {
        await member.roles.add(role);
    } catch (error) {
        console.error('Failed to assign welcome role:', error);
    }

    const embed = resolveEventEmbed(member.guild.id, 'welcome', placeholderContext(member), () => welcomeEmbed(member));

    try {
        await channel.send({
            content: `Hey <@${member.id}>!`,
            embeds: [embed],
        });
    } catch (error) {
        console.error(`Failed to send welcome message in #${channel.name} — check my permissions there:`, error);
    }
}

// A separate, optional plain-text welcome message that auto-deletes,
// configured with /welcometext. Independent of the embed welcome above —
// either can be set up without the other.
async function sendWelcomeText(member) {
    const settings = welcomeMessage.getSettings(member.guild.id);

    if (!settings.enabled || !settings.channelId || !settings.template) return;

    const channel = member.guild.channels.cache.get(settings.channelId);
    if (!channel) return;

    const content = applyPlaceholders(settings.template, placeholderContext(member));

    try {
        const sent = await channel.send({ content });

        setTimeout(() => {
            sent.delete().catch(() => {});
        }, settings.deleteAfter * 1000);
    } catch (error) {
        console.error(`Failed to send auto-deleting welcome text in #${channel.name} — check my permissions there:`, error);
    }
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        await sendWelcomeEmbed(member);
        await sendWelcomeText(member);
    },
};
