const {SlashCommandBuilder} = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('reaction-role')
    .setDescription('Add role pair with emoji or text through this ID')
    .addRoleOption(option => option.setName('role').setDescription('Name of the role').required(true)),
    

    async execute(interaction) {
        await interaction.reply('its working')
    }
};