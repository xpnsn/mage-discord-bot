'use strict';

const selfRoles = require('../config/selfRoles');
const ticketConfig = require('../config/ticketConfig');
const { openTicket } = require('../tickets/ticketService');

async function handleSelfRole(panel, reaction, member) {
    const emojiKey = reaction.emoji.id || reaction.emoji.name;
    const mapping = panel.roles[emojiKey];
    if (!mapping) return false;

    try {
        if (panel.mode === 'unique') {
            const otherRoleIds = Object.values(panel.roles)
                .map(m => m.roleId)
                .filter(id => id !== mapping.roleId);
            const toRemove = otherRoleIds.filter(id => member.roles.cache.has(id));

            if (toRemove.length) await member.roles.remove(toRemove);
        }

        if (!member.roles.cache.has(mapping.roleId)) {
            await member.roles.add(mapping.roleId);
        }
    } catch (error) {
        console.error('Failed to add self-role:', error);
    }

    return true;
}

async function handleTicketPanel(panel, reaction, message, user) {
    const emojiKey = reaction.emoji.id || reaction.emoji.name;
    if (emojiKey !== panel.emoji) return false;

    try {
        const { channel, alreadyOpen } = await openTicket(message.guild, panel.name, panel, user);

        if (alreadyOpen && channel) {
            await user.send(`You already have an open ticket: ${channel}`).catch(() => {});
        }
    } catch (error) {
        console.error('Failed to open ticket:', error);
    } finally {
        // Let the user react again later for a new ticket.
        await reaction.users.remove(user.id).catch(() => {});
    }

    return true;
}

module.exports = {
    name: 'messageReactionAdd',
    async execute(client, reaction, user) {
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();
            if (reaction.message.partial) await reaction.message.fetch();
        } catch (error) {
            console.error('Failed to fetch partial reaction:', error);
            return;
        }

        const { message } = reaction;
        if (!message.guild) return;

        const selfRolePanel = selfRoles.findPanelByMessage(message.guild.id, message.id);

        if (selfRolePanel) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member) await handleSelfRole(selfRolePanel, reaction, member);
            return;
        }

        const ticketPanel = ticketConfig.findPanelByMessage(message.guild.id, message.id);

        if (ticketPanel) {
            await handleTicketPanel(ticketPanel, reaction, message, user);
        }
    },
};
