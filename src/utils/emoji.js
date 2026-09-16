'use strict';

// A custom emoji option value looks like <:name:123456789012345678> or
// <a:name:123...> for animated. Reaction events identify custom emojis by
// their snowflake ID (not the display string), so that's what panels
// should be keyed on. Unicode emojis are keyed by the literal character,
// which is what both the option value and reaction.emoji.name already are.
function normalizeEmoji(raw) {
    const custom = raw.match(/^<a?:\w+:(\d+)>$/);
    return custom ? custom[1] : raw;
}

module.exports = { normalizeEmoji };
