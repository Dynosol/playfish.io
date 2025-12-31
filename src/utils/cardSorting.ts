import type { Card } from '@/firebase/gameService';

export type SortMethod = 'rank_asc' | 'rank_desc' | 'suit_rank_asc' | 'suit_rank_desc';

const rankValues: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const suitValues: Record<string, number> = {
  'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3
};

export const sortCards = (cards: Card[], method: SortMethod): Card[] => {
  return [...cards].sort((a, b) => {
    if (method === 'rank_asc') {
      return rankValues[a.rank] - rankValues[b.rank] || suitValues[a.suit] - suitValues[b.suit];
    } else if (method === 'rank_desc') {
      return rankValues[b.rank] - rankValues[a.rank] || suitValues[b.suit] - suitValues[a.suit];
    } else if (method === 'suit_rank_asc') {
      return suitValues[a.suit] - suitValues[b.suit] || rankValues[a.rank] - rankValues[b.rank];
    } else { // suit_rank_desc
      return suitValues[b.suit] - suitValues[a.suit] || rankValues[b.rank] - rankValues[a.rank];
    }
  });
};

export const getSortMethodLabel = (method: SortMethod): string => {
  const labels: Record<SortMethod, string> = {
    'rank_asc': 'ascending rank',
    'rank_desc': 'descending rank',
    'suit_rank_asc': 'ascending suit',
    'suit_rank_desc': 'descending suit'
  };
  return labels[method];
};

export const getNextSortMethod = (current: SortMethod): SortMethod => {
  const methods: SortMethod[] = ['suit_rank_asc', 'suit_rank_desc', 'rank_asc', 'rank_desc'];
  const currentIndex = methods.indexOf(current);
  return methods[(currentIndex + 1) % methods.length];
};
