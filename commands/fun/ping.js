const {SlashCommandBuilder} = require('discord.js');

module.exports = {
    data : new SlashCommandBuilder().setName('ping').setDescription('check bot is online or not'),
    
    async execute(interaction) {
        await interaction.reply('hey there! im alive.');
    },
};