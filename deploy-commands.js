require('dotenv').config();

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];

const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Registering slash commands...`);

        console.log('Commands being registered:');

        for (const command of commands) {
            console.log(`- /${command.name}`);
        }

        const guildCommands = await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands },
        );

        console.log('\nCommands registered on Discord:');

        for (const command of guildCommands) {
            console.log(`- /${command.name}`);
        }

        console.log('\nSlash commands registered successfully!');

    } catch (error) {
        console.error(error);
    }
})();
