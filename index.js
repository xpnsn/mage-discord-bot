require('dotenv').config();
require('./health-check');

process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || require('ffmpeg-static');

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Client, IntentsBitField, Collection } = require('discord.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
    ],
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

for (const file of readdirSync(eventsRoot).filter(f => f.endsWith('.js'))) {
    const event = require(join(eventsRoot, file));

    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}

client.login(process.env.TOKEN);
