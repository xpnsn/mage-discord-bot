require('dotenv').config();
require('./health-check');

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Client, IntentsBitField, Collection, Partials } = require('discord.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
    // Needed so reaction events (used by /selfrole) still fire for
    // messages/reactions the bot hasn't cached — e.g. right after a restart.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

// ================================
// Load slash commands
// ================================
client.commands = new Collection();

const commandsRoot = join(__dirname, 'commands');

for (const folder of readdirSync(commandsRoot)) {
    const folderPath = join(commandsRoot, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// ================================
// Load event handlers (src/events/*.js)
// ================================
const eventsRoot = join(__dirname, 'src', 'events');

// A single event handler throwing (e.g. missing permissions in one
// channel) must never take the whole bot down. client.on()/once() don't
// await their listener, so an unhandled rejection here would otherwise
// crash the process — wrap every handler so it just logs and moves on.
function safeExecute(event, args) {
    Promise.resolve(event.execute(client, ...args)).catch(error => {
        console.error(`Unhandled error in "${event.name}" handler:`, error);
    });
}

for (const file of readdirSync(eventsRoot).filter(f => f.endsWith('.js'))) {
    const event = require(join(eventsRoot, file));

    if (event.once) {
        client.once(event.name, (...args) => safeExecute(event, args));
    } else {
        client.on(event.name, (...args) => safeExecute(event, args));
    }
}

client.login(process.env.TOKEN);
