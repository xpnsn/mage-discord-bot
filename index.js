require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {Client, IntentsBitField, Events, Collection, EmbedBuilder, ActivityType, PermissionsBitField} = require('discord.js');
const { type } = require('node:os');

const trigger = [
    ['ded','hello','<@1130090945581432873>',],
    ['shine bakayaro.', 'hey there', '<@887336793681330197> created me!']
]

const admin_cmds = [

]

const client = new Client({
    intents : [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
    ],
});

const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('Welcome to 𝐍𝐄𝐊𝐎 𝐂𝐇𝐀𝐍 𝐂𝐑𝐄𝐖')
    .setDescription(`Ara ara konnichiwa <user> , welcome to 𝐍𝐄𝐊𝐎 𝐂𝐇𝐀𝐍 𝐂𝐑𝐄𝐖 🐾🏳 ! Read the <#1004475415563341884>, checkout <#1004475458362032242>, Don't forget to take <#1004492356071989248>. Taizai o tanoshinde 🤗`)
    // .setThumbnail(/src/img/thumnail.png)
    .setThumbnail('https://cdn.discordapp.com/attachments/1118538019687895192/1118545461087850496/waifu-icon-uymnvo79qzfinbs8-c.png')
    .setImage('https://media.discordapp.net/attachments/1118538019687895192/1118550762168000582/anime-banner-gif-file-1880kb-anpk2r6p128lqcbk.gif');

const white_line = new EmbedBuilder().setImage('https://64.media.tumblr.com/8c44128b2c6c14707ca22771e039144c/aa6a51766468a8c2-81/s1280x1920/167e1986271c65490c525e8250c84c8b34d70c57.pnj').setColor('#2b2d31');
client.on('messageCreate', (msg)=>{

    // console.log(msg.content)
    
    if(msg.author.bot){
        return;
    }
    
    if(msg.content === '..welcome-embed') {
        if(msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            msg.channel.send({ embeds: [embed]});
        } else {
            msg.channel.send(`you're missing the permission to use that command.`);
        }
    } 

    if(msg.content === '..ping-selfrole') {
        if(msg.member.roles.cache.some(role => role.name === '+')) {
    
            msg.channel.send({ embeds: [selfrole_pings]});
        } else {
            msg.channel.send(`you're missing the permission to use that command.`);
        }
    } 


    for(let i=0 ; i<trigger[0].length ; i++) {
        if(msg.content.toLocaleLowerCase() === trigger[0][i]) {
            msg.channel.send(trigger[1][i])
        }
    }

});

//SLASH COMMANDS

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {

    const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
    
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
    
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.on(Events.InteractionCreate, async interaction =>{
    if(!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if(!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
		return;
    }

    try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
    }
});



client.on('ready',()=>{
    console.log('The bot is online!');

    client.user.setActivity({
        name: 'Cigarettes After Sex',
        type: ActivityType.Listening,
    });
});

client.login(process.env.TOKEN);
