const { EmbedBuilder } = require('discord.js');
const { request } = require('undici');
const { FUZZY_MATCH_URL, MERC_URL, BASE_URL } = require('./utils');
const { mercAliases } =require('./mercAliases');
const { similarMatches } =require('./similarMatches');

async function getMerc( mercName ){
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
    console.log(merc);
    const mercEmbed = new EmbedBuilder()
        //.setTitle(merc.name)
        // .setDescription('Mentor notes will go here.')
        .setImage(BASE_URL + merc.screenshot)
        if ( similarMatchesString ) {mercEmbed.setFooter({text: similarMatches(mercs)})};
    const mercLeaderEmbed = new EmbedBuilder()
        .setImage(BASE_URL+'/units/'+ merc.commander_id+'/screenshot')
        .setDescription('Name of mercenary group leader: '+ merc.bossname)
    const mercTroopEmbed = new EmbedBuilder()
        .setImage(BASE_URL+'/units/'+ merc.unit_id+'/screenshot')
        .setDescription('Number of units: '+ merc.nrunits)
    return [mercEmbed, mercLeaderEmbed, mercTroopEmbed];
}

module.exports = { getMerc }