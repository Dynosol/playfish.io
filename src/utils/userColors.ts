// User color palette - unique dark pastels
// These must match the colors defined in tailwind.config.js under 'user'
export const USER_COLORS = {
  mauve: '#8B6B7B',
  slate: '#5E6B8A',
  clay: '#9B7162',
  teal: '#4A7C7C',
  plum: '#7B5E7B',
  ochre: '#9B8A5E',
  sage: '#6B7B62',
  coral: '#9B6B6B',
  indigo: '#5E5E8A',
  wine: '#8A5E6B',
  bronze: '#8A7B5E',
  steel: '#6B7B8A',
} as const;

export type UserColorName = keyof typeof USER_COLORS;

export const USER_COLOR_NAMES = Object.keys(USER_COLORS) as UserColorName[];

export const getRandomUserColor = (): UserColorName => {
  const index = Math.floor(Math.random() * USER_COLOR_NAMES.length);
  return USER_COLOR_NAMES[index];
};

export const getUserColorHex = (colorName: UserColorName | string): string => {
  return USER_COLORS[colorName as UserColorName] || USER_COLORS.slate;
};
