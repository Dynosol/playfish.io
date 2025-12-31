import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import CardImage from '@/components/CardImage';
import { getCardKey, type Card } from '@/firebase/gameService';
import { getFanConfig, type DragState, type CardDimensions } from '@/hooks/useCardDrag';

interface PlayerHandProps {
  playerHand: Card[];
  cardDimensions: CardDimensions;
  responsiveFactor: number;
  isDesktop: boolean;
  dragState: DragState | null;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, index: number, card: Card) => void;
}

// Mobile stacked card layout component (no drag, just swipe to cycle active card)
const MobilePlayerHand: React.FC<{
  playerHand: Card[];
}> = ({ playerHand }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  // Card dimensions for mobile
  const cardWidth = 70;
  const cardHeight = 98;
  const baseOverlap = 22; // How much of each card is visible normally
  const activeScale = 1.15;
  const activeExtraSpace = 8; // Extra space on each side of active card

  // Reset active index when hand changes
  useEffect(() => {
    setActiveIndex(prev => Math.min(prev, Math.max(0, playerHand.length - 1)));
  }, [playerHand.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const deltaX = touchStartX.current - touchCurrentX.current;
    const threshold = 30; // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swiped left - go to next card
        setActiveIndex(prev => Math.min(prev + 1, playerHand.length - 1));
      } else {
        // Swiped right - go to previous card
        setActiveIndex(prev => Math.max(prev - 1, 0));
      }
    }
  };

  const handleCardTap = (index: number) => {
    setActiveIndex(index);
  };

  // Calculate position for each card, accounting for active card spacing
  const getCardPosition = (index: number) => {
    let xPos = 0;
    for (let i = 0; i < index; i++) {
      xPos += baseOverlap;
      // Add extra space after active card
      if (i === activeIndex) {
        xPos += activeExtraSpace;
      }
    }
    // Add extra space before active card (shift it right slightly)
    if (index > activeIndex) {
      xPos += activeExtraSpace;
    }
    return xPos;
  };

  // Calculate total width needed
  const totalWidth = cardWidth + (playerHand.length - 1) * baseOverlap + (activeExtraSpace * 2);

  return (
    <div className="w-full flex flex-col items-center py-3">
      <div
        className="relative"
        style={{
          width: `${totalWidth}px`,
          height: `${cardHeight * activeScale}px`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {playerHand.map((card, index) => {
          const isActive = index === activeIndex;
          const isBeforeActive = index < activeIndex;
          const xPos = getCardPosition(index);

          // Center vertically, active card scales from center
          const yOffset = isActive ? (cardHeight * activeScale - cardHeight) / 2 : (cardHeight * activeScale - cardHeight) / 2;

          return (
            <div
              key={getCardKey(card)}
              className={cn(
                "absolute transition-all duration-200",
                isActive && "z-50"
              )}
              onClick={() => handleCardTap(index)}
              style={{
                left: `${xPos}px`,
                top: `${yOffset}px`,
                zIndex: isActive ? 50 : isBeforeActive ? index : playerHand.length - index,
                transform: isActive ? `scale(${activeScale})` : 'scale(1)',
                transformOrigin: 'center center',
                filter: isActive ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            >
              <CardImage card={card} width={cardWidth} height={cardHeight} />
            </div>
          );
        })}
      </div>

      {/* Card position indicator */}
      {playerHand.length > 1 && (
        <div className="flex gap-1.5 mt-2">
          {playerHand.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors cursor-pointer",
                index === activeIndex ? "bg-gray-800" : "bg-gray-300"
              )}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Card count label */}
      <div className="text-xs text-muted-foreground mt-1">
        {activeIndex + 1} / {playerHand.length}
      </div>
    </div>
  );
};

// Desktop fan layout component
const DesktopPlayerHand: React.FC<{
  playerHand: Card[];
  cardDimensions: CardDimensions;
  responsiveFactor: number;
  dragState: DragState | null;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, index: number, card: Card) => void;
}> = ({ playerHand, cardDimensions, responsiveFactor, dragState, onDragStart }) => {
  const { cardWidth, cardHeight, cardSpacing, minWidth, maxWidth, bottomOffset } = cardDimensions;

  return (
    <div
      className="fixed left-1/2 z-30 flex justify-center"
      style={{
        transform: 'translateX(-50%)',
        width: `${Math.min(Math.max(playerHand.length * cardSpacing, minWidth), maxWidth)}px`,
        height: `${cardDimensions.containerHeight}px`,
        bottom: 0
      }}
    >
      {playerHand.map((card, index) => {
        const totalCards = playerHand.length;
        const { radius, angleStep, startAngle, xOffset, indexRotationFactor } = getFanConfig(totalCards, cardDimensions);

        const indexRotation = index * indexRotationFactor;
        const rotation = startAngle + (index * angleStep) + indexRotation;
        const translateY = index * cardDimensions.translateYFactor;

        return (
          <div
            id={`card-slot-${index}`}
            key={getCardKey(card)}
            className={cn(
              "absolute transition-transform duration-200 cursor-pointer",
              !dragState && responsiveFactor > 0.5 && "hover:translate-y-[-20px] hover:z-40"
            )}
            onMouseDown={(e) => onDragStart(e, index, card)}
            onTouchStart={(e) => onDragStart(e, index, card)}
            onDragStart={(e) => e.preventDefault()}
            style={{
              left: '50%',
              bottom: `${bottomOffset}px`,
              marginLeft: `calc(-${cardWidth / 2}px - ${xOffset}px)`,
              transformOrigin: `50% ${radius}px`,
              transform: `rotate(${rotation}deg) translateY(-${translateY}px)`,
              zIndex: index,
              opacity: dragState?.cardKey === getCardKey(card) ? 0 : 1,
              pointerEvents: dragState ? 'none' : 'auto'
            }}
          >
            <CardImage card={card} width={cardWidth} height={cardHeight} />
          </div>
        );
      })}
    </div>
  );
};

const PlayerHand: React.FC<PlayerHandProps> = ({
  playerHand,
  cardDimensions,
  responsiveFactor,
  isDesktop,
  dragState,
  onDragStart,
}) => {
  if (playerHand.length === 0) return null;

  // Desktop fan layout (fixed position at bottom)
  if (isDesktop) {
    return (
      <DesktopPlayerHand
        playerHand={playerHand}
        cardDimensions={cardDimensions}
        responsiveFactor={responsiveFactor}
        dragState={dragState}
        onDragStart={onDragStart}
      />
    );
  }

  // Mobile layout is rendered inline where placed in the component tree
  return (
    <MobilePlayerHand
      playerHand={playerHand}
    />
  );
};

// Export mobile component separately for flexible placement
export { MobilePlayerHand };

export default PlayerHand;
