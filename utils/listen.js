const fs = require("fs");
const axios = require('axios');
const gradient = require('gradient-string');
const { bannedUsers, bannedThreads } = require('./ban');
const { handleUnsend } = require('./unsend');
const { handleLogSubscribe } = require('./logsub');
const { handleLogUnsubscribe } = require('./logunsub');
const { actions } = require('./actions');
const { logChatRecord, notifyAdmins } = require('./logs');

const threadsDB = JSON.parse(fs.readFileSync("./database/threads.json", "utf8") || "{}");
const usersDB = JSON.parse(fs.readFileSync("./database/users.json", "utf8") || "{}");
const cooldowns = {};
global.client = global.client || { callReact: [], onReply: [] };
global.bot = { usersDB, threadsDB };
global.line = "━━━━━━━━━━━━━━━━━━";

const adminConfigPath = "./admin.json";
let adminConfig = {};
global.cc = adminConfig;

try {
    adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, "utf8"));
} catch (err) {
    console.error(err);
}

const handleListenEvents = (api, commands, eventCommands, threadsDB, usersDB) => {
    api.setOptions({ listenEvents: true });

    api.listenMqtt(async (err, event) => {
        if (err) return console.error(gradient.passion(err));

        async function getUserName(api, senderID) {
            try {
                const userInfo = await api.getUserInfo(senderID);
                return userInfo[senderID]?.name || "User";
            } catch (error) {
                console.error(error);
                return "User";
            }
        }

        if (event.logMessageType === "log:subscribe") {
            await notifyAdmins(api, event.threadID, "Joined", event.senderID);
            handleLogSubscribe(api, event, adminConfig);
        }

        if (event.logMessageType === "log:unsubscribe") {
            await notifyAdmins(api, event.threadID, "Kicked", event.senderID);
            await handleLogUnsubscribe(api, event);
        }

        let msgData = {};
        try {
            msgData = JSON.parse(fs.readFileSync('./database/message.json'));
        } catch (err) {
            console.error(err);
        }

        const senderID = event.senderID;
        const threadID = event.threadID;
        const isGroup = threadID !== senderID;

        if (bannedThreads[threadID]) {
            return api.sendMessage(`𝗧𝗵𝗿𝗲𝗮𝗱 𝗕𝗮𝗻𝗻𝗲𝗱\n━━━━━━━━━━━━━━━━━━\nThis thread has been banned for some violation. Reason: ${bannedThreads[threadID].reason}.`, threadID, () => {
                api.removeUserFromGroup(api.getCurrentUserID(), threadID);
            });
        }

        if (event.type === "message") {
            const messageID = event.messageID;
            msgData[messageID] = { body: event.body, attachments: event.attachments || [] };
            try {
                fs.writeFileSync('./database/message.json', JSON.stringify(msgData, null, 2));
            } catch (err) {
                console.error(err);
            }
            await logChatRecord(api, event, usersDB);
        }

        if (event.type === "message_unsend" && adminConfig.resend === true) {
            await handleUnsend(api, event, msgData, getUserName);
        }

        const cmdActions = actions(api, event);

        if (event.type === 'message' || event.type === 'message_reply') {
            const message = event.body.trim();
            const isPrefixed = message.startsWith(adminConfig.prefix);
            const commandName = (isPrefixed ? message.slice(adminConfig.prefix.length).split(' ')[0] : message.split(' ')[0]).toLowerCase();
            const commandArgs = isPrefixed ? message.slice(adminConfig.prefix.length).split(' ').slice(1) : message.split(' ').slice(1);

            if (!usersDB[senderID]) {
                usersDB[senderID] = { lastMessage: Date.now() };
                fs.writeFileSync("./database/users.json", JSON.stringify(usersDB, null, 2));
                console.error(gradient.summer(`[ DATABASE ] NEW DETECT USER IN SENDER ID: ${senderID}`));
            }

            if (!threadsDB[threadID]) {
                threadsDB[threadID] = { lastMessage: Date.now() };
                fs.writeFileSync("./database/threads.json", JSON.stringify(threadsDB, null, 2));
                if (isGroup) {
                    console.error(gradient.summer(`[ DATABASE ] NEW DETECTED THREAD ID: ${threadID}`));
                }
            }

            if (isPrefixed && commandName === '') {
                const notFoundMessage = `The command is not found. Please type ${adminConfig.prefix}help to see all commands.`;
                return api.sendMessage(notFoundMessage, threadID);
            }

            const allCommands = Object.keys(commands).concat(Object.values(commands).flatMap(cmd => cmd.aliases || []));
            if (isPrefixed && commandName !== '' && !allCommands.includes(commandName)) {
                const notFoundMessage = `The command "${commandName}" is not found. Please type ${adminConfig.prefix}help to see all available commands.`;
                return api.sendMessage(notFoundMessage, threadID, (err, info) => {
                    if (!err) {
                        setTimeout(() => api.unsendMessage(info.messageID), 20000);
                    }
                });
            }

            const command = commands[commandName] || Object.values(commands).find(cmd => cmd.nickName && cmd.nickName.includes(commandName));

            if (command) {
                if (command.dmUser === false && !isGroup && !adminConfig.adminUIDs.includes(senderID) && !(adminConfig.moderatorUIDs && adminConfig.moderatorUIDs.includes(senderID))) {
                    return api.sendMessage(`This command cannot be used in DMs.`, threadID);
                }

                if (command.onPrefix && !isPrefixed) {
                    api.sendMessage(`This command requires a prefix: ${adminConfig.prefix}${command.name}`, event.threadID);
                    return;
                } else if (!command.onPrefix && isPrefixed) {
                    api.sendMessage(`This command does not require a prefix: ${command.name}`, event.threadID);
                    return;
                }

                if (bannedUsers[senderID]) {
                    const userName = await getUserName(api, senderID);
                    return api.sendMessage(`𝗨𝘀𝗲𝗿 𝗕𝗮𝗻𝗻𝗲𝗱 𝗦𝘆𝘀𝘁𝗲𝗺\n━━━━━━━━━━━━━━━━━━\nYou're banned from the system, ${userName}. Reason: ${bannedUsers[senderID].reason}.`, threadID);
                }

                if (!cooldowns[commandName]) cooldowns[commandName] = {};
                const now = Date.now();
                const timestamps = cooldowns[commandName];
                const cooldownAmount = (command.cooldowns || 20) * 1000;

                if (timestamps[senderID]) {
                    const expirationTime = timestamps[senderID] + cooldownAmount;

                    if (now < expirationTime) {
                        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                        api.sendMessage(`Please wait ${timeLeft} more second(s) before reusing the \`${command.name}\` command.`, event.threadID);
                        return;
                    }
                }

                if (command.usedby === 1 && !adminConfig.adminUIDs.includes(senderID)) {
                    api.sendMessage('This command is for Admin Group Chat Only', threadID);
                    return;
                } else if (command.usedby === 2 && (!adminConfig.moderatorUIDs || !adminConfig.moderatorUIDs.includes(senderID))) {
                    api.sendMessage('This command is for Bot Global Admin only.', threadID);
                    return;
                } else if (command.usedby === 3 && (!adminConfig.moderatorUIDs || !adminConfig.moderatorUIDs.includes(senderID))) {
                    api.sendMessage('This command is for Bot Moderators only.', threadID);
                    return;
                } else if (command.usedby === 4 && !(adminConfig.adminUIDs.includes(senderID) || (adminConfig.moderatorUIDs && adminConfig.moderatorUIDs.includes(senderID)))) {
                    api.sendMessage('This command is for Admin Bot Global and Bot Moderators only.', threadID);
                    return;
                }

                timestamps[senderID] = now;
                setTimeout(() => delete timestamps[senderID], cooldownAmount);

                try {
                    await command.onLaunch({ api, event, actions: cmdActions, target: commandArgs });
                } catch (error) {
                    console.error(gradient.passion(`Error executing command ${commandName}: ${error}`));
                    api.sendMessage("There was an error executing that command.", event.threadID);
                }

                Object.keys(commands).forEach(commandName => {
                    const targetFunc = commands[commandName]?.noPrefix;
                    if (typeof targetFunc === "function") {
                        try {
                            targetFunc({ api, event, actions: cmdActions, target: event.body });
                        } catch (error) {
                            console.error(gradient.passion(`Error executing noPrefix command ${commandName}: ${error}`));
                        }
                    }
                });

                for (const eventName in eventCommands) {
                    const eventCommand = eventCommands[eventName];
                    try {
                        await eventCommand.onEvents({ api, event, actions: {} });
                    } catch (error) {
                        console.error(gradient.passion(`Error executing event command ${eventName}: ${error}`));
                    }
                }
            }
        }

        if (event.type === "message_reply") {
            const repliedMessage = global.client.onReply.find(r => r.messageID === event.messageReply.messageID);

            if (repliedMessage) {
                const command = commands[repliedMessage.name];
                if (command && typeof command.onReply === "function") {
                    try {
                        await command.onReply({ reply: event.body, api, event, actions });
                    } catch (error) {
                        console.error(gradient.passion(`Error executing onReply for command ${repliedMessage.name}: ${error}`));
                    }
                }
            }
        }

        if (event.type === "message_reaction") {
            const reactedMessage = global.client.callReact.find(r => r.messageID === event.messageID);

            if (reactedMessage) {
                const command = commands[reactedMessage.name];
                if (command && typeof command.callReact === "function") {
                    try {
                        await command.callReact({ reaction: event.reaction, api, event, actions });
                    } catch (error) {
                        console.error(gradient.passion(`Error executing callReact for command ${reactedMessage.name}: ${error}`));
                    }
                }
            }
        }
    });
};

module.exports = { handleListenEvents };
