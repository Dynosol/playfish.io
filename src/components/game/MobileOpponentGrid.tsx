import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOpponentGridProps {
  opponents: string[];
  allOtherPlayers: string[];
  currentTurn: string;
  teams: { [playerId: string]: 0 | 1 };
  playerHands: { [playerId: string]: unknown[] };
  isMyTurn: boolean;
  isInDeclarePhase: boolean;
  onSelectOpponent: (playerId: string) => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

export const MobileOpponentGrid: React.FC<MobileOpponentGridProps> = ({
  opponents,
  allOtherPlayers,
  currentTurn,
  teams,
  playerHands,
  isMyTurn,
  isInDeclarePhase,
  onSelectOpponent,
  getUsername,
  getUserColor,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {allOtherPlayers.map((playerId) => {
        const isCurrentTurn = currentTurn === playerId;
        const handSize = playerHands[playerId]?.length || 0;
        const isOpponent = opponents.includes(playerId);
        const isClickable = isMyTurn && !isInDeclarePhase && isOpponent;

        return (
          <button
            key={playerId}
            onClick={() => isClickable && onSelectOpponent(playerId)}
            disabled={!isClickable}
            className={cn(
              'p-2 rounded border flex items-center gap-2 text-left transition-colors',
              isCurrentTurn && 'border-green-500 border-2',
              isClickable
                ? 'cursor-pointer hover:bg-gray-100 active:bg-gray-200'
                : 'cursor-default opacity-60'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0',
                isCurrentTurn && 'ring-2 ring-green-500'
              )}
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: getUserColor(playerId) }}
                >
                  {getUsername(playerId)} <span style={{ color: teams[playerId] === 0 ? '#ef4444' : '#3b82f6' }}>({teams[playerId] === 0 ? 'Red Team' : 'Blue Team'})</span>
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {handSize} card{handSize !== 1 ? 's' : ''}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MobileOpponentGrid;
