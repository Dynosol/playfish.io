"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsProfanity = containsProfanity;
exports.cleanProfanity = cleanProfanity;
exports.validateNameForProfanity = validateNameForProfanity;
// bad-words package has ESM compatibility issues with Node 22
// Lazy-load the filter to avoid initialization errors during deploy analysis
let filter = null;
function getFilter() {
    if (!filter) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const BadWordsFilter = require('bad-words');
            filter = new BadWordsFilter();
        }
        catch {
            // Fallback if the package fails to load
            filter = {
                isProfane: () => false,
                clean: (text) => text
            };
        }
    }
    return filter;
}
/**
 * Check if a string contains profanity
 * @param text - The text to check
 * @returns true if the text contains profanity
 */
function containsProfanity(text) {
    return getFilter().isProfane(text);
}
/**
 * Clean profanity from a string by replacing with asterisks
 * @param text - The text to clean
 * @returns The cleaned text with profanity replaced
 */
function cleanProfanity(text) {
    return getFilter().clean(text);
}
/**
 * Validate a name (username or lobby name) for profanity
 * @param name - The name to validate
 * @returns An error message if invalid, null if valid
 */
function validateNameForProfanity(name) {
    if (containsProfanity(name)) {
        return 'Name contains inappropriate language';
    }
    return null;
}
//# sourceMappingURL=profanityFilter.js.map