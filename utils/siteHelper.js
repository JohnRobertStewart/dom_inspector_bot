const { EmbedBuilder } = require('discord.js');
const { request } = require('undici');
const { FUZZY_MATCH_URL, SITE_URL, BASE_URL } = require('./utils');
const { siteAliases } = require('./siteAliases');
const { similarMatches } =require('./similarMatches');
const sqlite3 = require('sqlite3').verbose();

async function getSite( siteName, siteMessage ){
    //Grabbing useful parts of the message
    const server = siteMessage.guild.name;
    const serverId = siteMessage.guildId;
    const channelName = siteMessage.channel.name;
    const channelId = siteMessage.channelId;
    const user = siteMessage.author.tag;
    const userId = siteMessage.author.id;
    const text = siteMessage.content;
    const unixTimestamp = siteMessage.createdTimestamp;
    
    if (siteName in siteAliases){ siteName = siteAliases[siteName] };
    var site;
    var similarMatchesString;
    if  (/^\d+$/.test(siteName)){
        const { body, statusCode } = await request(BASE_URL + SITE_URL + '/' + encodeURIComponent(siteName));
        if (statusCode === 404){
            const errorEmbed = new EmbedBuilder()
            .setTitle("Nothing found. Better luck next time!")
            .setImage('https://cdn.pixabay.com/photo/2017/03/09/12/31/error-2129569_960_720.jpg');
            return errorEmbed;
        }
        site  = await body.json();
    }

    else {
        const { body } = await request(BASE_URL + SITE_URL + FUZZY_MATCH_URL + encodeURIComponent(siteName));
        var { sites } = await body.json();
        site = sites[0];
        similarMatchesString = similarMatches(sites);
    }; 


    // Initialize sql
    let sql;
    // Connects to DB
    const db = new sqlite3.Database("./logs.db", sqlite3.OPEN_READWRITE);

    sql = `SELECT note FROM mentor_notes WHERE class = ? AND class_id = ? AND guild_id = ?`;
    const row = await new Promise((resolve, reject) => {
        db.get(sql, ["site", site.id, serverId], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });

    // Destructuring the note property from the row object
    const { note: mentorNote } = row || {};

    console.log("mentorNote: " + mentorNote);

    // Construct the siteEmbed after obtaining the mentorNote value
    const siteEmbed = new EmbedBuilder()
        .setImage(BASE_URL + site.screenshot);

    if (similarMatchesString) {
        siteEmbed.setFooter({ text: similarMatchesString });
    }
    const channelWhiteList = [996378750474256385, 1175513268320735322, 1176173846118805554,1007203153252454401];
    // For prod version, swap channelId for guildId, so mentor notes for one guild are only visible for that guild
    if (channelWhiteList.every((item)=>{ return item !== channelId })) {
        siteEmbed.setTitle(`ID: ${site.id}`);
        if(mentorNote !== undefined){
            siteEmbed.setDescription(`Mentor Note: ${mentorNote}`);
        }
    }
    return siteEmbed;
}

module.exports = { getSite }