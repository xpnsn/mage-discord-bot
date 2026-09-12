'use strict';

/**
 * Turns literal "\n" / "\t" typed into a Discord string option into real
 * newline/tab characters. Slash command text fields can't contain actual
 * line breaks, so this is how users get multi-line embed/announcement text.
 */
function unescapeText(text) {
    if (!text) return text;
    return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

module.exports = { unescapeText };