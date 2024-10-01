const { spawn } = require("child_process");
const appstate = require('./logins/fb-chat-api/index.js');
const fs = require('fs');

// Read proxies from proxy.txt
const proxyList = fs.readFileSync("./utils/proxy.txt", "utf-8").split("\n").filter(Boolean); // Remove empty lines

// Function to select a random proxy from proxyList
function getRandomProxy() {
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    return proxyList[randomIndex];
}

const email = "639553722424"; 
const pass = "llanavenice"; 
const config = JSON.parse(fs.readFileSync("./logins/fca-unofficial/config.json", "utf8"));

// Add the randomly selected proxy to FCA_OPTIONS
config.FCA_OPTIONS = config.FCA_OPTIONS || {};
config.FCA_OPTIONS.proxy = getRandomProxy(); // Use the random proxy

function relogin() {
    console.log("Attempting to relogin with proxy:", config.FCA_OPTIONS.proxy);

    appstate({ email, password: pass }, config.FCA_OPTIONS, (err, api) => {
        if (err) {
            console.error('Login failed:', err.message);
            return;
        }

        try {
            const result = api.getAppState();
            const results = JSON.stringify(result, null, 2);
            const filename = 'appstate.json';

            fs.writeFileSync(filename, results);
            console.log('Your Appstate has been replaced and saved to appstate.json.');

            console.log("Executing node index.js...");

            const child = spawn("node", ["index.js"], {
                stdio: 'inherit', // Show all console logs from the child process
                shell: true
            });

            child.on("exit", (code) => {
                console.log(`index.js exited with code: ${code}`);
            });

        } catch (e) {
            console.error('Error processing result:', e.message);
        }
    });
}

relogin();
