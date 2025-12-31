import { useState, useEffect, useRef, useCallback } from 'react';
import { getCardKey, type Card } from '@/firebase/gameService';
import { getCardImageSrc } from '@/utils/cardUtils';

export interface DragState {
  index: number;
  cardKey: string;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  isDropping?: boolean;
  dropX?: number;
  dropY?: number;
  dropRotation?: number;
}

export interface CardDimensions {
  cardWidth: number;
  cardHeight: number;
  radius: number;
  angleStep: number;
  indexRotationFactor: number;
  translateYFactor: number;
  bottomOffset: number;
  containerHeight: number;
  cardSpacing: number;
  minWidth: number;
  maxWidth: number;
}

export interface FanConfig {
  radius: number;
  angleStep: number;
  startAngle: number;
  xOffset: number;
  indexRotationFactor: number;
}

export const getFanConfig = (totalCards: number, cardDimensions: CardDimensions): FanConfig => {
  const { radius, angleStep, indexRotationFactor } = cardDimensions;
  const startAngle = -((totalCards - 1) * angleStep) / 2;

  const firstCardRotation = startAngle;
  const lastCardRotation = startAngle + ((totalCards - 1) * angleStep) + ((totalCards - 1) * indexRotationFactor);
  const centerRotation = (firstCardRotation + lastCardRotation) / 2;
  const centerOffsetRadians = (centerRotation * Math.PI) / 180;
  const xOffset = radius * Math.sin(centerOffsetRadians);

  return { radius, angleStep, startAngle, xOffset, indexRotationFactor };
};

export const useCardDrag = (
  localPlayerHand: Card[],
  setLocalPlayerHand: React.Dispatch<React.SetStateAction<Card[]>>,
  cardDimensions: CardDimensions
) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragCardRef = useRef<{ card: Card; imageSrc: string } | null>(null);

  const handleDragStart = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    index: number,
    card: Card
  ) => {
    // For mouse events, only handle left click
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    // Get clientX/Y from mouse or touch event
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragCardRef.current = {
      card,
      imageSrc: getCardImageSrc(card)
    };

    setDragState({
      index,
      cardKey: getCardKey(card),
      currentX: clientX,
      currentY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    });
  }, []);

  useEffect(() => {
    if (!dragState || dragState.isDropping) return;

    const handleMove = (clientX: number, clientY: number) => {
      setDragState(prev => prev ? { ...prev, currentX: clientX, currentY: clientY } : null);

      // Live reordering
      const { radius: FAN_RADIUS, cardHeight: CARD_HEIGHT } = cardDimensions;

      const totalCards = localPlayerHand.length;
      const { angleStep, startAngle, xOffset, indexRotationFactor } = getFanConfig(totalCards, cardDimensions);

      // Adjust pivotX by xOffset because the fan is shifted left by xOffset
      const pivotX = (window.innerWidth / 2) - xOffset;
      const pivotY = window.innerHeight - CARD_HEIGHT + 30 + FAN_RADIUS;

      const dx = clientX - pivotX;
      const dy = clientY - pivotY;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      const normalizedAngle = angleDeg + 90;

      let bestIndex = 0;
      let minDiff = Infinity;

      for (let i = 0; i < totalCards; i++) {
        const indexRotation = i * indexRotationFactor;
        const slotAngle = startAngle + (i * angleStep) + indexRotation;
        const diff = Math.abs(normalizedAngle - slotAngle);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = i;
        }
      }

      if (bestIndex !== dragState.index) {
        setLocalPlayerHand(prev => {
          const newHand = [...prev];
          const [moved] = newHand.splice(dragState.index, 1);
          newHand.splice(bestIndex, 0, moved);
          return newHand;
        });
        setDragState(prev => prev ? { ...prev, index: bestIndex } : null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      const slotElement = document.getElementById(`card-slot-${dragState.index}`);
      if (slotElement) {
        const rect = slotElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const totalCards = localPlayerHand.length;
        const { angleStep, startAngle, indexRotationFactor } = getFanConfig(totalCards, cardDimensions);
        const indexRotation = dragState.index * indexRotationFactor;
        const targetRotation = startAngle + (dragState.index * angleStep) + indexRotation;

        const { cardWidth, cardHeight } = cardDimensions;

        setDragState(prev => prev ? {
          ...prev,
          isDropping: true,
          dropX: centerX - cardWidth / 2,
          dropY: centerY - cardHeight / 2,
          dropRotation: targetRotation
        } : null);

        setTimeout(() => {
          setDragState(null);
          dragCardRef.current = null;
        }, 200);
      } else {
        setDragState(null);
        dragCardRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState, localPlayerHand, cardDimensions, setLocalPlayerHand]);

  return {
    dragState,
    dragCardRef,
    handleDragStart,
  };
};
