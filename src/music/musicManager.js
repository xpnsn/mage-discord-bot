const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    entersState,
} = require('@discordjs/voice');

const fs = require('node:fs');
const path = require('node:path');

const players = new Map();

function createGuildPlayer(member) {
    const guildId = member.guild.id;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        throw new Error('You must be in a voice channel.');
    }

    let guildPlayer = players.get(guildId);

    if (guildPlayer) {
        return guildPlayer;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: member.guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    const audioPlayer = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    connection.subscribe(audioPlayer);

    guildPlayer = {
        connection,
        audioPlayer,

        queue: [],

        currentTrack: null,

        volume: 1,

        loop: 'off',

        isPlaying: false,
    };

    players.set(guildId, guildPlayer);

    connection.on(
        VoiceConnectionStatus.Disconnected,
        () => {
            console.log(
                `[MUSIC] Disconnected from ${member.guild.name}`
            );
        }
    );

    audioPlayer.on(
        AudioPlayerStatus.Playing,
        () => {
            guildPlayer.isPlaying = true;

            console.log(
                `[MUSIC] Playing: ${guildPlayer.currentTrack?.name}`
            );
        }
    );

    audioPlayer.on(
        AudioPlayerStatus.Idle,
        () => {
            guildPlayer.isPlaying = false;

            handleTrackEnd(guildId);
        }
    );

    audioPlayer.on(
        'error',
        error => {
            console.error(
                `[MUSIC] Player error:`,
                error
            );

            handleTrackEnd(guildId);
        }
    );

    return guildPlayer;
}

async function playTrack(guildId, track) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        throw new Error('Music player does not exist.');
    }

    if (!fs.existsSync(track.path)) {
        throw new Error(
            `Audio file not found: ${track.path}`
        );
    }

    guildPlayer.currentTrack = track;

    const resource = createAudioResource(
        track.path,
        {
            inlineVolume: true,
        }
    );

    resource.volume.setVolume(
        guildPlayer.volume
    );

    guildPlayer.audioPlayer.play(resource);
}

async function addTrack(member, track) {
    const guildPlayer = createGuildPlayer(member);

    /*
     * If nothing is currently playing,
     * start this track immediately.
     */
    if (!guildPlayer.currentTrack) {
        await playTrack(
            member.guild.id,
            track
        );

        return {
            position: 0,
            playing: true,
        };
    }

    /*
     * Otherwise add it to the queue.
     */
    guildPlayer.queue.push(track);

    return {
        position: guildPlayer.queue.length,
        playing: false,
    };
}

async function handleTrackEnd(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return;
    }

    const currentTrack =
        guildPlayer.currentTrack;

    /*
     * Loop current track.
     */
    if (
        guildPlayer.loop === 'track' &&
        currentTrack
    ) {
        try {
            await playTrack(
                guildId,
                currentTrack
            );
        } catch (error) {
            console.error(
                '[MUSIC] Loop error:',
                error
            );
        }

        return;
    }

    /*
     * Loop queue.
     *
     * Put the finished track at the end.
     */
    if (
        guildPlayer.loop === 'queue' &&
        currentTrack
    ) {
        guildPlayer.queue.push(
            currentTrack
        );
    }

    /*
     * Nothing left.
     */
    if (guildPlayer.queue.length === 0) {
        guildPlayer.currentTrack = null;

        console.log(
            `[MUSIC] Queue finished for ${guildId}`
        );

        return;
    }

    const nextTrack =
        guildPlayer.queue.shift();

    try {
        await playTrack(
            guildId,
            nextTrack
        );
    } catch (error) {
        console.error(
            '[MUSIC] Failed to play next track:',
            error
        );

        /*
         * Try the next track if this one fails.
         */
        handleTrackEnd(guildId);
    }
}

function getPlayer(guildId) {
    return players.get(guildId);
}

function pause(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    return guildPlayer.audioPlayer.pause();
}

function resume(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    return guildPlayer.audioPlayer.unpause();
}

async function skip(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    /*
     * Stopping the player causes AudioPlayerStatus.Idle,
     * which then automatically starts the next track.
     */
    guildPlayer.audioPlayer.stop();

    return true;
}

function clearQueue(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.queue = [];

    return true;
}

function stop(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.queue = [];

    guildPlayer.currentTrack = null;

    guildPlayer.audioPlayer.stop();

    guildPlayer.connection.destroy();

    players.delete(guildId);

    return true;
}

function setVolume(guildId, volume) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.volume = volume;

    return true;
}

function setLoop(guildId, mode) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.loop = mode;

    return true;
}

function shuffle(guildId) {
    const guildPlayer =
        players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    for (
        let i = guildPlayer.queue.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            guildPlayer.queue[i],
            guildPlayer.queue[j]
        ] = [
            guildPlayer.queue[j],
            guildPlayer.queue[i]
        ];
    }

    return true;
}

module.exports = {
    addTrack,
    getPlayer,
    pause,
    resume,
    skip,
    stop,
    clearQueue,
    setVolume,
    setLoop,
    shuffle,
};