const { EmbedBuilder } = require('discord.js');

module.exports = (member) => {
    return new EmbedBuilder()
        .setColor('#ff73fa')
        .setTitle('💜 Thank You For Boosting!')
        .setDescription(
            `Thank you **${member.user.username}** for boosting **${member.guild.name}**! 💜\n\n` +
            `Your support means a lot to us and helps keep the server growing! ✨`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: `${member.guild.name} • Thank you for the support!`
        })
        .setTimestamp();
};