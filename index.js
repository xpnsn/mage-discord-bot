require('dotenv').config();
const greetingEmbed = require('./src/embeds/welcome');
const rulesEmbed = require('./src/embeds/rules');


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

// console.log(greetingEmbed);
    
client.on('messageCreate', (msg)=>{

    
    if(msg.author.bot){
        return;
    }
    
    if(msg.content === '..welcome-embed') {
        if(msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            msg.channel.send({ embeds: [greetingEmbed]});
        } else {
            msg.channel.send(`you're missing the permission to use that command.`);
        }
    }
    if(msg.content === '..rules-embed') {
        if(msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            msg.channel.send({ embeds: [rulesEmbed]});
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

client.on('interactionCreate', async (interaction) =>{

    if(interaction.isButton()) {
        
        try {
    
        
            await interaction.deferReply({ephemeral: true});
        
            const role = interaction.guild.roles.cache.get(interaction.customId);
    
            // console.log(interaction.customId);
        
            if(!role) {
                // console.log(role)
                interaction.editReply({
                    content: "there was an error assigning role",
                })
                return;
            }
        
            const hasRole = interaction.member.roles.cache.has(role.id);
        
            if(hasRole) {
                await interaction.member.roles.remove(role);
                await interaction.editReply(`The role ${role} has been removed.`);
                return;
            }
    
            await interaction.member.roles.add(role);
            await interaction.editReply(`The role ${role} has been added.`);
            
        } catch (error) {
            console.log(error)
        }
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

    // client.user.setActivity({
    //     nam~e: 'Cigarettes After Sex',
    //     type: ActivityType.Listening,
    // });
});

client.login(process.env.TOKEN);
