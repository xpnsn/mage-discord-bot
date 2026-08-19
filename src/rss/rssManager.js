const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser();

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'rss.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, '{}');
}

let feeds = JSON.parse(
    fs.readFileSync(CONFIG_FILE, 'utf8')
);

const timers = new Map();

function saveFeeds() {
    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(feeds, null, 2)
    );
}

function setupFeed(guildId, config) {
    feeds[guildId] = {
        ...config,
        lastGuid: feeds[guildId]?.lastGuid || null
    };

    saveFeeds();

    return startFeed(guildId);
}

function removeFeed(guildId) {
    stopFeed(guildId);

    if (!feeds[guildId]) {
        return false;
    }

    delete feeds[guildId];

    saveFeeds();

    return true;
}

function getFeedConfig(guildId) {
    return feeds[guildId] || null;
}

function stopFeed(guildId) {
    const timer = timers.get(guildId);

    if (timer) {
        clearInterval(timer);
        timers.delete(guildId);
    }
}

function startFeed(guildId) {
    stopFeed(guildId);

    const config = feeds[guildId];

    if (!config) {
        return;
    }

    const intervalMs =
        (config.interval || 10) * 60 * 1000;

    const timer = setInterval(async () => {
        try {
            await checkFeed(guildId);
        } catch (error) {
            console.error(
                `[RSS] ${guildId}:`,
                error.message
            );
        }
    }, intervalMs);

    timers.set(guildId, timer);
}

async function checkFeed(guildId) {
    const config = feeds[guildId];

    if (!config) {
        return;
    }

    const feed = await parser.parseURL(config.url);

    if (!feed.items || feed.items.length === 0) {
        return;
    }

    /*
     * RSS feeds normally return newest items first.
     */
    const newestItem = feed.items[0];

    const guid =
        newestItem.guid ||
        newestItem.id ||
        newestItem.link ||
        newestItem.title;

    /*
     * First run:
     *
     * Don't spam the entire existing RSS feed.
     * Just remember the newest item.
     */
    if (!config.lastGuid) {
        config.lastGuid = guid;

        saveFeeds();

        console.log(
            `[RSS] Initialized ${guildId} with: ${newestItem.title}`
        );

        return;
    }

    if (guid === config.lastGuid) {
        return;
    }

    /*
     * Find all items newer than the last item.
     *
     * Usually this will only be one item.
     */
    const newItems = [];

    for (const item of feed.items) {
        const itemGuid =
            item.guid ||
            item.id ||
            item.link ||
            item.title;

        if (itemGuid === config.lastGuid) {
            break;
        }

        newItems.push(item);
    }

    /*
     * Post oldest → newest.
     */
    newItems.reverse();

    for (const item of newItems) {
        await postItem(guildId, item);
    }

    config.lastGuid = guid;

    saveFeeds();
}

async function postItem(guildId, item, client) {
    /*
     * This function is called through testFeed with a client,
     * or the client is stored globally by initializeRSS().
     */

    const discordClient = client || global.discordClient;

    if (!discordClient) {
        throw new Error('Discord client not initialized.');
    }

    const config = feeds[guildId];

    const channel =
        await discordClient.channels.fetch(
            config.channelId
        );

    if (!channel) {
        throw new Error('Configured channel not found.');
    }

    let description = item.contentSnippet ||
        item.content ||
        item.description ||
        '';

    /*
     * Remove excessive HTML.
     */
    description = description
        .replace(/<[^>]*>/g, '')
        .trim();

    /*
     * Discord embed description limit.
     */
    if (description.length > 4000) {
        description =
            description.substring(0, 3997) + '...';
    }

    const embed = {
        title: item.title || 'New RSS Item',
        url: item.link || undefined,
        description: description || undefined,
        timestamp: item.isoDate
            ? new Date(item.isoDate).toISOString()
            : new Date().toISOString(),
        footer: {
            text: 'RSS Feed'
        }
    };

    const content = config.roleId
        ? `<@&${config.roleId}>`
        : undefined;

    await channel.send({
        content,
        embeds: [embed],
        allowedMentions: config.roleId
            ? {
                roles: [config.roleId]
            }
            : {
                parse: []
            }
    });

    console.log(
        `[RSS] Posted: ${item.title}`
    );
}

async function testFeed(client, guildId) {
    const config = feeds[guildId];

    if (!config) {
        throw new Error(
            'No RSS feed configured.'
        );
    }

    const feed = await parser.parseURL(config.url);

    if (!feed.items.length) {
        throw new Error(
            'RSS feed contains no items.'
        );
    }

    await postItem(
        guildId,
        feed.items[0],
        client
    );
}

function initializeRSS(client) {
    global.discordClient = client;

    for (const guildId of Object.keys(feeds)) {
        startFeed(guildId);
    }

    console.log(
        `[RSS] Initialized ${Object.keys(feeds).length} feed(s).`
    );
}

module.exports = {
    setupFeed,
    removeFeed,
    getFeedConfig,
    testFeed,
    initializeRSS
};