import React from 'react';
import type { Card } from '../firebase/gameService';
import { getCardImageSrc } from '../utils/cardUtils';

interface CardImageProps {
  card: Card;
  className?: string;
  width?: number;
  height?: number;
}

const CardImage: React.FC<CardImageProps> = ({ card, className = '', width = 80, height = 112 }) => {
  const imageSrc = getCardImageSrc(card);
  
  return (
    <img
      src={imageSrc}
      alt={`${card.rank} of ${card.suit}`}
      className={className}
      width={width}
      height={height}
      draggable={false}
      style={{ 
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        WebkitUserDrag: 'none'
      }}
    />
  );
};

export default CardImage;

