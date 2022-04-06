const { config } = require('dotenv');
config();

const WebSocketClient = require('websocket').client;
const wsClient = new WebSocketClient();

const Discord = require('discord.js');
const client = new Discord.Client({
	intents: [Discord.Intents.FLAGS.GUILDS]
});

wsClient.on('connect', function(connection) {
    console.log(`Connected to scour.so!`);

	const sendMessage = (data) => connection.send(JSON.stringify(data));

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
			const data = JSON.parse(message.utf8Data);
			const eventData = data?.payload?.data?.event?.at(0);
			if (eventData) {
				
				const embed = new Discord.MessageEmbed()
					.setAuthor(`${eventData.asset.name} has been sold`)
					.addField('Collection', eventData.collection.name)
					.addField('NFT Name', eventData.asset.name)
					.addField('Sold Price', eventData.price_amount + ' SOL')
					.addField('Collection Floor Price', eventData.floor + ' SOL')
					.setColor('AQUA');

				client.channels.cache.get(process.env.SALES_NOTIFICATION_CHANNEL_ID).send({
					embeds: [embed]
				});
			}
        }
    });

	sendMessage({
		type: "connection_init",
		payload: {
			headers: {}
		}
	});
    connection.send(JSON.stringify({
		id: "1",
		type: "start",
		payload: {
			variables: {
				where: {
					_or: [
						{ type: { _eq : "SALE" } }
					],
					collection_id: process.env.COLLECTION_ID ? { _eq: process.env.COLLECTION_ID } : undefined
				}
			},
			extensions: {},
			operationName: "OnEventAdded",
			query: "subscription OnEventAdded($where: event_bool_exp = {}) {\n  event(limit: 25, order_by: {datetime: desc}, where: $where) {\n    id\n    type\n    signature\n    datetime\n    price_amount\n    previous_price_amount\n    owner\n    previous_owner\n    platform\n    floor\n    asset {\n      name\n      token_mint_address\n      image_original_url\n      __typename\n    }\n    collection {\n      id\n      name\n      slug\n      __typename\n    }\n    __typename\n  }\n}\n"
		}
	}));
});

wsClient.connect('wss://graphql.scour.so/v1/graphql');
client.login(process.env.DISCORD_BOT_TOKEN);
