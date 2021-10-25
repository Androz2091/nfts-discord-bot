const fetch = require('node-fetch');

const Discord = require('discord.js');
const client = new Discord.Client({
    intents: [Discord.Intents.FLAGS.GUILDS]
});

const Database = require('easy-json-database');
const db = new Database();

const listingChannelId = "902121728254308482";
const salesChannelId = "902121713012211712";

const getHistorySolanart = (collection) => {
    return new Promise((resolve) => {
        fetch(`https://qzlsklfacc.medianetwork.cloud/all_sold_per_collection_day?collection=${collection}`).then((res) => {
            res.json().then((data) => {
                resolve(data);
            }).catch(() => resolve([]));
        }).catch(() => resolve([]));
    });
};

const getListingSolanart = (collection) => {
    return new Promise((resolve) => {
        fetch(`https://qzlsklfacc.medianetwork.cloud/nft_for_sale?collection=${collection}`).then((res) => {
            res.json().then((data) => {
                resolve(data);
            }).catch(() => resolve([]));
        }).catch(() => resolve([]));
    });
};

const getListingMagicEden = (collection) => {
    return new Promise((resolve) => {
        const query = decodeURI(escape(JSON.stringify({
            $match: {
                collectionSymbol: collection
            },
            $sort:  {
                createdAt: -1
            },
            $skip: 0,
            $limit: 20
        })));
        fetch(`https://api-mainnet.magiceden.io/rpc/getListedNFTsByQuery?q=${query}`).then((res) => {
            res.json().then((data) => {
                resolve(data.results);
            }).catch(() => resolve([]));
        }).catch(() => resolve([]));
    });
};

const fetchMagicEdenNFT = (mint) => {
    return new Promise((resolve) => {
        fetch(`https://api-mainnet.magiceden.io/rpc/getNFTByMintAddress/${mint}`).then((res) => {
            res.json().then((data) => {
                resolve(data.results);
            }).catch(() => resolve([]));
        }).catch(() => resolve([]));
    });
}

const getHistoryMagicEden = (collection) => {
    return new Promise((resolve) => {
        const query = decodeURI(escape(JSON.stringify({
            $match: {
                collection_symbol: collection
            },
            $sort:  {
                blockTime: -1
            },
            $skip: 0
        })));
        fetch(`https://api-mainnet.magiceden.io/rpc/getGlobalActivitiesByQuery?q=${query}`).then((res) => {
            res.json().then((data) => {
                resolve(data.results);
            }).catch(() => resolve([]));
        });
    });
}

const synchronizeSolanart = () => {
    [
        'thetower'
    ].forEach((collection) => {
        const latestSale = db.get(`last_sales_solanart_${collection}`);
        const latestListing = db.get(`last_listings_solanart_${collection}`);

        getListingSolanart(collection).then((listings) => {

            const sortedListings = listings
                .sort((a, b) => b.id - a.id);
            
            if (!sortedListings.length) return;
            
            const newListings = sortedListings
                .filter((e, i) => i < sortedListings.findIndex((l) => l.id === latestListing));

            db.set(`last_listings_solanart_${collection}`, sortedListings[0].id);

            (latestListing ? newListings.reverse() : [sortedListings[0]]).forEach((event) => {

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${event.name} has been listed!`)
                    .setURL(`https://explorer.solana.com/address/${event.token_add}`)
                    .addField('Price', `**${event.price} SOL**`)
                    .setImage(event.link_img)
                    .setColor('DARK_AQUA')
                    .setFooter('Solanart');

                client.channels.cache.get(listingChannelId).send({
                    embeds: [embed]
                });

            });

        });
        
        getHistorySolanart(collection).then((events) => {

            const sortedEvents = events
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            if (!sortedEvents.length) return;
            
            const newEvents = sortedEvents
                .filter((e) => new Date(e.date).getTime() > latestSale || !latestSale);

            db.set(`last_sales_solanart_${collection}`, new Date(sortedEvents[0].date).getTime());

            (latestSale ? newEvents.reverse() : [sortedEvents[0]]).forEach((event) => {

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${event.name} has been sold out!`)
                    .setURL(`https://explorer.solana.com/address/${event.token_add}`)
                    .addField('Price', `**${event.price} SOL**`)
                    .addField('Buyer', event.buyerAdd)
                    .addField('Seller', event.seller_address)
                    .setImage(event.link_img)
                    .setColor('DARK_AQUA')
                    .setFooter('Solanart');

                client.channels.cache.get(salesChannelId).send({
                    embeds: [embed]
                });

            });

        });

    });
};

const synchronizeMagicEden = () => {
    [
        'solana_monkette_busines'
    ].forEach((collection) => {
        const latestSale = db.get(`last_sales_magiceden_${collection}`);
        const latestListing = db.get(`last_listings_magiceden_${collection}`);

        getListingMagicEden(collection).then((listings) => {

            const sortedListings = listings
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            if (!sortedListings.length) return;
            
            const newListings = sortedListings
                .filter((e) => new Date(e.createdAt).getTime() > latestListing || !latestListing);

            if (new Date(sortedListings[0].createdAt).getTime() > latestListing || !latestListing) {
                db.set(`last_listings_magiceden_${collection}`, new Date(sortedListings[0].createdAt).getTime());
            }

            (latestListing ? newListings.reverse() : [sortedListings[0]]).forEach((event) => {

              console.log(JSON.stringify(event))

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${event.title} has been listed!`)
                    .setURL(`https://explorer.solana.com/address/${event.mintAddress}`)
                    .addField('Price', `**${event.price} SOL**`)
                    .setImage(event.img)
                    .setColor('DARK_AQUA')
                    .setFooter('Magic Eden');

                client.channels.cache.get(listingChannelId).send({
                    embeds: [embed]
                });

            });

        });
        
        getHistoryMagicEden(collection).then((events) => {

            const sortedEvents = events
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            if (!sortedEvents.length) return;
            
            const newEvents = sortedEvents
                .filter((e) => new Date(e.createdAt).getTime() > latestSale || !latestSale);

            if (new Date(sortedEvents[0].createdAt).getTime() > latestSale || !latestSale) {
                db.set(`last_sales_magiceden_${collection}`, new Date(sortedEvents[0].createdAt).getTime());
            }

            (latestSale ? newEvents.reverse() : [sortedEvents[0]]).forEach(async (event) => {

                if (!event.parsedTransaction) return;

                const nft = await fetchMagicEdenNFT(event.parsedTransaction.mint);

                const embed = new Discord.MessageEmbed()
                    .setTitle(`${nft.title} has been sold out!`)
                    .setURL(`https://explorer.solana.com/tx/${event.transaction_id}`)
                    .addField('Price', `**${(event.parsedTransaction.total_amount / 10E8).toFixed(2)} SOL**`)
                    .addField('Buyer', event.parsedTransaction.buyer_address)
                    .addField('Seller', event.seller_address)
                    .setImage(nft.img)
                    .setColor('DARK_AQUA')
                    .setFooter('Magic Eden');

                client.channels.cache.get(salesChannelId).send({
                    embeds: [embed]
                });

            });

        });

    });
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // do not wait the 10s and start syncing right now
    synchronizeSolanart();
    synchronizeMagicEden();
    setInterval(() => synchronizeSolanart(), 10_000);
    setInterval(() => synchronizeMagicEden(), 10_000);
});


client.login(process.env.BOT_TOKEN);
