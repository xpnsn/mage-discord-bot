require('dotenv').config();
require('./health-check');

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Client, IntentsBitField, ActivityType, Events, Collection } = require('discord.js');

const trigger = [
    ['ded', 'hello', '<@1130090945581432873>'],
    ['shine bakayaro.', 'hey there', '<@887336793681330197> created me!']
];

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions
    ],
});

client.on('messageCreate', (msg) => {
    if (msg.author.bot) {
        return;
    }

    for (let i = 0; i < trigger[0].length; i++) {
        if (msg.content.toLocaleLowerCase() === trigger[0][i]) {
            msg.channel.send(trigger[1][i]);
        }
    }
});

client.commands = new Collection();

const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.on('ready', () => {
    console.log('The bot is online!');

    // client.user.setActivity({
    //     name: 'Cigarettes After Sex',
    //     type: ActivityType.Listening,
    // });
});

client.login(process.env.TOKEN);
