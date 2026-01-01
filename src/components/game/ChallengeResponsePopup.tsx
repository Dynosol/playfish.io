import React from 'react';
import { Button } from "@/components/ui/button";
import { colors } from '@/utils/colors';
import type { Card, ChallengePhase } from '@/firebase/gameService';

const suitIcons: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

interface ChallengeResponsePopupProps {
  challengePhase: ChallengePhase;
  challengerName: string;
  myResponse: 'pass' | 'declare' | null;
  timeRemaining: number;
  canDeclare: boolean; // whether player has cards in the half-suit
  onPass: () => void;
  onDeclare: () => void;
}

const ChallengeResponsePopup: React.FC<ChallengeResponsePopupProps> = ({
  challengePhase,
  challengerName,
  myResponse,
  timeRemaining,
  canDeclare,
  onPass,
  onDeclare,
}) => {
  const halfSuit = challengePhase.selectedHalfSuit;
  const [level, suit] = halfSuit.split('-') as [string, Card['suit']];
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const suitColor = isRed ? '#ef4444' : '#000000';

  const hasResponded = myResponse !== null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="w-80 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3" style={{ backgroundColor: colors.amber }}>
          <h2 className="text-white font-semibold">CHALLENGED!</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{challengerName}</span> has challenged your team to declare:
          </p>

          {/* Half-suit display */}
          <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-lg border">
            <span
              style={{ color: suitColor }}
              className="text-3xl leading-none"
            >
              {suitIcons[suit]}
            </span>
            <span className="text-xl font-semibold capitalize text-gray-700">
              {level} {suit}
            </span>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="text-sm text-gray-500">Time remaining</div>
            <div
              className="text-2xl font-bold"
              style={{ color: timeRemaining <= 10 ? '#ef4444' : colors.amber }}
            >
              {timeRemaining}s
            </div>
          </div>

          {hasResponded ? (
            <div className="text-center py-3 bg-gray-100 rounded-lg">
              <div className="text-sm text-gray-500">You have responded</div>
              <div className="font-semibold text-gray-700 capitalize">{myResponse}</div>
              <div className="text-xs text-gray-400 mt-1">Waiting for teammates...</div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={onDeclare}
                disabled={!canDeclare}
                className="w-full rounded font-semibold text-white"
                style={{ backgroundColor: canDeclare ? colors.purple : '#9ca3af' }}
              >
                {canDeclare ? 'DECLARE' : 'NO CARDS IN HALF-SUIT'}
              </Button>
              <Button
                onClick={onPass}
                variant="outline"
                className="w-full rounded font-semibold"
              >
                PASS
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeResponsePopup;
