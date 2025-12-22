const ADVERBS = [
  'quickly', 'slowly', 'boldly', 'quietly', 'loudly',
  'swiftly', 'gently', 'fiercely', 'calmly', 'wildly',
  'happily', 'sadly', 'gladly', 'proudly', 'bravely',
  'softly', 'sharply', 'deeply', 'highly', 'greatly',
  'nearly', 'fairly', 'truly', 'rarely', 'mostly',
  'briskly', 'smoothly', 'roughly', 'tightly', 'loosely',
  'warmly', 'coolly', 'freshly', 'sweetly', 'neatly',
  'poorly', 'richly', 'madly', 'wisely', 'blindly'
];

const VERBS = [
  'jumping', 'running', 'swimming', 'flying', 'dancing',
  'singing', 'playing', 'reading', 'writing', 'drawing',
  'cooking', 'eating', 'sleeping', 'walking', 'talking',
  'hunting', 'fishing', 'climbing', 'diving', 'surfing',
  'skating', 'sliding', 'gliding', 'floating', 'drifting',
  'spinning', 'twisting', 'turning', 'rolling', 'bouncing',
  'hopping', 'leaping', 'racing', 'chasing', 'catching',
  'throwing', 'kicking', 'hitting', 'pushing', 'pulling'
];

const NOUNS = [
  'dragon', 'phoenix', 'tiger', 'falcon', 'dolphin',
  'panther', 'serpent', 'griffin', 'unicorn', 'pegasus',
  'wizard', 'knight', 'archer', 'ranger', 'pirate',
  'ninja', 'samurai', 'viking', 'spartan', 'gladiator',
  'thunder', 'lightning', 'tornado', 'volcano', 'glacier',
  'mountain', 'ocean', 'forest', 'desert', 'canyon',
  'crystal', 'diamond', 'emerald', 'sapphire', 'ruby',
  'shadow', 'phantom', 'specter', 'wraith', 'spirit'
];

const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const generateLobbyId = (): string => {
  const adverb = getRandomElement(ADVERBS);
  const verb = getRandomElement(VERBS);
  const noun = getRandomElement(NOUNS);
  return `${adverb}-${verb}-${noun}`;
};

export const isValidLobbyId = (id: string): boolean => {
  const parts = id.split('-');
  if (parts.length !== 3) return false;

  const [adverb, verb, noun] = parts;
  return ADVERBS.includes(adverb) && VERBS.includes(verb) && NOUNS.includes(noun);
};
