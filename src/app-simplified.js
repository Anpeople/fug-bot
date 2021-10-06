const { Telegraf } = require('telegraf');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const nicknames = require('../nicknames.json');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token) {
	console.log('no token provided');
	process.exit();
}

const bot = new Telegraf(token);

var db = new JsonDB(new Config('fugBotDBSimplified', true, false, '/'));

function searchByNickname(username) {
	const nicks = Object.keys(nicknames);
	for (let nick of nicks) {
		const filtered = nicknames[nick].filter((e) => e.toLowerCase() === username.toLowerCase());
		if (filtered.length !== 0) {
			return nick;
		}
	}
}

bot.telegram.sendMessage(chatId, 'hihi!');

bot.command('list', async (ctx) => {
	var niceString = '';
	try {
		var data = db.getData('/users');
	} catch {
		ctx.reply('no users yet in db');
		return;
	}

	const users = Object.keys(data);
	users.forEach((el) => {
		const reasonsFiltered = data[el].reasons.filter((r) => r != '');
		niceString += `${el} has ${data[el].fug} points with reasons:\n->${reasonsFiltered.join('\n->')}\n\n`;
	});
	ctx.telegram.sendMessage(chatId, niceString);
});

bot.on('message', (ctx) => {
	let existingRecord;
	const message = ctx.message;
	if (
		message.reply_to_message &&
		message.sticker &&
		message.sticker.emoji === '1️⃣' &&
		message.sticker.set_name === 'koskakokosha'
	) {
		let username = message.reply_to_message.from.username;
		const reason = message.reply_to_message.text;
		username = searchByNickname(username) || username;
		try {
			existingRecord = db.getData(`/users/${username}`);
		} catch {}

		db.push(
			`/users/${username}`,
			{
				fug: 1 + parseInt(existingRecord ? existingRecord.fug : 0),
				reasons: existingRecord ? (existingRecord.reasons ? [...existingRecord.reasons, reason] : [reason]) : [reason]
			},
			true
		);
	}
});

bot.command('list', async (ctx) => {
	ctx.message.telegram.reply(
		`use /list to list current data\n if you want to give someone fug point you shoud reply on his message with special sticker`
	);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
