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

var db = new JsonDB(new Config('fugBotDB', true, false, '/'));

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

bot.command('merge', async (ctx) => {
	let username1DB;
	let username2DB;
	const text = ctx.message.text.slice(7);
	if (text.length < 0) {
		ctx.reply('sorry mate, wrong command usage try /merge username1 username2');
		return;
	}
	let [username1, username2] = text.split(' ');
	if (!username1 || !username2) {
		ctx.reply('sorry mate, wrong command usage try /merge username1 username2');
		return;
	}

	try {
		username1DB = db.getData(`/users/${username1}`);
	} catch {
		ctx.reply(`cant find user ${username1} in DB`);
		return;
	}

	try {
		username2DB = db.getData(`/users/${username2}`);
	} catch {
		ctx.reply(`cant find user ${username2} in DB`);
		return;
	}

	db.push(
		`/users/${username1}`,
		{
			fug: username1DB.fug + username2DB.fug,
			reasons: username1DB.reasons.concat(username2DB.reasons)
		},
		true
	);
	db.delete(`/users/${username2}`);
});

bot.command('give', async (ctx) => {
	let existingRecord;
	const text = ctx.message.text.slice(6);

	if (text.length < 0) {
		ctx.reply('sorry mate, wrong command usage try /give username 1(or -1) some reason');
		return;
	}

	let [username, number, ...reason] = text.split(' ');

	if (!username || (!number && parseInt(number))) {
		ctx.reply('sorry mate, wrong command usage try /give username 1(or -1) some reason');
		return;
	}
	reason = reason.join(' ') + ' ' + number;

	username = searchByNickname(username) || username;

	try {
		existingRecord = db.getData(`/users/${username}`);
	} catch {}

	db.push(
		`/users/${username}`,
		{
			fug: parseInt(number) + parseInt(existingRecord ? existingRecord.fug : 0),
			reasons: existingRecord ? (existingRecord.reasons ? [...existingRecord.reasons, reason] : [reason]) : [reason]
		},
		true
	);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
