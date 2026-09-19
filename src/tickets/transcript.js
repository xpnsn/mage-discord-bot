'use strict';

const { EmbedBuilder } = require('discord.js');

const MAX_DESCRIPTION = 4000; // headroom under Discord's 4096-char embed description limit
const MAX_EMBEDS_PER_MESSAGE = 10; // Discord's limit
const MAX_MESSAGES = 1000; // safety cap so a huge ticket can't loop forever

async function fetchAllMessages(channel) {
    const collected = [];
    let before;

    while (collected.length < MAX_MESSAGES) {
        const batch = await channel.messages.fetch({ limit: 100, before });
        if (!batch.size) break;

        collected.push(...batch.values());
        before = batch.last().id;

        if (batch.size < 100) break;
    }

    // fetch() returns newest-first — a transcript should read chronologically.
    return collected.reverse();
}

function formatLine(message) {
    const author = message.author?.username || 'Unknown user';
    let content = message.content;

    if (!content) {
        if (message.embeds.length) content = '*[embed]*';
        else if (message.attachments.size) content = '*[attachment]*';
        else content = '*[no content]*';
    }

    const timestamp = `<t:${Math.floor(message.createdTimestamp / 1000)}:T>`;
    return `**${author}** (${timestamp}): ${content}`;
}

// Splits lines into chunks that each fit under maxLength, without breaking
// a single message's line across two chunks — unless that one line alone
// is longer than the limit, in which case it's hard-split as a last resort.
function chunkLines(lines, maxLength) {
    const chunks = [];
    let current = '';

    for (const line of lines) {
        if (line.length > maxLength) {
            if (current) {
                chunks.push(current);
                current = '';
            }
            for (let i = 0; i < line.length; i += maxLength) {
                chunks.push(line.slice(i, i + maxLength));
            }
            continue;
        }

        const candidate = current ? `${current}\n${line}` : line;

        if (candidate.length > maxLength) {
            chunks.push(current);
            current = line;
        } else {
            current = candidate;
        }
    }

    if (current) chunks.push(current);
    return chunks;
}

/**
 * Builds the transcript as an array of embeds. The caller is responsible
 * for batching them into messages of at most MAX_EMBEDS_PER_MESSAGE (see
 * sendTranscript below, which does this).
 */
async function buildTranscriptEmbeds(channel, { openerId, closerTag }) {
    const messages = await fetchAllMessages(channel);
    const lines = messages.map(formatLine);
    const chunks = chunkLines(lines, MAX_DESCRIPTION);

    if (!chunks.length) chunks.push('*No messages were sent in this ticket.*');

    return chunks.map((chunk, index) => {
        const embed = new EmbedBuilder().setColor('#2b2d31').setDescription(chunk);

        if (index === 0) {
            embed.setTitle(`Transcript — #${channel.name}`);
            embed.addFields(
                { name: 'Opened by', value: `<@${openerId}>`, inline: true },
                { name: 'Closed by', value: closerTag, inline: true }
            );
        }

        if (index === chunks.length - 1) {
            embed.setFooter({ text: `${messages.length} message(s)` });
            embed.setTimestamp();
        }

        return embed;
    });
}

async function sendTranscript(logChannel, embeds) {
    for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
        await logChannel.send({ embeds: embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE) });
    }
}

module.exports = { buildTranscriptEmbeds, sendTranscript };
