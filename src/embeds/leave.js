const { EmbedBuilder } = require('discord.js');

module.exports = (member) => {
    return new EmbedBuilder()
        .setDescription(`**Shine Bakayaro ${member.user.username}!**`)
        .setImage('https://cdn.discordapp.com/attachments/1413622331229737053/1544713683962306580/image0.gif?ex=6a998239&is=6a9830b9&hm=797f5762b37860c6f452b2fa2c91d0a1b718dc9127d4cc362860c672c1d0535d&')
        .setTimestamp();
};

