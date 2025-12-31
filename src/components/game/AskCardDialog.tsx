import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Card } from '@/firebase/gameService';
import { colors } from '@/utils/colors';

const suitIcons: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

const suits: Card['suit'][] = ['spades', 'hearts', 'clubs', 'diamonds'];
const rankRows: Card['rank'][][] = [
  ['2', '3', '4'],
  ['5', '6', '7'],
  ['9', '10', 'J'],
  ['Q', 'K', 'A']
];

interface AskCardDialogProps {
  selectedSuit: Card['suit'];
  selectedRank: Card['rank'];
  onSuitChange: (suit: Card['suit']) => void;
  onRankChange: (rank: Card['rank']) => void;
  onAsk: () => void;
  onCancel: () => void;
  canAsk: boolean;
  isAsking: boolean;
  errorMessage: string;
  playerHand: Card[];
}

const AskCardDialog: React.FC<AskCardDialogProps> = ({
  selectedSuit,
  selectedRank,
  onSuitChange,
  onRankChange,
  onAsk,
  onCancel,
  canAsk,
  isAsking,
  errorMessage,
  playerHand,
}) => {
  const isRedSuit = (suit: Card['suit']) => suit === 'hearts' || suit === 'diamonds';

  const hasCardAlready = playerHand.some(
    card => card.suit === selectedSuit && card.rank === selectedRank
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="w-80 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3">
          <h2 className="text-white font-semibold">YOUR TURN</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Suit Selection - 2x2 grid */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Select Suit</h4>
            <div className="grid grid-cols-2 gap-2">
              {suits.map(suit => (
                <Button
                  key={suit}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "rounded h-10 justify-center gap-2",
                    selectedSuit === suit && "ring-2 ring-offset-1 ring-gray-700"
                  )}
                  onClick={() => onSuitChange(suit)}
                >
                  <span
                    className="text-xl leading-none"
                    style={{ color: isRedSuit(suit) ? '#ef4444' : '#000000' }}
                  >
                    {suitIcons[suit]}
                  </span>
                  <span className="capitalize text-xs">{suit}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Rank Selection - Keypad style */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Select Rank</h4>
            <div className="space-y-2">
              {/* Low half-suit: 2-7 */}
              <div className="border border-gray-300 rounded-lg p-1.5 space-y-1">
                {rankRows.slice(0, 2).map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-3 gap-1">
                    {row.map(rank => (
                      <Button
                        key={rank}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded h-9 font-medium",
                          selectedRank === rank && "ring-2 ring-offset-1 ring-gray-700"
                        )}
                        onClick={() => onRankChange(rank)}
                      >
                        {rank}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
              {/* High half-suit: 9-A */}
              <div className="border border-gray-300 rounded-lg p-1.5 space-y-1">
                {rankRows.slice(2, 4).map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-3 gap-1">
                    {row.map(rank => (
                      <Button
                        key={rank}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded h-9 font-medium",
                          selectedRank === rank && "ring-2 ring-offset-1 ring-gray-700"
                        )}
                        onClick={() => onRankChange(rank)}
                      >
                        {rank}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="text-xs p-2 rounded" style={{ color: colors.red, backgroundColor: `${colors.red}15` }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
          {hasCardAlready && (
            <div className="text-xs text-center" style={{ color: colors.red }}>
              You have this card already!
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={onAsk}
              disabled={!canAsk || isAsking || hasCardAlready}
              size="sm"
              className="flex-1 rounded"
            >
              {isAsking ? 'Asking...' : 'Ask'}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="rounded"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskCardDialog;
