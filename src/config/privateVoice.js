'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('privateVoice.json', {});

function getSettings(guildId) {
    const settings = store.get(guildId, { categoryId: null, channels: {} });
    settings.channels ??= {};
    return settings;
}

function saveSettings(guildId, settings) {
    store.set(guildId, settings);
}

function setCategory(guildId, categoryId) {
    const settings = getSettings(guildId);
    settings.categoryId = categoryId;
    saveSettings(guildId, settings);
}

function recordChannel(guildId, channelId, ownerId) {
    const settings = getSettings(guildId);
    settings.channels[channelId] = { ownerId };
    saveSettings(guildId, settings);
}

function removeChannel(guildId, channelId) {
    const settings = getSettings(guildId);
    if (!(channelId in settings.channels)) return false;
    delete settings.channels[channelId];
    saveSettings(guildId, settings);
    return true;
}

function isPrivateVcChannel(guildId, channelId) {
    return channelId in getSettings(guildId).channels;
}

function findChannelByOwner(guildId, ownerId) {
    const settings = getSettings(guildId);

    for (const [channelId, info] of Object.entries(settings.channels)) {
        if (info.ownerId === ownerId) return channelId;
    }

    return null;
}

module.exports = {
    getSettings,
    setCategory,
    recordChannel,
    removeChannel,
    isPrivateVcChannel,
    findChannelByOwner,
};
