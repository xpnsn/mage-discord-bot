'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('reactionRoles.json', {});

/**
 * Shape per guild:
 * {
 *   [messageId]: { channelId, roles: { [emojiKey]: roleId } }
 * }
 *
 * emojiKey is the custom emoji's snowflake ID, or the raw unicode
 * character for a standard emoji — same thing MessageReaction#emoji
 * exposes as `.id ?? .name`, so lookups on react need no parsing.
 */

function getGuildMessages(guildId) {
    return store.get(guildId, {});
}

function saveGuildMessages(guildId, messages) {
    store.set(guildId, messages);
}

function addMessage(guildId, messageId, channelId, roleMap) {
    const messages = getGuildMessages(guildId);
    messages[messageId] = { channelId, roles: roleMap };
    saveGuildMessages(guildId, messages);
}

function removeMessage(guildId, messageId) {
    const messages = getGuildMessages(guildId);
    if (!(messageId in messages)) return false;
    delete messages[messageId];
    saveGuildMessages(guildId, messages);
    return true;
}

function getMessage(guildId, messageId) {
    return getGuildMessages(guildId)[messageId] || null;
}

function getRoleForReaction(guildId, messageId, emojiKey) {
    const message = getMessage(guildId, messageId);
    return message?.roles[emojiKey] || null;
}

module.exports = {
    addMessage,
    removeMessage,
    getMessage,
    getRoleForReaction,
};
