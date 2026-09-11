'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('selfRoles.json', {});

function getGuildPanels(guildId) {
    return store.get(guildId, {});
}

function savePanels(guildId, panels) {
    store.set(guildId, panels);
}

function listPanels(guildId) {
    return Object.keys(getGuildPanels(guildId));
}

function getPanel(guildId, name) {
    return getGuildPanels(guildId)[name] || null;
}

function createPanel(guildId, name, { messageId, channelId, mode }) {
    const panels = getGuildPanels(guildId);

    if (panels[name]) {
        throw new Error(`A self-role panel named "${name}" already exists.`);
    }

    panels[name] = { messageId, channelId, mode, roles: {} };
    savePanels(guildId, panels);
}

function deletePanel(guildId, name) {
    const panels = getGuildPanels(guildId);
    if (!(name in panels)) return false;
    delete panels[name];
    savePanels(guildId, panels);
    return true;
}

/**
 * @param emojiKey - a custom emoji's snowflake ID, or the literal unicode
 *   emoji character. This is what reaction events key off of.
 * @param display - how to show the emoji back to admins (e.g. in /selfrole
 *   list), since a raw custom-emoji ID isn't human-readable on its own.
 */
function addRole(guildId, name, emojiKey, roleId, display) {
    const panels = getGuildPanels(guildId);
    const panel = panels[name];

    if (!panel) {
        throw new Error(`No self-role panel named "${name}" was found.`);
    }

    panel.roles[emojiKey] = { roleId, display };
    savePanels(guildId, panels);
}

function removeRole(guildId, name, emojiKey) {
    const panels = getGuildPanels(guildId);
    const panel = panels[name];

    if (!panel) {
        throw new Error(`No self-role panel named "${name}" was found.`);
    }

    if (!(emojiKey in panel.roles)) return false;

    delete panel.roles[emojiKey];
    savePanels(guildId, panels);
    return true;
}

function findPanelByMessage(guildId, messageId) {
    const panels = getGuildPanels(guildId);

    for (const [name, panel] of Object.entries(panels)) {
        if (panel.messageId === messageId) return { name, ...panel };
    }

    return null;
}

module.exports = {
    listPanels,
    getPanel,
    createPanel,
    deletePanel,
    addRole,
    removeRole,
    findPanelByMessage,
};