// require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const rest = new REST({version: '10'}).setToken('MTEzMDA5MDk0NTU4MTQzMjg3Mw.Gyg-OW.xKkaiFWbY76XP69ftpeAA_Y9ZsvQy0Otr246M4');

(async () => {
	try {
		console.log(`Registering slash commands...`);

		await rest.put(
			Routes.applicationCommands('1130090945581432873'),
			{ body: commands },
		);

		console.log(`Slash commands registered successfully!`);

	} catch (error) {
		console.error(error);
	}
})();