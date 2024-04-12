const {SlashCommandBuilder} = require('discord.js');
const rulesEmbed = require('./../../src/embeds/rules');

module.exports = {
    data : new SlashCommandBuilder().setName('rules-embed').setDescription('Generate an embed for server rules'),
    
    async execute(interaction) {
        await interaction.channel.send({ embeds: rulesEmbed});
        await interaction.reply('Embed Generated!');
    },
};
    