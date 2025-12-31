// Basic profanity filter - avoids CommonJS/ESM compatibility issues with bad-words package
const BLOCKED_WORDS = [
  'ass', 'asshole', 'bastard', 'bitch', 'cock', 'cunt', 'damn', 'dick',
  'fuck', 'fucking', 'fucker', 'goddamn', 'hell', 'motherfucker', 'nigger',
  'nigga', 'piss', 'prick', 'pussy', 'shit', 'slut', 'whore', 'fag', 'faggot',
  'retard', 'retarded', 'crap', 'douche', 'jackass', 'twat', 'wanker',
];

// Create regex patterns that match whole words (case insensitive)
const patterns = BLOCKED_WORDS.map(word => new RegExp(`\\b${word}\\b`, 'i'));

/**
 * Check if a string contains profanity
 * @param text - The text to check
 * @returns true if the text contains profanity
 */
export function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase();
  return patterns.some(pattern => pattern.test(normalized));
}

/**
 * Validate a name (username or lobby name) for profanity
 * @param name - The name to validate
 * @returns An error message if invalid, null if valid
 */
export function validateNameForProfanity(name: string): string | null {
  if (containsProfanity(name)) {
    return 'Name contains inappropriate language';
  }
  return null;
}
