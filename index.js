require('dotenv').config();
require('./health-check');

const {
    initializeRSS
} = require('./src/rss/rssManager');


const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Client, IntentsBitField, ActivityType, Events, Collection } = require('discord.js');
const welcomeEmbed = require('./src/embeds/welcome');

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
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
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

const WELCOME_CHANNEL_ID = '1221014228832616500';
const WELCOME_ROLE_ID = '1236251489677213787';

client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    const role = member.guild.roles.cache.get(WELCOME_ROLE_ID);

    if (!channel) return;

    const embed = welcomeEmbed(member);

    if (!role) {
        console.error('Welcome role not found.');
        return;
    }

    try {
        await member.roles.add(role);
    } catch (error) {
        console.error('Failed to assign welcome role:', error);
    }

    await channel.send({
        content: `Hey <@${member.id}>!`,
        embeds: [embed],
    });
});

client.once('ready', () => {
    console.log('The bot is online!');
    console.log(
        'Connected guilds:',
        client.guilds.cache.map(g => `${g.name} (${g.id})`)
    );

    initializeRSS(client);
});

client.login(process.env.TOKEN);
