const { EmbedBuilder } = require('discord.js');

module.exports = (member) => {
    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Welcome to MAGE')
        .setDescription(
            `Ara ara konnichiwa <@${member.id}> 🤍, welcome to Mage Coven\n` +
            `🕯️📖 Read the <#1221045106690490469> · checkout <#1221014228832616501> · ` +
            `Taizai to nanishinde 😚`
        )
        .setImage('https://media.discordapp.net/attachments/1118538019687895192/1118550762168000582/anime-banner-gif-file-1880kb-anpk2r6p128lqcbk.gif?ex=6a8517d3&is=6a83c653&hm=5bc4d530fee123d734bf8ff72625ab208d9ae176e1ff4c8fbe1e3003756a5792&');
};