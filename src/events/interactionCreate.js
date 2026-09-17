'use strict';

const buttonPanels = require('../config/buttonPanels');
const embedStore = require('../embeds/embedStore');

async function handleButtonClick(interaction) {
    const [prefix, panelName, key] = interaction.customId.split(':');
    if (prefix !== 'bp') return; // not one of ours

    const panel = buttonPanels.getPanel(interaction.guild.id, panelName);
    const button = panel?.buttons.find(b => b.key === key);

    if (!panel || !button) {
        await interaction.reply({ content: 'This button is no longer configured.', ephemeral: true }).catch(() => {});
        return;
    }

    const fields = embedStore.getEmbed(interaction.guild.id, button.embedName);

    if (!fields) {
        await interaction.reply({ content: 'The embed for this button could not be found.', ephemeral: true }).catch(() => {});
        return;
    }

    const embed = embedStore.buildEmbed(fields, {
        userMention: `<@${interaction.user.id}>`,
        username: interaction.user.username,
        serverName: interaction.guild.name,
        memberCount: interaction.guild.memberCount,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true }).catch(error => {
        console.error('Failed to reply to button click:', error);
    });
}

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        if (interaction.isButton()) {
            await handleButtonClick(interaction);
            return;
        }

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
