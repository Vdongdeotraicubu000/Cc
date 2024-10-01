const fs = require('fs');
const moment = require("moment-timezone");

module.exports = {
    name: "acp",
    usedby: 2,
    info: "Fetches friend requests and provides options to accept or delete them",
    dev: "Jonell Magallanes",
    usages: "acpt",
    onPrefix: true,
    cooldowns: 6,

    onReply: async function ({ reply, api, event }) {
        const { threadID, body } = event;
        const savedRequests = JSON.parse(fs.readFileSync('./database/friend_requests.json'));

        // Parsing the user reply (e.g., "add 1" or "delete 1")
        const [action, number] = body.trim().split(" ");
        const index = parseInt(number) - 1;

        if (isNaN(index) || index < 0 || index >= savedRequests.length) {
            return api.sendMessage("Invalid number provided. Please try again.", threadID);
        }

        const userID = savedRequests[index].node.id;
        const userName = savedRequests[index].node.name;

        // Check if the action is 'add' (accept) or 'delete'
        if (action === "add" || action === "accept") {
            const acceptForm = {
                av: api.getCurrentUserID(),
                fb_api_req_friendly_name: "FriendingCometAcceptFriendRequestMutation",
                fb_api_caller_class: "RelayModern",
                doc_id: "2974485239401113",
                variables: JSON.stringify({
                    input: {
                        source: "friend_requests_page",
                        actor_id: api.getCurrentUserID(),
                        client_mutation_id: Math.random().toString(36).substr(2, 9),
                        friend_requestee_id: userID
                    }
                })
            };

            try {
                await api.httpPost("https://www.facebook.com/api/graphql/", acceptForm);
                api.sendMessage(`Friend request from ${userName} accepted!`, threadID);
            } catch (error) {
                api.sendMessage(`Failed to accept the friend request from ${userName}.`, threadID);
            }

        } else if (action === "delete") {
            const deleteForm = {
                av: api.getCurrentUserID(),
                fb_api_req_friendly_name: "FriendingCometDeleteFriendRequestMutation",
                fb_api_caller_class: "RelayModern",
                doc_id: "2490291331043647",
                variables: JSON.stringify({
                    input: {
                        source: "friend_requests_page",
                        actor_id: api.getCurrentUserID(),
                        client_mutation_id: Math.random().toString(36).substr(2, 9),
                        friend_requestee_id: userID
                    }
                })
            };

            try {
                await api.httpPost("https://www.facebook.com/api/graphql/", deleteForm);
                api.sendMessage(`Friend request from ${userName} deleted!`, threadID);
            } catch (error) {
                api.sendMessage(`Failed to delete the friend request from ${userName}.`, threadID);
            }
        } else {
            api.sendMessage("Invalid action. Use 'add' or 'delete'.", threadID);
        }

        // Remove the reply handler after processing
        global.client.onReply = global.client.onReply.filter(item => item.messageID !== reply.messageID);
    },

    // Fetch the friend requests and show them in a list
    onLaunch: async function ({ event, api }) {
        const form = {
            av: api.getCurrentUserID(),
            fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
            fb_api_caller_class: "RelayModern",
            doc_id: "4499164963466303",
            variables: JSON.stringify({ input: { scale: 3 } })
        };

        const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        const listRequest = JSON.parse(response).data.viewer.friending_possibilities.edges;

        // No friend request case
        if (listRequest.length === 0) {
            return api.sendMessage("🚫 𝗡𝗼 𝗙𝗿𝗶𝗲𝗻𝗱 𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝘀 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲\n" + global.line, event.threadID);
        }

        let msg = "𝗙𝗿𝗶𝗲𝗻𝗱 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗟𝗶𝘀𝘁\n" + global.line;
        let i = 0;
        for (const user of listRequest) {
            i++;
            msg += (`\n${i}. 𝐍𝐚𝐦𝐞: ${user.node.name}`
                + `\n𝐈𝐃: ${user.node.id}`
                + `\n𝐔𝐫𝐥: ${user.node.url.replace("www.facebook", "fb")}`
                + `\n𝐓𝐢𝐦𝐞: ${moment(user.time * 1000).tz("Asia/Manila").format("DD/MM/YYYY HH:mm:ss")}\n`);
        }

        fs.writeFileSync('./database/friend_requests.json', JSON.stringify(listRequest, null, 2));
        const sentMessage = await api.sendMessage(`${msg}\nReply with "add <number>" or "delete <number>" to take action`, event.threadID);

        global.client.onReply.push({
            name: this.name,
            messageID: sentMessage.messageID,
            author: event.senderID
        });
    }
};
