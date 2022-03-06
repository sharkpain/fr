const { MessageEmbed } = require('discord.js');
const apis = require('../../../index').apis;
const sharkdb = apis["shark-db-db"].api;
const sperms = apis["shark-perms-manager"].api;
const frapi = apis["fr-api"].api; //unusual way of getting apis, but i need them for onMessage() too
let frCache
let errored = false

function onMessage(message) {
	if (errored) return;
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
                    break;
                case "remove":
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