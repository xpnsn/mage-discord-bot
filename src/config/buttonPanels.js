'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('buttonPanels.json', {});

const MAX_BUTTONS = 25; // Discord's limit: 5 rows x 5 buttons

function getGuildData(guildId) {
    const data = store.get(guildId, { panels: {} });
    data.panels ??= {};
    return data;
}

function saveGuildData(guildId, data) {
    store.set(guildId, data);
}

function listPanels(guildId) {
    return Object.keys(getGuildData(guildId).panels);
}

function getPanel(guildId, name) {
    return getGuildData(guildId).panels[name] || null;
}

function createPanel(guildId, name, { messageId, channelId }) {
    const data = getGuildData(guildId);

    if (data.panels[name]) {
        throw new Error(`A button panel named "${name}" already exists.`);
    }

    data.panels[name] = { messageId, channelId, buttons: [] };
    saveGuildData(guildId, data);
}

function deletePanel(guildId, name) {
    const data = getGuildData(guildId);
    if (!(name in data.panels)) return false;
    delete data.panels[name];
    saveGuildData(guildId, data);
    return true;
}

/**
 * @returns the updated panel, for callers that need to rebuild the
 *   message's components right after.
 */
function addButton(guildId, name, button) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];

    if (!panel) {
        throw new Error(`No button panel named "${name}" was found.`);
    }

    if (panel.buttons.length >= MAX_BUTTONS) {
        throw new Error(`This panel already has the maximum of ${MAX_BUTTONS} buttons.`);
    }

    if (panel.buttons.some(b => b.key === button.key)) {
        throw new Error(`A button with key "${button.key}" already exists on this panel.`);
    }

    panel.buttons.push(button);
    saveGuildData(guildId, data);
    return panel;
}

function removeButton(guildId, name, key) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];

    if (!panel) {
        throw new Error(`No button panel named "${name}" was found.`);
    }

    const before = panel.buttons.length;
    panel.buttons = panel.buttons.filter(b => b.key !== key);
    saveGuildData(guildId, data);
    return panel.buttons.length !== before;
}

function findPanelByMessage(guildId, messageId) {
    const data = getGuildData(guildId);

    for (const [name, panel] of Object.entries(data.panels)) {
        if (panel.messageId === messageId) return { name, ...panel };
    }

    return null;
}

module.exports = {
    MAX_BUTTONS,
    listPanels,
    getPanel,
    createPanel,
    deletePanel,
    addButton,
    removeButton,
    findPanelByMessage,
};
