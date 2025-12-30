export const USER_COLORS = {
  mauve: '#B8899C',
  slate: '#7E8FB2',
  clay: '#C4917E',
  teal: '#5A9E9E',
  plum: '#A07BA0',
  ochre: '#C4B07A',
  sage: '#8AA67E',
  coral: '#C98E8E',
  indigo: '#7A7AB2',
  wine: '#B87A8E',
  bronze: '#B2A07A',
  steel: '#8A9EB2',
} as const;

export type UserColorName = keyof typeof USER_COLORS;

export const USER_COLOR_NAMES = Object.keys(USER_COLORS) as UserColorName[];

export const getRandomUserColor = (): UserColorName => {
  const index = Math.floor(Math.random() * USER_COLOR_NAMES.length);
  return USER_COLOR_NAMES[index];
};
