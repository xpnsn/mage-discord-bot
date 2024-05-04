import { EmbedBuilder, MessageCollector } from 'discord.js';
import { ques } from './QnA/ques';
import { ans } from './QnA/ans';
let cnt = 0;

const scores={};


const quizCommand = async (interaction) => {
    const score={};

    if(cnt >= ques.length) {
        interaction.channel.send(`All questions asked!`);
        const scoreList = Object.entries(scores)
            .sort((a, b) => b[1] - a[1]) // Sort by scores in descending order
            .map(([name, score]) => `${name} - ${score} pts`)
            .join('\n');
        interaction.channel.send({embeds : [new EmbedBuilder().setColor('#2b2d31').setTitle('LeaderBoard').setDescription(scoreList)]});
        return;
    }

    const embed = new EmbedBuilder()
    .setTitle(`Question ${cnt+1}`)
    .setColor('#2b2d31')
    .setDescription(ques[cnt])
    .setFooter({ text: `React with the answer below!` });

    const sentMessage = await interaction.channel.send({ embeds: [embed] });

    await sentMessage.react('🇦');
    await sentMessage.react('🇧');
    await sentMessage.react('🇨');
    await sentMessage.react('🇩');

    const reactionCollector = sentMessage.createReactionCollector({
        filter: (reaction, user) => user.id !== interaction.client.user.id, // Ignore bot's own reactions
        time: 5000, // 5 seconds timeout
    });
    
    console.log(`correct answers is ${ans[cnt]}`);
    reactionCollector.on('collect', async(reaction, user) => {

        console.log(`${user.globalName} reacted ${reaction._emoji.name}`);

        if(score[user.globalName] != 1 && score[user.globalName] != 0) {
            if(reaction._emoji.name === ans[cnt]) {
                score[user.globalName] = 1;
                scores[user.globalName] = (scores[user.globalName] || 0) + score[user.globalName]
            } else {
                score[user.globalName] = 0;
            }

        }

    });

    reactionCollector.on('end', async() => {

        if(Object.keys(score).length === 0) {
            await interaction.channel.send({ embeds : [new EmbedBuilder().setColor('#2b2d31').setDescription('No one reacted!')] });
        } else {
            const leaderboard = new EmbedBuilder()
                .setTitle('Scores')
                .setColor('2b2d31')
                .setDescription(
                    Object.entries(score)
                    .sort((a, b) => b[1] - a[1]) // Sort by scores in descending order
                    .map(([name, score]) => `${name} - ${score} pts`)
                    .join('\n')
                );
    
            
            await interaction.channel.send({ embeds: [leaderboard] });
        }
        cnt++;
        console.log(scores);
        
    });
    
};

export default { quizCommand };
