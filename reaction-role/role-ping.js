const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents : [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
    ],
});

const roles = [
    {
        id: '1122209202983669970',
        emojiID: '<:number1:1130493521825116161>',
    },
    {
        id: '1122209059924353126',
        emojiID: '1130493475083780188',
    },
    {
        id: '1130693593619759164',
        emojiID: '1130493392493744169',
    },
    {
        id: '1130693554759536681',
        emojiID: '1130493349430837289',
    },
]

const selfrole_pings = new EmbedBuilder()
    .setTitle('Ping roles')
    .setDescription('𓂃﹒ · <@&1122209202983669970>\n \n𓂃﹒ · <@&1122209059924353126>\n \n𓂃﹒ · <@&1130693593619759164>\n \n𓂃﹒ · <@&1130693554759536681>')
    .setImage('https://cdn.discordapp.com/attachments/1130439612184141844/1130697258938138684/Comp_1_00000.png')
    .setColor('#2b2d31');

client.on('ready', async(c)=>{
    try {
        const channel = await client.channels.cache.get('1130439612184141844');
        if(!channel) return;

        const row = new ActionRowBuilder();

        roles.forEach(role => {
            row.components.push(
                new ButtonBuilder().setCustomId(role.id).setEmoji(role.emojiID).setStyle(ButtonStyle.Secondary)
            )
        });
        
        await channel.send({
            embeds: [selfrole_pings],
            components: [row],
        });
        process.exit();

    } catch (error) {
        console.log(error)
    }
})

client.login('MTEzMDA5MDk0NTU4MTQzMjg3Mw.Gyg-OW.xKkaiFWbY76XP69ftpeAA_Y9ZsvQy0Otr246M4');