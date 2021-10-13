const fetch = require('node-fetch');

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILDS]
});

const Database = require('easy-json-database');
const db = new Database();

const notificationChannelId = '839773978379378';

const getHistory = (collection) => {
    return new Promise((resolve) => {
        fetch(`https://qzlsklfacc.medianetwork.cloud/all_sold_per_collection_day?collection=${collection}`).then((res) => {
            res.json().then((data) => {
                resolve(data);
            });
        });
    });
};

const getListing = (collection) => {
    return new Promise((resolve) => {
        fetch(`https://qzlsklfacc.medianetwork.cloud/nft_for_sale?collection=${collection}`).then((res) => {
            res.json().then((data) => {
                resolve(data);
            });
        });
    });
};

const synchronize = () => {
    [
        'roguesharks'
    ].forEach((collection) => {
        const latestSale = db.get(`last_sales_${collection}`);
        const latestListing = db.get(`last_listings_${collection}`);

        getListing(collection).then((listings) => {

            const sortedListings = listings
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const newListings = sortedListings
                .filter((e) => new Date(e.date).getTime() > latestListing || !latestListing);

            if (newListings.length) db.set(`last_listings_${collection}`, new Date(newListings[0].date).getTime());

            (latestListing ? newListings : [sortedListings[0]]).forEach((event) => {

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${event.name} has been listed!`)
                    .setURL(`https://explorer.solana.com/address/${event.token_add}`)
                    .addField('Price', `**${event.price} SOL**`)
                    .setImage(event.link_img)
                    .setColor('DARK_AQUA');

                client.channels.cache.get(notificationChannelId).send({
                    embeds: [embed]
                });

            });

        });
        
        getHistory(collection).then((events) => {

            const sortedEvents = events
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const newEvents = sortedEvents
                .filter((e) => new Date(e.date).getTime() > latestSale || !latestSale);

            if (newEvents.length) db.set(`last_sales_${collection}`, new Date(newEvents[0].date).getTime());

            (latestSale ? newEvents : [sortedEvents[0]]).forEach((event) => {

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${event.name} has been sold out!`)
                    .setURL(`https://explorer.solana.com/address/${event.token_add}`)
                    .addField('Price', `**${event.price} SOL**`)
                    .addField('Buyer', event.buyerAdd)
                    .addField('Seller', event.seller_address)
                    .setImage(event.link_img)
                    .setColor('DARK_AQUA');

                client.channels.cache.get(notificationChannelId).send({
                    embeds: [embed]
                });

            });

        });

    });
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    synchronize();
    setInterval(() => synchronize(), 10_000);
});

client.login('ODk3NTM3MDM4MTE3NjM4MTg0.YWXGgQ.MLy3na_KyCGztk_T0imzEpN9LOU');
