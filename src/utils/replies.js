'use strict';

const { MessageFlags } = require('discord.js');

async function replyError(interaction, message) {
    const payload = { content: `❌ ${message}`, flags: MessageFlags.Ephemeral };
    return interaction.deferred || interaction.replied
        ? interaction.editReply(payload)
        : interaction.reply(payload);
}

async function replySuccess(interaction, message) {
    const payload = { content: `✅ ${message}`, flags: MessageFlags.Ephemeral };
    return interaction.deferred || interaction.replied
        ? interaction.editReply(payload)
        : interaction.reply(payload);
}

// For replies that aren't a plain success/error message (e.g. a list, or
// an embed preview) but still need to work whether or not the command
// deferred first. Accepts a string or a full reply payload object.
async function replyContent(interaction, payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    return interaction.deferred || interaction.replied
        ? interaction.editReply(data)
        : interaction.reply(data);
}

module.exports = { replyError, replySuccess, replyContent };
