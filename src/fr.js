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
        sharkdb.getUser(message.author.id, user => {
            if(user.frDisabled) return
            if(user.banned) return
            message.channel.send(fr.response);
            sharkdb.incrementFr(fr._id);
        })
    }
}
module.exports = {
    execute: function (message, args, util) {
       
    },
	registerEventHandlers: function (cb) {
        cb("messageCreate", onMessage);
    }
}