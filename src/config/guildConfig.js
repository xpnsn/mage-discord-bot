'use strict';

const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('guildConfig.json', {});

const CHANNEL_KEYS = ['welcome', 'leave', 'boost', 'announcement'];
const ROLE_KEYS = ['welcome', 'boost'];

// Old deployments configured these through the .env file. Keep reading
// them as a fallback so nothing breaks until an admin runs /config.
const ENV_CHANNEL_FALLBACK = {
    leave: 'LEAVE_CHANNEL_ID',
    boost: 'BOOST_CHANNEL_ID',
};

const ENV_ROLE_FALLBACK = {
    boost: 'BOOST_ROLE_ID',
};

// The welcome channel/role used to be hardcoded constants in index.js
// with no env var at all. Preserve that exact original behavior as the
// last-resort default.
const HARDCODED_CHANNEL_FALLBACK = {
    welcome: '1221014228832616500',
};

const HARDCODED_ROLE_FALLBACK = {
    welcome: '1236251489677213787',
};

function emptyGuildConfig() {
    return { channels: {}, roles: {}, embeds: {} };
}

function getGuild(guildId) {
    const config = store.get(guildId, emptyGuildConfig());
    // Backfill any keys older config objects might be missing.
    config.channels ??= {};
    config.roles ??= {};
    config.embeds ??= {};
    return config;
}

function saveGuild(guildId, config) {
    store.set(guildId, config);
}

function setChannel(guildId, key, channelId) {
    const config = getGuild(guildId);
    config.channels[key] = channelId;
    saveGuild(guildId, config);
}

function getChannel(guildId, key) {
    const config = getGuild(guildId);
    if (config.channels[key]) return config.channels[key];

    const envVar = ENV_CHANNEL_FALLBACK[key];
    if (envVar && process.env[envVar]) return process.env[envVar];

    return HARDCODED_CHANNEL_FALLBACK[key] || null;
}

function setRole(guildId, key, roleId) {
    const config = getGuild(guildId);
    config.roles[key] = roleId;
    saveGuild(guildId, config);
}

function getRole(guildId, key) {
    const config = getGuild(guildId);
    if (config.roles[key]) return config.roles[key];

    const envVar = ENV_ROLE_FALLBACK[key];
    if (envVar && process.env[envVar]) return process.env[envVar];

    return HARDCODED_ROLE_FALLBACK[key] || null;
}

function bindEmbed(guildId, eventKey, embedName) {
    const config = getGuild(guildId);
    config.embeds[eventKey] = embedName;
    saveGuild(guildId, config);
}

function unbindEmbed(guildId, eventKey) {
    const config = getGuild(guildId);
    delete config.embeds[eventKey];
    saveGuild(guildId, config);
}

function getBoundEmbedName(guildId, eventKey) {
    return getGuild(guildId).embeds[eventKey] || null;
}

module.exports = {
    CHANNEL_KEYS,
    ROLE_KEYS,
    getGuild,
    setChannel,
    getChannel,
    setRole,
    getRole,
    bindEmbed,
    unbindEmbed,
    getBoundEmbedName,
};
