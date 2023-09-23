// this code was some old code i copied from the discord.js docs on an older project with some changes 😭

const fs = require("fs");
const path = require("path");
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
 });

client.commands = new Collection();
client.cooldowns = new Collection();

const cmdPath = path.join(process.cwd(), "commands");

const cmdFiles = fs.readdirSync(cmdPath).filter(file => path.extname(file) === ".js");

for (const file of cmdFiles) {
	const filePath = path.join(cmdPath, file);
	const command = require(filePath);
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.once(Events.ClientReady, c => {
	client.application.commands.set([]);
	console.log(`Successfully logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async msg => {
	if (!msg.isChatInputCommand()) return;
	const cmd = msg.client.commands.get(msg.commandName);

	if (!cmd) throw new Error(`Command ${msg.commandName} not found.`);

	try {
		await cmd.execute(msg);
	} catch(err) {
		console.error(err);
	}

});

client.login(token);