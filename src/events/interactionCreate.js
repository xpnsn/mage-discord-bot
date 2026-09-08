'use strict';

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (command?.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error('Autocomplete error:', error);
                }
            }

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);

            const payload = { content: 'There was an error while executing this command!', ephemeral: true };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    },
};
