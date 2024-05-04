import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder().setName('ping').setDescription('check bot is online or not');
export async function execute(interaction) {
    await interaction.reply('hey there! im alive.');
}