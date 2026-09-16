'use strict';

const privateVoice = require('../config/privateVoice');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(client, oldState, newState) {
        // Only care about someone leaving (or moving out of) a channel.
        if (!oldState.channelId || oldState.channelId === newState.channelId) return;

        const guildId = oldState.guild.id;
        if (!privateVoice.isPrivateVcChannel(guildId, oldState.channelId)) return;

        const channel = oldState.channel || (await oldState.guild.channels.fetch(oldState.channelId).catch(() => null));

        if (!channel) {
            // Channel is already gone somehow — just clean up the record.
            privateVoice.removeChannel(guildId, oldState.channelId);
            return;
        }

        if (channel.members.size === 0) {
            privateVoice.removeChannel(guildId, channel.id);
            await channel.delete('Private voice channel is empty').catch(error => {
                console.error('Failed to delete empty private VC:', error);
            });
        }
    },
};
