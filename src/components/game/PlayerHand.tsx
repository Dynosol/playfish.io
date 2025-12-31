import React from 'react';
import { Shuffle, ArrowDownUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CardImage from '@/components/CardImage';
import { getCardKey, type Card } from '@/firebase/gameService';
import { getFanConfig, type DragState, type CardDimensions } from '@/hooks/useCardDrag';

interface PlayerHandProps {
  playerHand: Card[];
  cardDimensions: CardDimensions;
  responsiveFactor: number;
  isMyTurn: boolean;
  isDesktop: boolean;
  dragState: DragState | null;
  toast: { message: string; visible: boolean };
  onDragStart: (e: React.MouseEvent | React.TouchEvent, index: number, card: Card) => void;
  onShuffle: () => void;
  onSort: () => void;
}

// Linear interpolation helper
const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

const PlayerHand: React.FC<PlayerHandProps> = ({
  playerHand,
  cardDimensions,
  responsiveFactor,
  isMyTurn,
  isDesktop,
  dragState,
  toast,
  onDragStart,
  onShuffle,
  onSort,
}) => {
  if (playerHand.length === 0) return null;

  const { cardWidth, cardHeight, cardSpacing, minWidth, maxWidth, bottomOffset } = cardDimensions;

  return (
    <div
      className={cn(
        "fixed left-1/2 z-30 flex justify-center",
        isMyTurn && responsiveFactor > 0.5 && "ring-4 ring-green-500 ring-offset-2 ring-offset-background"
      )}
      style={{
        transform: 'translateX(-50%)',
        width: `${Math.min(Math.max(playerHand.length * cardSpacing, minWidth), maxWidth)}px`,
        height: `${cardDimensions.containerHeight}px`,
        // In responsive mode, position above the GameInfo/Chat section (~400px)
        bottom: isDesktop ? 0 : `${lerp(380, 0, responsiveFactor)}px`
      }}
    >
      {/* Sort/Shuffle buttons - hidden on small screens for cleaner UI */}
      <div className={cn(
        "absolute left-[-140px] bottom-[20px] flex flex-col gap-2 z-50 items-center",
        responsiveFactor < 0.5 && "hidden"
      )}>
        <div className={cn(
          "absolute bottom-full mb-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity duration-200 pointer-events-none",
          toast.visible ? "opacity-100" : "opacity-0"
        )}>
          {toast.message}
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 bg-white border border-gray-200 hover:bg-gray-50"
          onClick={onSort}
          title="Sort cards"
        >
          <ArrowDownUp className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 bg-white border border-gray-200 hover:bg-gray-50"
          onClick={onShuffle}
          title="Shuffle cards"
        >
          <Shuffle className="h-5 w-5" />
        </Button>
      </div>

      {playerHand.map((card, index) => {
        const totalCards = playerHand.length;
        const { radius, angleStep, startAngle, xOffset, indexRotationFactor } = getFanConfig(totalCards, cardDimensions);

        // Add extra rotation based on index to complement the vertical offset
        const indexRotation = index * indexRotationFactor;
        const rotation = startAngle + (index * angleStep) + indexRotation;

        // Increasing vertical offset for each card
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

export default PlayerHand;
