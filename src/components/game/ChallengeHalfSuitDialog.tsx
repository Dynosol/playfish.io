import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { colors } from '@/utils/colors';
import type { Card } from '@/firebase/gameService';

const suitIcons: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

interface ChallengeHalfSuitDialogProps {
  completedHalfsuits: Card['halfSuit'][];
  onSelect: (halfSuit: Card['halfSuit']) => void;
  onCancel: () => void;
}

const ChallengeHalfSuitDialog: React.FC<ChallengeHalfSuitDialogProps> = ({
  completedHalfsuits,
  onSelect,
  onCancel,
}) => {
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
  const levels = ['low', 'high'] as const;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="w-80 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3" style={{ backgroundColor: colors.amber }}>
          <h2 className="text-white font-semibold">CHALLENGE</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Select a half-suit to challenge the opponent to declare:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {suits.map(suit => {
              const isRed = suit === 'hearts' || suit === 'diamonds';
              const suitColor = isRed ? '#ef4444' : '#000000';

              return levels.map(level => {
                const halfSuit = `${level}-${suit}` as Card['halfSuit'];
                const isCompleted = completedHalfsuits.includes(halfSuit);

                return (
                  <button
                    key={halfSuit}
                    onClick={() => !isCompleted && onSelect(halfSuit)}
                    disabled={isCompleted}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all",
                      isCompleted
                        ? "opacity-40 cursor-not-allowed bg-gray-100 border-gray-300"
                        : "hover:bg-gray-50 active:bg-gray-100 border-gray-300 hover:border-amber-500"
                    )}
                  >
                    <span
                      style={{ color: suitColor }}
                      className="text-xl leading-none"
                    >
                      {suitIcons[suit]}
                    </span>
                    <span className={cn(
                      "capitalize font-medium",
                      isCompleted ? "text-gray-400" : "text-gray-700"
                    )}>
                      {level}
                    </span>
                    {isCompleted && (
                      <span className="text-xs text-gray-400 ml-auto">Done</span>
                    )}
                  </button>
                );
              });
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="w-full rounded"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeHalfSuitDialog;
