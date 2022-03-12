const { MessageEmbed } = require('discord.js');
const apis = require('../../../index').apis;
const sharkdb = apis["shark-db-db"].api;
const sperms = apis["shark-perms-manager"].api;
const frapi = apis["fr-api"].api; //unusual way of getting apis, but i need them for onMessage() too
let frCache
let errored = false
let ignoreUserList = []
let cooldown = Date.now()

function onMessage(message) {
	if (errored) return;
	if (message.author.bot) return;
	if (ignoreUserList.includes(message.author.id)) return;
	if (Date.now() - cooldown < 1000) return;
	if(!frCache) {
		sharkdb.getFrs(frs => {
			if(frs == "ERR") errored = true;
			frCache = frs;
			return onMessage(message);
		})
	} else {
		let fr = frCache.find(fr => fr.trigger == message.content)
		if(!fr) return
		if(fr.creator != message.author.id && !fr.global) return
		if(fr.global && fr.forcedUnglobal && fr.creator != message.author.id) return
		sharkdb.foc(message.author.id, user => {
			if(!user) return
			if(user.frDisabled) return
			if(user.banned) return
			message.channel.send(fr.response);
			sharkdb.incrementFr(fr._id);
		})
	}
}
module.exports = {
	execute: function (message, args, util) {
		sharkdb.foc(message.author.id, user => {
			if(user.fr.banned) return message.channel.send("you have been banned from frs you fart");
			switch(args[0]) {
				case "list":
					sharkdb.frCol().find({creator: message.author.id}, (err, frs) => {
						if (err) {
							apis["core-error"].api.error(err);
							return message.channel.send("it broke lol");
						}
						if(frs.length < 1) return message.channel.send("you have no frs");
						let embed = new MessageEmbed()
						.setTitle("Frs")
						.setDescription(frs.map(fr => `${fr.trigger} - used ${fr.timesTriggered} times`).join("\n"))
						message.channel.send({embeds: [embed]});
					})
					break;
				case "add":
					ignoreUserList.push(message.author.id);
					message.channel.send("fr setup: part 1\n**type the words that will trigger thsi fr**\ntype cancel to cancel");
					let addfilter = m => m.author.id == message.author.id;
					let addcollector = message.channel.createMessageCollector({ filter: addfilter, time: 20000 });
					addcollector.on('collect', function (m) {
						if (m.content.toLowerCase() == "cancel") {
							message.channel.send("cancelled");
							ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
							return this.stop()
						}
						this.stop("response")
						let trigger = m.content;
						message.channel.send("fr setup: part 2\n**type what should be said when fr is triggered**\n(u can also attach a file)\ntype cancel to cancel");
						let filter = m => m.author.id == message.author.id;
						let collector = message.channel.createMessageCollector({ filter: filter, time: 20000 });
						collector.on('collect', function (m) {
							if (m.content.toLowerCase() == "cancel") {
								message.channel.send("cancelled");
								ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
								return this.stop()
							}
							this.stop("response")
							let content = m.content;
							if (m.attachments.size > 0) {
								m.attachments.forEach(a => content += `\n${a.url}`)
							}
							sharkdb.addFr(trigger, content, message.author.id, fr => {
								ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
								if(fr == "ERR_BANNED") return message.channel.send("you have been banned from frs you fart (this message should never be seen, so congrats)");
								if(fr == "ERR_DBFAIL") return message.channel.send("something went wrong, try again later");
								message.channel.send(`created fr successfully!\ntrigger words: ${trigger}\nmessage: ${content}`);
								frCache.push(fr);
								
							})
						});
						collector.on('end', (collected, reason) => {
							if(reason == "time") {
								ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
								message.channel.send("i sent you my paws please respond")
							}
						});
					});
					addcollector.on('end', (collected, reason) => {
						if(reason == "time") {
							ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
							message.channel.send("i sent you my paws please respond")
						}
					});
					break;
				case "remove":
					ignoreUserList.push(message.author.id)
					message.channel.send("fr removing\n**type the trigger words for fr to be deleted**\ntype cancel to cancel");
					let removefilter = m => m.author.id == message.author.id;
					let removecollector = message.channel.createMessageCollector({ filter: removefilter, time: 20000 });
					removecollector.on('collect', function (m) {
						if (m.content.toLowerCase() == "cancel") {
							message.channel.send("cancelled");
							ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
							return this.stop()
						}
						this.stop("response")
						let trigger = m.content;
						let rfr = frCache.filter(fr => fr.trigger == trigger && fr.creator == message.author.id)
						if (rfr.length > 0) {
							rfr = rfr[0]
							sharkdb.deleteFr(rfr._id.toString(), err => {
								ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
								if (err) {
									apis["core-error"].api.error(err);
									return message.channel.send("something went wrong, try again later");
								}
								message.channel.send(`removed fr successfully!\ntrigger words: ${trigger}`);
								frCache = frCache.filter(fr => fr._id != rfr._id);
							})
						} else {
							message.channel.send("either that fr doesnt exist or you dont own it");
							ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
						}
					});
					removecollector.on('end', (collected, reason) => {
						if(reason == "time") {
							ignoreUserList.splice(ignoreUserList.indexOf(message.author.id), 1);
							message.channel.send("i sent you my paws please respond")
						}
					});
					break;
				case "shutup":
					break;
				case "global":
					sperms.permittedTo("frglobalmod", message.author.id, message.guild.id, (perm, user) => {
						if(!perm) return message.channel.send("you dont have that permission, missing frglobalmod");
						message.channel.send("todo: finish fr global")
					})
					break;
				case "ban":
					sperms.permittedTo("frmod", message.author.id, message.guild.id, (perm, user) => {
						if(!perm) return message.channel.send("you dont have that permission, missing frmod");
						message.channel.send("todo: finish fr ban")
					})
					break;
				default:
					message.channel.send("fr [list/add/remove/shutup (global/ban for frglobalmod and frmod)]");
					break;
			}
		})
	},
	registerEventHandlers: function (cb) {
		cb("messageCreate", onMessage);
	}
}