import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('reaction-role')
    .setDescription('Add role pair with emoji or text through this ID')
    .addRoleOption(option => option.setName('role-1').setDescription('Select the role').setRequired(true))
    .addStringOption(option => option.setName('button-name-1').setDescription('Add name of the role displays on the button').setRequired(true))
    .addRoleOption(option => option.setName('role-2').setDescription('Select the role'))
    .addStringOption(option => option.setName('button-name-2').setDescription('Add name of the role displays on the button'));
export async function execute(interaction) {
    await interaction.reply('its working');
}