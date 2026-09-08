'use strict';

async function replyError(interaction, message) {
    const payload = { content: `❌ ${message}`, ephemeral: true };
    return interaction.deferred || interaction.replied
        ? interaction.editReply(payload)
        : interaction.reply(payload);
}

async function replySuccess(interaction, message) {
    const payload = { content: `✅ ${message}`, ephemeral: true };
    return interaction.deferred || interaction.replied
        ? interaction.editReply(payload)
        : interaction.reply(payload);
}

module.exports = { replyError, replySuccess };
