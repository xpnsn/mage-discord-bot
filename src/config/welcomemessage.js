'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('welcomeMessage.json', {});

function getSettings(guildId) {
    return store.get(guildId, { enabled: false, channelId: null, template: null, deleteAfter: 30 });
}

function setConfig(guildId, { channelId, template, deleteAfter }) {
    const settings = getSettings(guildId);
    settings.enabled = true;
    settings.channelId = channelId;
    settings.template = template;
    settings.deleteAfter = deleteAfter;
    store.set(guildId, settings);
}

function disable(guildId) {
    const settings = getSettings(guildId);
    settings.enabled = false;
    store.set(guildId, settings);
}

module.exports = { getSettings, setConfig, disable };