const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { quizCommand } = require('../../funtionality/quiz');

module.exports = {
    data: new SlashCommandBuilder().setName('quiz-question').setDescription('generates a quiz question'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({ content: 'You must be an administrator to use this command.', flags: MessageFlags.Ephemeral });
        }
        quizCommand(interaction);
        await interaction.reply('Question generated!');
    },
};
