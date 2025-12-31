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
  userId?: string;
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
  userId,
}) => {
  const myHandSize = userId ? playerHands[userId]?.length || 0 : 0;
  const myTeam = userId ? teams[userId] : undefined;
  const isMeCurrentTurn = userId && currentTurn === userId;

  return (
    <div className="grid grid-cols-2 gap-2 p-2 pb-6">
      {/* Current user "You" card */}
      {userId && myTeam !== undefined && (
        <div
          className={cn(
            'p-2 rounded flex items-center gap-2 text-left',
            isMeCurrentTurn ? 'border-2' : 'border'
          )}
          style={isMeCurrentTurn ? { borderColor: myTeam === 0 ? '#ef4444' : '#3b82f6' } : undefined}
        >
          {/* Avatar */}
          <div
            className={cn(
              'w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0',
              isMeCurrentTurn && 'ring-2'
            )}
            style={isMeCurrentTurn ? { '--tw-ring-color': myTeam === 0 ? '#ef4444' : '#3b82f6' } as React.CSSProperties : undefined}
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: getUserColor(userId) }}
              >
                You
              </span>
              <span className="text-sm" style={{ color: myTeam === 0 ? '#ef4444' : '#3b82f6' }}> ({myTeam === 0 ? 'Red' : 'Blue'})</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {myHandSize} card{myHandSize !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

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
              'p-2 rounded flex items-center gap-2 text-left transition-colors',
              isCurrentTurn ? 'border-2' : 'border',
              isClickable && 'cursor-pointer hover:bg-gray-100 active:bg-gray-200'
            )}
            style={isCurrentTurn ? { borderColor: teams[playerId] === 0 ? '#ef4444' : '#3b82f6' } : undefined}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0',
                isCurrentTurn && 'ring-2'
              )}
              style={isCurrentTurn ? { '--tw-ring-color': teams[playerId] === 0 ? '#ef4444' : '#3b82f6' } as React.CSSProperties : undefined}
            >
              <User className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: getUserColor(playerId) }}
                >
                  {getUsername(playerId)}
                </span>
                <span className="text-sm" style={{ color: teams[playerId] === 0 ? '#ef4444' : '#3b82f6' }}> ({teams[playerId] === 0 ? 'Red' : 'Blue'})</span>
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
