const fs = require("fs");
const login = require("./logins/fca-unofficial/index.js");
const gradient = require("gradient-string");
const chalk = require("chalk");
const { exec } = require("child_process");
const { handleListenEvents } = require("./utils/listen");
const cron = require("node-cron");
const config = JSON.parse(fs.readFileSync("./logins/fca-unofficial/config.json", "utf8"));
const proxyList = fs.readFileSync("./utils/prox.txt", "utf-8").split("\n").filter(Boolean);

function getRandomProxy() {
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    return proxyList[randomIndex];
}

proxy = getRandomProxy();
const adminConfig = JSON.parse(fs.readFileSync("admin.json", "utf8"));
const prefix = adminConfig.prefix;
const threadsDB = JSON.parse(fs.readFileSync("./database/threads.json", "utf8") || "{}");
const usersDB = JSON.parse(fs.readFileSync("./database/users.json", "utf8") || "{}");
const boldText = (text) => chalk.bold(text);

const loadCommands = () => {
    const commands = {};
    global.cc = {
      admin: "admin.json",
      adminBot: adminConfig.adminUIDs,
      modBot: adminConfig.moderatorUIDs,
      prefix: adminConfig.prefix,
      developer: adminConfig.ownerName,
      botName: adminConfig.botName,
      ownerLink: adminConfig.facebookLink,
      resend: adminConfig.resend,
      proxy: proxy,
      module: {
        commands: {}
      },
      cooldowns: commands.cooldowns,
      getCurrentPrefix: () => global.cc.prefix,
    };
    fs.readdirSync("./cmds").sort().forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const command = require(`./cmds/${file}`);

                if (commands[command.name]) {
                    console.log(boldText(gradient.cristal(`[ ${command.name} ] This Command is Already Deployed Because it's the same name of command`)));
                    return;
                }

const requiredProps = ['name', 'usedby', 'info', 'usages', 'onPrefix', 'cooldowns'];
const missingProps = requiredProps.filter(prop => !command[prop]);

if (missingProps.length) {
    console.log(boldText(gradient.passion(`[ ${command.name || file} ] The command has missing properties: ${missingProps.join(", ")}. Please check it.`)));
    return;
}


                commands[command.name] = command;
                console.log(boldText(gradient.cristal(`[ ${command.name} ] Successfully Deployed Command`)));
            } catch (error) {
                if (error.code === "MODULE_NOT_FOUND") {
                    const missingModule = error.message.split("'")[1];
                    console.log(boldText(gradient.vice(`[ ${file} ] Missing module: ${missingModule}. Installing...`)));
                    exec(`npm install ${missingModule}`, (err) => {
                        if (!err) {
                            console.log(boldText(gradient.atlas(`Module ${missingModule} installed successfully.`)));
                            const command = require(`./cmds/${file}`);
                            commands[command.name] = command;
                            console.log(boldText(gradient.cristal(`[ ${command.name} ] Successfully Deployed Command`)));
                        }
                    });
                }
            }
        }
    });
    return commands;
};

const loadEventCommands = () => {
    const eventCommands = {};
    fs.readdirSync("./events").sort().forEach(file => {
        if (file.endsWith(".js")) {
            try {
                const eventCommand = require(`./events/${file}`);

                if (eventCommands[eventCommand.name]) {
                    console.log(boldText(gradient.cristal(`[ ${eventCommand.name} ] This Event Command is Already Deployed`)));
                    return;
                }

                eventCommands[eventCommand.name] = eventCommand;
                console.log(boldText(gradient.pastel(`[ ${eventCommand.name} ] Successfully Deployed Event Command`)));
            } catch (error) {
                if (error.code === "MODULE_NOT_FOUND") {
                    const missingModule = error.message.split("'")[1];
                    console.log(boldText(gradient.instagram(`[ ${file} ] Missing module: ${missingModule}. Installing...`)));
                    exec(`npm install ${missingModule}`, (err) => {
                        if (!err) {
                            console.log(boldText(gradient.atlas(`Module ${missingModule} installed successfully.`)));
                            const eventCommand = require(`./events/${file}`);
                            eventCommands[eventCommand.name] = eventCommand;
                            console.log(boldText(gradient.cristal(`[ ${eventCommand.name} ] Successfully Deployed Event Command`)));
                        }
                    });
                }
            }
        }
    });
    return eventCommands;
};

const reloadModules = () => {
    console.clear();
    console.log(boldText(gradient.retro("Reloading bot...")));
    const commands = loadCommands();
    const eventCommands = loadEventCommands();
    console.log(boldText(gradient.passion("[ BOT MODULES RELOADED ]")));
};

const startBot = () => {
    console.log(boldText(gradient.retro("Logging via AppState...")));

    login({ appState: JSON.parse(fs.readFileSync(config.APPSTATE_PATH, "utf8")) }, config.FCA_OPTIONS, (err, api) => {
        if (err) return console.error(boldText(gradient.passion(`Login error: ${JSON.stringify(err)}`)));
        console.log(boldText(gradient.retro("SUCCESSFULLY LOGGED IN VIA APPSTATE")));
        console.log(boldText(gradient.vice("━━━━━━━[ COMMANDS DEPLOYMENT ]━━━━━━━━━━━")));
        const commands = loadCommands();      console.log(boldText(gradient.morning("━━━━━━━[ EVENTS DEPLOYMENT ]━━━━━━━━━━━")));
        const eventCommands = loadEventCommands();
        console.log(boldText(gradient.cristal("█░█ ▄▀█ █▀█ █▀█ █░░ █▀▄\n█▀█ █▀█ █▀▄ █▄█ █▄▄ █▄▀")));
        console.log(boldText(gradient.vice(`╭─❍\nBOT NAME: ${adminConfig.botName}`)));
        console.log(boldText(gradient.vice(`PREFIX: ${adminConfig.prefix}`)));
        console.log(boldText(gradient.vice(`ADMINBOT: ${adminConfig.adminUIDs}`)));
        console.log(boldText(gradient.vice(`OWNER: ${adminConfig.ownerName}\n╰───────────⟡`)));

        if (fs.existsSync("./database/threadID.json")) {
            const data = JSON.parse(fs.readFileSync("./database/threadID.json", "utf8"));
            if (data.threadID) {
                api.sendMessage("✅ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆\n━━━━━━━━━━━━━━━━━━\nBot has been Fully Restarted!", data.threadID, (err) => {
                    if (err) {
                        console.error(boldText("Failed to send message:", err));
                    } else {
                        console.log(boldText("Restart message sent successfully."));
                        fs.unlinkSync("./database/threadID.json");
                        console.log(boldText("threadID.json has been deleted."));
                    }
                });
            }
        }
        if (fs.existsSync("./database/prefix/threadID.json")) {
            const data = JSON.parse(fs.readFileSync("./database/prefix/threadID.json", "utf8"));
            if (data.threadID) {
                api.sendMessage(`✅ 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗖𝗵𝗮𝗻𝗴𝗲𝗱 𝗣𝗿𝗲𝗳𝗶𝘅\n━━━━━━━━━━━━━━━━━━\nBot has changed system prefix into ${adminConfig.prefix}`, data.threadID, (err) => {
                    if (err) {
                        console.error(boldText("Failed to send message:", err));
                    } else {
                        console.log(boldText("Restart message sent successfully."));
                        fs.unlinkSync("./database/prefix/threadID.json");
                        console.log(boldText("threadID.json has been deleted."));
                    }
                });
            }
        }
        console.log(boldText(gradient.passion("━━━━[ READY INITIALIZING DATABASE ]━━━━━━━")));
                console.log(boldText(gradient.cristal(`╔════════════════════`)));
                console.log(boldText(gradient.cristal(`║ DATABASE SYSTEM STATS`)));
                console.log(boldText(gradient.cristal(`║ Threads: ${Object.keys(threadsDB).length}`)));
                console.log(boldText(gradient.cristal(`║ Users: ${Object.keys(usersDB).length} `)));
                console.log(boldText(gradient.cristal(`╚════════════════════`)));
            console.log(boldText(gradient.cristal("BOT Made By CC PROJECTS And Kaguya TEAMS")));
        console.log(boldText(gradient.cristal(`╔════════════════════`)));      console.log(boldText(gradient.cristal("║ DEVELOPERS")));     console.log(boldText(gradient.cristal("║ • JONELL MAGALLANES")));        console.log(boldText(gradient.cristal("║ • ARJHIL DUCAYANAN"))); 
        console.log(boldText(gradient.cristal("║ • JAY MAR")));       console.log(boldText(gradient.cristal("║ • JR BUSACO")));     console.log(boldText(gradient.cristal("║ => DEDICATED: CHATBOT COMMUNITY AND YOU")));      console.log(boldText(gradient.cristal(`╚════════════════════`)));
            console.error(boldText(gradient.summer("[ BOT IS LISTENING ]")));
        
        handleListenEvents(api, commands, eventCommands, threadsDB, usersDB, adminConfig, prefix);
    });
};

startBot();

if (adminConfig.restart) {
    const restartInterval = adminConfig.restartTime * 60 * 1000;

    setInterval(() => {
        reloadModules();
    }, restartInterval);
};
