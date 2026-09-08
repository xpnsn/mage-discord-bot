'use strict';

const { EmbedBuilder } = require('discord.js');
const JsonStore = require('../utils/jsonStore');

const store = new JsonStore('embeds.json', {});

const LIMITS = {
    title: 256,
    description: 4096,
    footer: 2048,
};

function getGuildEmbeds(guildId) {
    return store.get(guildId, {});
}

function listEmbeds(guildId) {
    return Object.keys(getGuildEmbeds(guildId));
}

function getEmbed(guildId, name) {
    return getGuildEmbeds(guildId)[name] || null;
}

function saveEmbed(guildId, name, fields) {
    const embeds = getGuildEmbeds(guildId);
    embeds[name] = fields;
    store.set(guildId, embeds);
}

function deleteEmbed(guildId, name) {
    const embeds = getGuildEmbeds(guildId);
    if (!(name in embeds)) return false;
    delete embeds[name];
    store.set(guildId, embeds);
    return true;
}

function validateFields(fields) {
    for (const key of ['title', 'description', 'footer']) {
        if (fields[key] && fields[key].length > LIMITS[key]) {
            throw new Error(`${key} must be ${LIMITS[key]} characters or fewer.`);
        }
    }

    if (fields.color && !/^#?[0-9a-fA-F]{6}$/.test(fields.color)) {
        throw new Error('Color must be a hex code like #5865F2.');
    }

    for (const key of ['image', 'thumbnail']) {
        if (fields[key] && !/^https?:\/\//i.test(fields[key])) {
            throw new Error(`${key} must be a valid http(s) URL.`);
        }
    }
}

function createEmbed(guildId, name, fields) {
    if (getEmbed(guildId, name)) {
        throw new Error(`An embed named "${name}" already exists — use \`/embed edit\` instead.`);
    }

    validateFields(fields);
    saveEmbed(guildId, name, fields);
}

function editEmbed(guildId, name, patch) {
    const existing = getEmbed(guildId, name);

    if (!existing) {
        throw new Error(`No embed named "${name}" was found.`);
    }

    const merged = { ...existing, ...patch };
    validateFields(merged);
    saveEmbed(guildId, name, merged);
    return merged;
}

/**
 * Replaces {placeholders} with values from context.
 * Supported: {user} {username} {server} {memberCount}
 */
function applyPlaceholders(text, context = {}) {
    if (!text) return text;

    return text
        .replace(/{user}/g, context.userMention ?? '')
        .replace(/{username}/g, context.username ?? '')
        .replace(/{server}/g, context.serverName ?? '')
        .replace(/{memberCount}/g, context.memberCount ?? '');
}

function buildEmbed(fields, context = {}) {
    const embed = new EmbedBuilder().setColor(fields.color || '#2b2d31');

    if (fields.title) embed.setTitle(applyPlaceholders(fields.title, context));
    if (fields.description) embed.setDescription(applyPlaceholders(fields.description, context));
    if (fields.footer) embed.setFooter({ text: applyPlaceholders(fields.footer, context) });
    if (fields.image) embed.setImage(fields.image);
    if (fields.thumbnail) embed.setThumbnail(fields.thumbnail);

    return embed;
}

module.exports = {
    listEmbeds,
    getEmbed,
    createEmbed,
    editEmbed,
    deleteEmbed,
    buildEmbed,
    applyPlaceholders,
};
