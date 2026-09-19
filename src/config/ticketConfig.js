'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('tickets.json', {});

function getGuildData(guildId) {
    const data = store.get(guildId, { panels: {}, tickets: {}, logChannelId: null });
    data.panels ??= {};
    data.tickets ??= {};
    data.logChannelId ??= null;
    return data;
}

function saveGuildData(guildId, data) {
    store.set(guildId, data);
}

// ---- Transcript log channel (guild-wide, not per-panel) ----

function getLogChannel(guildId) {
    return getGuildData(guildId).logChannelId;
}

function setLogChannel(guildId, channelId) {
    const data = getGuildData(guildId);
    data.logChannelId = channelId;
    saveGuildData(guildId, data);
}

// ---- Panels (the message people react to, to open a ticket) ----

function listPanels(guildId) {
    return Object.keys(getGuildData(guildId).panels);
}

function getPanel(guildId, name) {
    return getGuildData(guildId).panels[name] || null;
}

function createPanel(guildId, name, { messageId, channelId, emoji, emojiDisplay, categoryId = null }) {
    const data = getGuildData(guildId);

    if (data.panels[name]) {
        throw new Error(`A ticket panel named "${name}" already exists.`);
    }

    data.panels[name] = { messageId, channelId, emoji, emojiDisplay, categoryId, staffRoles: [], counter: 0 };
    saveGuildData(guildId, data);
}

function deletePanel(guildId, name) {
    const data = getGuildData(guildId);
    if (!(name in data.panels)) return false;
    delete data.panels[name];
    saveGuildData(guildId, data);
    return true;
}

function setCategory(guildId, name, categoryId) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];
    if (!panel) throw new Error(`No ticket panel named "${name}" was found.`);
    panel.categoryId = categoryId;
    saveGuildData(guildId, data);
}

function addStaffRole(guildId, name, roleId) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];
    if (!panel) throw new Error(`No ticket panel named "${name}" was found.`);
    if (!panel.staffRoles.includes(roleId)) panel.staffRoles.push(roleId);
    saveGuildData(guildId, data);
}

function removeStaffRole(guildId, name, roleId) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];
    if (!panel) throw new Error(`No ticket panel named "${name}" was found.`);
    panel.staffRoles = panel.staffRoles.filter(id => id !== roleId);
    saveGuildData(guildId, data);
}

function findPanelByMessage(guildId, messageId) {
    const data = getGuildData(guildId);

    for (const [name, panel] of Object.entries(data.panels)) {
        if (panel.messageId === messageId) return { name, ...panel };
    }

    return null;
}

function nextTicketNumber(guildId, name) {
    const data = getGuildData(guildId);
    const panel = data.panels[name];
    if (!panel) throw new Error(`No ticket panel named "${name}" was found.`);
    panel.counter += 1;
    saveGuildData(guildId, data);
    return panel.counter;
}

// ---- Open tickets (channels that currently exist) ----

function recordTicket(guildId, channelId, { panelName, userId }) {
    const data = getGuildData(guildId);
    data.tickets[channelId] = { panelName, userId, createdAt: Date.now() };
    saveGuildData(guildId, data);
}

function getTicket(guildId, channelId) {
    return getGuildData(guildId).tickets[channelId] || null;
}

function deleteTicket(guildId, channelId) {
    const data = getGuildData(guildId);
    if (!(channelId in data.tickets)) return false;
    delete data.tickets[channelId];
    saveGuildData(guildId, data);
    return true;
}

function findOpenTicketForUser(guildId, panelName, userId) {
    const data = getGuildData(guildId);

    for (const [channelId, ticket] of Object.entries(data.tickets)) {
        if (ticket.panelName === panelName && ticket.userId === userId) return channelId;
    }

    return null;
}

module.exports = {
    listPanels,
    getPanel,
    createPanel,
    deletePanel,
    setCategory,
    addStaffRole,
    removeStaffRole,
    findPanelByMessage,
    nextTicketNumber,
    recordTicket,
    getTicket,
    deleteTicket,
    findOpenTicketForUser,
    getLogChannel,
    setLogChannel,
};
