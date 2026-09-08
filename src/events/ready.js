'use strict';

const { initializeRSS } = require('../rss/rssManager');
const setupLinkModeration = require('../../funtionality/linkModeration');

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log('The bot is online!');
        console.log('Connected guilds:', client.guilds.cache.map(g => `${g.name} (${g.id})`));

        setupLinkModeration(client);
        initializeRSS(client);
    },
};
