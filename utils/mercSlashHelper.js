const { EmbedBuilder } = require('discord.js');
const { request } = require('undici');
const { FUZZY_MATCH_URL, MERC_URL, BASE_URL } = require('./utils');
const { mercAliases } =require('./mercAliases');
const { similarMatches } =require('./similarMatches');
const sqlite3 = require('sqlite3').verbose();

async function getMerc( mercName, mercInteraction ){
    //Grabbing useful parts of the message
    const serverName = mercInteraction.guild.name;
    const serverId = mercInteraction.guild.id;
    const channelName = mercInteraction.channel.name;
    const channelId = mercInteraction.channel.id;
    const userName = mercInteraction.user.tag; 
    const userId = mercInteraction.user.id; 
    const command = mercInteraction.toString();
    const createdAt = mercInteraction.createdAt;
    const timestamp = mercInteraction.createdTimestamp;

    if (mercName in mercAliases){ mercName = mercAliases[mercName] };
    var merc;
    var similarMatchesString;
    if  (/^\d+$/.test(mercName)){
        const { body, statusCode } = await request(BASE_URL + MERC_URL + '/' + encodeURIComponent(mercName));
        if (statusCode === 404){
            const errorEmbed = new EmbedBuilder()
            .setTitle("Nothing found. Better luck next time!")
            .setImage('https://cdn.pixabay.com/photo/2017/03/09/12/31/error-2129569_960_720.jpg');
            return errorEmbed;
        }
        merc  = await body.json(); 
    }

    else {
        const { body } = await request(BASE_URL + MERC_URL + FUZZY_MATCH_URL + encodeURIComponent(mercName));
        var { mercs } = await body.json();
        merc = mercs[0];
        similarMatchesString = similarMatches(mercs);
    }; 
    //console.log(merc);

    // Initialize sql
    let sql;
    // Connects to DB
    const db = new sqlite3.Database("./logs.db", sqlite3.OPEN_READWRITE);

    sql = `SELECT note FROM mentor_notes WHERE class = ? AND class_id = ? AND guild_id = ?`;
    const row = await new Promise((resolve, reject) => {
        db.get(sql, ["merc", merc.id, serverId], (err, row) => {
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

    // Construct the mercEmbed after obtaining the mentorNote value
    const mercEmbed = new EmbedBuilder()
        .setImage(BASE_URL + merc.screenshot);

    if (similarMatchesString) {
        mercEmbed.setFooter({ text: similarMatchesString });
    }
    const channelWhiteList = [996378750474256385, 1175513268320735322, 1176173846118805554,1007203153252454401];
    // For prod version, swap channelId for guildId, so mentor notes for one guild are only visible for that guild
    if (channelWhiteList.every((item)=>{ return item !== channelId })) {
        mercEmbed.setTitle(`ID: ${merc.id}`);
        if(mentorNote !== undefined){
            mercEmbed.setDescription(`Mentor Note: ${mentorNote}`);
        }
    }


    // const mercEmbed = new EmbedBuilder()
    //     //.setTitle(merc.name)
    //     // .setDescription('Mentor notes will go here.')
    //     .setImage(BASE_URL + merc.screenshot)
    //     if ( similarMatchesString ) {mercEmbed.setFooter({text: similarMatches(mercs)})};
    const mercLeaderEmbed = new EmbedBuilder()
        .setImage(BASE_URL+'/units/'+ merc.commander_id+'/screenshot')
        .setDescription('Name of mercenary group leader: '+ merc.bossname)
    const mercTroopEmbed = new EmbedBuilder()
        .setImage(BASE_URL+'/units/'+ merc.unit_id+'/screenshot')
        .setDescription('Number of units: '+ merc.nrunits)
    return [mercEmbed, mercLeaderEmbed, mercTroopEmbed];
}

module.exports = { getMerc }