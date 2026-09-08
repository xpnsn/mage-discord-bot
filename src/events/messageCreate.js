'use strict';

// Simple word-trigger auto-responses. Kept as the original two parallel
// arrays (words -> replies) so behavior is unchanged; only the code has
// moved out of index.js.
const TRIGGER_WORDS = ['ded', 'hello', '<@1130090945581432873>'];
const TRIGGER_REPLIES = ['shine bakayaro.', 'hey there', '<@887336793681330197> created me!'];

module.exports = {
    name: 'messageCreate',
    execute(client, message) {
        if (message.author.bot) return;

        for (let i = 0; i < TRIGGER_WORDS.length; i++) {
            if (message.content.toLocaleLowerCase() === TRIGGER_WORDS[i]) {
                message.channel.send(TRIGGER_REPLIES[i]);
            }
        }
    },
};
