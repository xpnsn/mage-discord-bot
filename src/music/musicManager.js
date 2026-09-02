const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    StreamType,
} = require('@discordjs/voice');

const ytdlp = require('yt-dlp-exec');

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
        ytdlpProcess: null,
    };

    players.set(guildId, guildPlayer);

    connection.on(
        VoiceConnectionStatus.Disconnected,
        () => {
            console.log(`[MUSIC] Disconnected from ${member.guild.name}`);
        }
    );

    audioPlayer.on(
        AudioPlayerStatus.Playing,
        () => {
            guildPlayer.isPlaying = true;
            console.log(`[MUSIC] Playing: ${guildPlayer.currentTrack?.name}`);
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
            console.error(`[MUSIC] Player error:`, error);
            handleTrackEnd(guildId);
        }
    );

    return guildPlayer;
}

/*
 * Kills any yt-dlp process still running for this
 * guild, so we don't leak processes when skipping,
 * stopping, or moving to the next track.
 */
function killCurrentProcess(guildPlayer) {
    if (guildPlayer.ytdlpProcess && !guildPlayer.ytdlpProcess.killed) {
        try {
            guildPlayer.ytdlpProcess.kill('SIGKILL');
        } catch (error) {
            // process may have already exited on its own — safe to ignore
        }
    }

    guildPlayer.ytdlpProcess = null;
}

/*
 * Plays a track by streaming it in real time via yt-dlp.
 * yt-dlp writes audio bytes to its own stdout as it
 * downloads, and we pipe that stdout straight into the
 * Discord voice connection — nothing touches disk, and
 * memory stays flat regardless of video length.
 *
 * track: { name, url, requestedBy }
 */
async function playStreamTrack(guildId, track) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        throw new Error('Music player does not exist.');
    }

    killCurrentProcess(guildPlayer);

    guildPlayer.currentTrack = track;

    const subprocess = ytdlp.exec(
        track.url,
        {
            output: '-',
            format: 'bestaudio/best',
            quiet: true,
            noWarnings: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            noPlaylist: true,
        },
        {
            stdio: ['ignore', 'pipe', 'ignore'],
        }
    );

    guildPlayer.ytdlpProcess = subprocess;

    subprocess.catch(error => {
        /*
         * Killing the process intentionally (skip/stop) also
         * rejects this promise — only log real failures.
         */
        if (guildPlayer.ytdlpProcess === subprocess) {
            console.error('[MUSIC] yt-dlp process error:', error.shortMessage || error.message);
        }
    });

    const resource = createAudioResource(subprocess.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
    });

    resource.volume.setVolume(guildPlayer.volume);

    guildPlayer.audioPlayer.play(resource);
}

async function addTrack(member, track) {
    const guildPlayer = createGuildPlayer(member);

    if (!guildPlayer.currentTrack) {
        await playStreamTrack(member.guild.id, track);

        return {
            position: 0,
            playing: true,
        };
    }

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

    const currentTrack = guildPlayer.currentTrack;

    if (guildPlayer.loop === 'track' && currentTrack) {
        try {
            await playStreamTrack(guildId, currentTrack);
        } catch (error) {
            console.error('[MUSIC] Loop error:', error);
        }

        return;
    }

    if (guildPlayer.loop === 'queue' && currentTrack) {
        guildPlayer.queue.push(currentTrack);
    }

    if (guildPlayer.queue.length === 0) {
        guildPlayer.currentTrack = null;
        console.log(`[MUSIC] Queue finished for ${guildId}`);
        return;
    }

    const nextTrack = guildPlayer.queue.shift();

    try {
        await playStreamTrack(guildId, nextTrack);
    } catch (error) {
        console.error('[MUSIC] Failed to play next track:', error);
        handleTrackEnd(guildId);
    }
}

function getPlayer(guildId) {
    return players.get(guildId);
}

function pause(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    return guildPlayer.audioPlayer.pause();
}

function resume(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    return guildPlayer.audioPlayer.unpause();
}

async function skip(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    /*
     * Stopping the player fires AudioPlayerStatus.Idle,
     * which automatically starts the next track.
     */
    guildPlayer.audioPlayer.stop();

    return true;
}

function clearQueue(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.queue = [];

    return true;
}

function stop(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    killCurrentProcess(guildPlayer);

    guildPlayer.queue = [];
    guildPlayer.currentTrack = null;
    guildPlayer.audioPlayer.stop();
    guildPlayer.connection.destroy();

    players.delete(guildId);

    return true;
}

function setVolume(guildId, volume) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.volume = volume;

    if (guildPlayer.audioPlayer.state.resource) {
        guildPlayer.audioPlayer.state.resource.volume.setVolume(volume);
    }

    return true;
}

function setLoop(guildId, mode) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    guildPlayer.loop = mode;

    return true;
}

function shuffle(guildId) {
    const guildPlayer = players.get(guildId);

    if (!guildPlayer) {
        return false;
    }

    for (let i = guildPlayer.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [guildPlayer.queue[i], guildPlayer.queue[j]] =
            [guildPlayer.queue[j], guildPlayer.queue[i]];
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