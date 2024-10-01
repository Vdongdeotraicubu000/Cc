const fs = require('fs');

module.exports = {
    name: "module",
    usedby: 2,
    info: "Install, uninstall, or share command modules",
    dmUser: false,
    onPrefix: true,
    dev: "Jonell Magallanes",
    cooldowns: 5,

    onLaunch: async function ({ api, event, target }) {
        const threadID = event.threadID;
        const commandName = target[1];
        const commandCode = target.slice(2).join(' ');

        if (target[0] === "install" && commandName) {
            const confirmationMessage = `⚠️ 𝗖𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝗠𝗼𝗱𝘂𝗹𝗲 𝗜𝗻𝘀𝘁𝗮𝗹𝗹\n${global.line}\nDo you want to install the command "${commandName}" with the following code?\n\`\`\`\n${commandCode}\n\`\`\`\nReact this message (👍) to Install this Module or (👎) to abort the Install`;
            const sentMessage = await api.sendMessage(confirmationMessage, threadID);

            global.client.callReact.push({
                name: this.name,
                messageID: sentMessage.messageID,
                commandName: commandName,
                action: 'install',
                commandCode: commandCode
            });
        } else if (target[0] === "uninstall" && commandName) {
            const filePath = `./cmds/${commandName}.js`;
            const uninstallPath = `./cmds/uninstall/${commandName}.js`;

            if (fs.existsSync(filePath)) {
                const confirmationMessage = `⚠️ 𝗖𝗼𝗻𝗳𝗶𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝗠𝗼𝗱𝘂𝗹𝗲 𝗨𝗻𝗶𝗻𝘀𝘁𝗮𝗹𝗹 \n${global.line}\nDo you want to uninstall the command ${commandName}? React this message (👍) to Uninstall this Module or (👎) to abort the uninstall`;
                const sentMessage = await api.sendMessage(confirmationMessage, threadID);

                global.client.callReact.push({
                    name: this.name,
                    messageID: sentMessage.messageID,
                    commandName: commandName,
                    action: 'uninstall'
                });
            }
        } else if (target[0] === "share" && commandName) {
            const filePath = `./cmds/${commandName}.js`;
            if (fs.existsSync(filePath)) {
                const commandCode = fs.readFileSync(filePath, 'utf-8');
                const sharehs = await api.sendMessage("Extract Code.....", event.threadID, event.messageID);
                await api.editMessage(`${commandName}.js\n\n${commandCode}`, sharehs.messageID, threadID, event.messageID);
            } else {
                await api.sendMessage(`❌ Command ${commandName} does not exist.`, threadID);
            }
        } else {
            await api.sendMessage("Usage: -module [install|uninstall|share] [command name] [command code]", threadID);
        }
    },

    callReact: async function ({ reaction, event, api }) {
        const { threadID, messageID } = event;
        const reactData = global.client.callReact.find(item => item.messageID === messageID);

        if (!reactData) return;

        const { commandName, action, commandCode, messageID: sentMessageID } = reactData;

        await api.unsendMessage(sentMessageID);

        if (reaction === '👍') {
            if (action === 'install') {
                const check = await api.sendMessage(`🔍 𝗖𝗵𝗲𝗰𝗸𝗶𝗻𝗴 𝘁𝗵𝗲 𝗰𝗼𝗱𝗲...`, threadID);
                await new Promise(resolve => setTimeout(resolve, 10000));
                await api.editMessage(`🚀 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗶𝗻𝗴...`, check.messageID, threadID);
                await new Promise(resolve => setTimeout(resolve, 5000));

                try {
                    new Function(commandCode);
                    const filePath = `./cmds/${commandName}.js`;
                    fs.writeFileSync(filePath, commandCode);
                    await api.editMessage(`✅ 𝗠𝗼𝗱𝘂𝗹𝗲 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗲𝗱\n${global.line}\n${commandName} has been successfully installed.`, check.messageID, threadID);
                } catch (error) {
                    await api.editMessage(`❌ 𝗠𝗼𝗱𝘂𝗹𝗲 𝗙𝗮𝗶𝗹𝗲𝗱 𝘁𝗼 𝗜𝗻𝘀𝘁𝗮𝗹𝗹\n${global.line}\nError: ${error.message}`, check.messageID, threadID);
                } finally {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    process.exit(1);
                }
            } else if (action === 'uninstall') {
                const filePath = `./cmds/${commandName}.js`;
                const uninstallPath = `./cmds/uninstall/${commandName}.js`;

                if (fs.existsSync(filePath)) {
                    fs.renameSync(filePath, uninstallPath);
                    await api.sendMessage(`✅ 𝗠𝗼𝗱𝘂𝗹𝗲 𝗨𝗻𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗲𝗱\n${global.line}\n${commandName} has been successfully uninstalled.`, threadID);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    process.exit(1);
                }
            }
        } else if (reaction === '👎') {
            await api.sendMessage(`❌ 𝗠𝗼𝗱𝘂𝗹𝗲𝘀 𝗖𝗮𝗻𝗰𝗲𝗹𝗹𝗲𝗱\n${global.line}\nConfirmation for module ${commandName} has been canceled.`, threadID);
        }
    }
};
