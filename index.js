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

const WELCOME_CHANNEL_ID = '1221014228832616500';

client.on(Events.GuildMemberAdd, async (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);

    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome to MAGE')
        .setDescription(
            `Ara ara konnichiwa <@${member.id}> 🤍, welcome to Mage Coven\n` +
            `🕯️📖 Read the <#1221045106690490469> · checkout <#1221014228832616501> · ` +
            `Taizai to nanishinde 😚`
        )
        .setImage('https://media.discordapp.net/attachments/1118538019687895192/1118550762168000582/anime-banner-gif-file-1880kb-anpk2r6p128lqcbk.gif?ex=6a8517d3&is=6a83c653&hm=5bc4d530fee123d734bf8ff72625ab208d9ae176e1ff4c8fbe1e3003756a5792&');

    await channel.send({
        content: `Hey <@${member.id}>!`,
        embeds: [welcomeEmbed],
    });
});

client.on('ready', () => {
    console.log('The bot is online!');

    // client.user.setActivity({
    //     name: 'Cigarettes After Sex',
    //     type: ActivityType.Listening,
    // });
});

client.login(process.env.TOKEN);
