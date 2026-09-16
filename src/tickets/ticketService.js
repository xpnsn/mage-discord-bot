'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const ticketConfig = require('../config/ticketConfig');

/**
 * Opens a ticket for `user` under `panel`, or returns their existing one
 * if they already have a ticket open for this specific panel.
 */
async function openTicket(guild, panelName, panel, user) {
    const existingChannelId = ticketConfig.findOpenTicketForUser(guild.id, panelName, user.id);

    if (existingChannelId) {
        return { channel: guild.channels.cache.get(existingChannelId) || null, alreadyOpen: true };
    }

    const number = ticketConfig.nextTicketNumber(guild.id, panelName);
    const channelName = `ticket-${String(number).padStart(4, '0')}`;

    const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        ...panel.staffRoles.map(roleId => ({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        })),
    ];

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: panel.categoryId || undefined,
        permissionOverwrites: overwrites,
        reason: `Ticket opened by ${user.tag}`,
    });

    ticketConfig.recordTicket(guild.id, channel.id, { panelName, userId: user.id });

    const staffMentions = panel.staffRoles.map(id => `<@&${id}>`).join(' ');

    await channel.send({
        content:
            `${user} welcome to your ticket!${staffMentions ? ` ${staffMentions}` : ''} will be with you shortly.\n\n` +
            'Use `/ticket close` in this channel when it can be closed.',
    });

    return { channel, alreadyOpen: false };
}

module.exports = { openTicket };
