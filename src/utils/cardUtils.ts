// Attribution: Byron Knoll: http://code.google.com/p/vector-playing-cards/

import type { Card } from '../firebase/gameService';

import ace_of_spades from '@/assets/cards/ace_of_spades.svg';
import ace_of_hearts from '@/assets/cards/ace_of_hearts.svg';
import ace_of_diamonds from '@/assets/cards/ace_of_diamonds.svg';
import ace_of_clubs from '@/assets/cards/ace_of_clubs.svg';
import two_of_spades from '@/assets/cards/2_of_spades.svg';
import two_of_hearts from '@/assets/cards/2_of_hearts.svg';
import two_of_diamonds from '@/assets/cards/2_of_diamonds.svg';
import two_of_clubs from '@/assets/cards/2_of_clubs.svg';
import three_of_spades from '@/assets/cards/3_of_spades.svg';
import three_of_hearts from '@/assets/cards/3_of_hearts.svg';
import three_of_diamonds from '@/assets/cards/3_of_diamonds.svg';
import three_of_clubs from '@/assets/cards/3_of_clubs.svg';
import four_of_spades from '@/assets/cards/4_of_spades.svg';
import four_of_hearts from '@/assets/cards/4_of_hearts.svg';
import four_of_diamonds from '@/assets/cards/4_of_diamonds.svg';
import four_of_clubs from '@/assets/cards/4_of_clubs.svg';
import five_of_spades from '@/assets/cards/5_of_spades.svg';
import five_of_hearts from '@/assets/cards/5_of_hearts.svg';
import five_of_diamonds from '@/assets/cards/5_of_diamonds.svg';
import five_of_clubs from '@/assets/cards/5_of_clubs.svg';
import six_of_spades from '@/assets/cards/6_of_spades.svg';
import six_of_hearts from '@/assets/cards/6_of_hearts.svg';
import six_of_diamonds from '@/assets/cards/6_of_diamonds.svg';
import six_of_clubs from '@/assets/cards/6_of_clubs.svg';
import seven_of_spades from '@/assets/cards/7_of_spades.svg';
import seven_of_hearts from '@/assets/cards/7_of_hearts.svg';
import seven_of_diamonds from '@/assets/cards/7_of_diamonds.svg';
import seven_of_clubs from '@/assets/cards/7_of_clubs.svg';
import nine_of_spades from '@/assets/cards/9_of_spades.svg';
import nine_of_hearts from '@/assets/cards/9_of_hearts.svg';
import nine_of_diamonds from '@/assets/cards/9_of_diamonds.svg';
import nine_of_clubs from '@/assets/cards/9_of_clubs.svg';
import ten_of_spades from '@/assets/cards/10_of_spades.svg';
import ten_of_hearts from '@/assets/cards/10_of_hearts.svg';
import ten_of_diamonds from '@/assets/cards/10_of_diamonds.svg';
import ten_of_clubs from '@/assets/cards/10_of_clubs.svg';
import jack_of_spades from '@/assets/cards/jack_of_spades.svg';
import jack_of_hearts from '@/assets/cards/jack_of_hearts.svg';
import jack_of_diamonds from '@/assets/cards/jack_of_diamonds.svg';
import jack_of_clubs from '@/assets/cards/jack_of_clubs.svg';
import queen_of_spades from '@/assets/cards/queen_of_spades.svg';
import queen_of_hearts from '@/assets/cards/queen_of_hearts.svg';
import queen_of_diamonds from '@/assets/cards/queen_of_diamonds.svg';
import queen_of_clubs from '@/assets/cards/queen_of_clubs.svg';
import king_of_spades from '@/assets/cards/king_of_spades.svg';
import king_of_hearts from '@/assets/cards/king_of_hearts.svg';
import king_of_diamonds from '@/assets/cards/king_of_diamonds.svg';
import king_of_clubs from '@/assets/cards/king_of_clubs.svg';

const cardImageMap: Record<string, string> = {
  'A-spades': ace_of_spades,
  'A-hearts': ace_of_hearts,
  'A-diamonds': ace_of_diamonds,
  'A-clubs': ace_of_clubs,
  '2-spades': two_of_spades,
  '2-hearts': two_of_hearts,
  '2-diamonds': two_of_diamonds,
  '2-clubs': two_of_clubs,
  '3-spades': three_of_spades,
  '3-hearts': three_of_hearts,
  '3-diamonds': three_of_diamonds,
  '3-clubs': three_of_clubs,
  '4-spades': four_of_spades,
  '4-hearts': four_of_hearts,
  '4-diamonds': four_of_diamonds,
  '4-clubs': four_of_clubs,
  '5-spades': five_of_spades,
  '5-hearts': five_of_hearts,
  '5-diamonds': five_of_diamonds,
  '5-clubs': five_of_clubs,
  '6-spades': six_of_spades,
  '6-hearts': six_of_hearts,
  '6-diamonds': six_of_diamonds,
  '6-clubs': six_of_clubs,
  '7-spades': seven_of_spades,
  '7-hearts': seven_of_hearts,
  '7-diamonds': seven_of_diamonds,
  '7-clubs': seven_of_clubs,
  '9-spades': nine_of_spades,
  '9-hearts': nine_of_hearts,
  '9-diamonds': nine_of_diamonds,
  '9-clubs': nine_of_clubs,
  '10-spades': ten_of_spades,
  '10-hearts': ten_of_hearts,
  '10-diamonds': ten_of_diamonds,
  '10-clubs': ten_of_clubs,
  'J-spades': jack_of_spades,
  'J-hearts': jack_of_hearts,
  'J-diamonds': jack_of_diamonds,
  'J-clubs': jack_of_clubs,
  'Q-spades': queen_of_spades,
  'Q-hearts': queen_of_hearts,
  'Q-diamonds': queen_of_diamonds,
  'Q-clubs': queen_of_clubs,
  'K-spades': king_of_spades,
  'K-hearts': king_of_hearts,
  'K-diamonds': king_of_diamonds,
  'K-clubs': king_of_clubs,
};

export const getCardImageSrc = (card: Card): string => {
  const key = `${card.rank}-${card.suit}`;
  return cardImageMap[key] || '';
};
