const adjectives = [
  'Swift', 'Brave', 'Clever', 'Mighty', 'Gentle', 'Fierce', 'Noble', 'Wise',
  'Bold', 'Calm', 'Bright', 'Dark', 'Quick', 'Silent', 'Wild', 'Tame',
  'Ancient', 'Young', 'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Amber',
  'Mystic', 'Sacred', 'Frozen', 'Burning', 'Thunder', 'Storm', 'Shadow', 'Light',
  'Iron', 'Steel', 'Crystal', 'Diamond', 'Ruby', 'Sapphire', 'Pearl', 'Jade',
  'Cosmic', 'Lunar', 'Solar', 'Stellar', 'Galactic', 'Nebula', 'Comet', 'Star',
  'Ocean', 'River', 'Mountain', 'Forest', 'Desert', 'Valley', 'Island', 'Peak',
  'Flying', 'Running', 'Dancing', 'Singing', 'Roaring', 'Howling', 'Whispering', 'Shouting'
];

const nouns = [
  'Eagle', 'Tiger', 'Lion', 'Panther', 'Wolf', 'Bear', 'Fox', 'Hawk',
  'Dragon', 'Phoenix', 'Griffin', 'Unicorn', 'Pegasus', 'Kraken', 'Leviathan', 'Basilisk',
  'Warrior', 'Knight', 'Mage', 'Ranger', 'Rogue', 'Paladin', 'Bard', 'Monk',
  'Blade', 'Shield', 'Bow', 'Staff', 'Sword', 'Axe', 'Spear', 'Dagger',
  'Storm', 'Thunder', 'Lightning', 'Fire', 'Ice', 'Wind', 'Earth', 'Water',
  'Star', 'Moon', 'Sun', 'Comet', 'Nebula', 'Galaxy', 'Planet', 'Asteroid',
  'Mountain', 'River', 'Ocean', 'Forest', 'Desert', 'Valley', 'Island', 'Cave',
  'Phoenix', 'Raven', 'Owl', 'Falcon', 'Sparrow', 'Crow', 'Hawk', 'Eagle'
];

export const generateUsername = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
};

