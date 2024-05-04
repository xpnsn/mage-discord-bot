import { SlashCommandBuilder } from 'discord.js';
import rulesEmbed from './../../src/embeds/rules';

export const data = new SlashCommandBuilder().setName('rules-embed').setDescription('Generate an embed for server rules');
export async function execute(interaction) {
    await interaction.channel.send({ embeds: rulesEmbed });
    await interaction.reply('Embed Generated!');
}
    