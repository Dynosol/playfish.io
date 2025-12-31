import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Shuffle, ArrowDownUp } from 'lucide-react';
import leaveIcon from '@/assets/leave.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { colors } from '@/utils/colors';
import type { Game, Card } from '@/firebase/gameService';
import type { Lobby } from '@/firebase/lobbyService';

const suitIcons: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

const HalfsuitsGrid: React.FC<{ completedHalfsuits: Card['halfSuit'][] }> = ({ completedHalfsuits }) => {
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;

  return (
    <div className="grid grid-cols-4 gap-1">
      {suits.map(suit => {
        const isRed = suit === 'hearts' || suit === 'diamonds';
        const suitColor = isRed ? '#ef4444' : '#000000';

        return (['low', 'high'] as const).map(level => {
          const halfsuit = `${level}-${suit}` as Card['halfSuit'];
          const isCompleted = completedHalfsuits.includes(halfsuit);

          return (
            <div
              key={halfsuit}
              className={cn(
                "flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[10px] border",
                isCompleted
                  ? "bg-gray-100 border-gray-300"
                  : "bg-gray-50 border-gray-200 opacity-40"
              )}
            >
              <span className={cn(isCompleted ? "font-medium" : "text-gray-500")}>
                {level === 'low' ? 'L' : 'H'}
              </span>
              <span
                style={{ color: suitColor }}
                className="text-xs leading-none"
              >
                {suitIcons[suit]}
              </span>
            </div>
          );
        });
      })}
    </div>
  );
};

interface GameInfoSheetProps {
  game: Game;
  lobby: Lobby;
  user: { uid: string } | null;
  isHost: boolean;
  isPlayer: boolean;
  isMyTurn: boolean;
  isInDeclarePhase: boolean;
  isGameOver: boolean;
  isDeclaring: boolean;
  declareError: string;
  onLeaveGame: () => void;
  onReturnToLobby: () => void;
  onDeclare: () => void;
  onAsk: () => void;
  isPlayerAlive: boolean;
  onShuffle?: () => void;
  onSort?: () => void;
  sortToast?: { message: string; visible: boolean };
}

export const GameInfoSheet: React.FC<GameInfoSheetProps> = ({
  game,
  lobby,
  user,
  isHost,
  isPlayer,
  isMyTurn,
  isInDeclarePhase,
  isGameOver,
  isDeclaring,
  declareError,
  onLeaveGame,
  onReturnToLobby,
  onDeclare,
  onAsk,
  isPlayerAlive,
  onShuffle,
  onSort,
  sortToast,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-gray-50"
      >
        <span className="text-sm font-semibold">Game Info</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {/* Expandable Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="p-2 space-y-2 border-t">
          {/* Score */}
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-500 font-semibold">Red:</span>
              <span className="text-lg font-bold">{game.scores?.[0] || 0}</span>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-blue-500 font-semibold">Blue:</span>
              <span className="text-lg font-bold">{game.scores?.[1] || 0}</span>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-muted-foreground">Room:</span>{' '}
              <span className="font-medium">{lobby.name}</span>
            </div>
            <div className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-muted-foreground">Players:</span>{' '}
              <span className="font-medium">{game.players.length}</span>
            </div>
            {user && (game.teams[user.uid] === 0 || game.teams[user.uid] === 1) && (
              <div className="bg-gray-50 px-2 py-1 rounded flex items-center gap-1">
                <span className="text-muted-foreground">Team:</span>
                <Badge
                  className="text-[10px] px-1 py-0 h-4 text-white border-none"
                  style={{ backgroundColor: game.teams[user.uid] === 0 ? '#ef4444' : '#3b82f6' }}
                >
                  {game.teams[user.uid] === 0 ? 'Red Team' : 'Blue Team'}
                </Badge>
              </div>
            )}
          </div>

          {/* Halfsuits */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Completed Halfsuits</div>
            <HalfsuitsGrid completedHalfsuits={game.completedHalfsuits} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isPlayer && !isGameOver && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={onAsk}
                          disabled={!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer}
                          size="sm"
                          className={cn(
                            "text-xs h-8 font-semibold transition-all relative",
                            (!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer)
                              ? "opacity-70 cursor-not-allowed before:absolute before:left-2 before:right-2 before:top-1/2 before:h-[2px] before:bg-current before:-translate-y-1/2"
                              : "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                          )}
                        >
                          ASK
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {(!isMyTurn || isInDeclarePhase) && (
                      <TooltipContent>
                        <p>It is not your turn</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={onDeclare}
                          disabled={isDeclaring || isInDeclarePhase || !isPlayer || !isPlayerAlive}
                          size="sm"
                          className={cn(
                            "text-xs h-8 font-semibold transition-all text-white relative",
                            (isDeclaring || isInDeclarePhase || !isPlayerAlive)
                              ? "opacity-70 cursor-not-allowed before:absolute before:left-2 before:right-2 before:top-1/2 before:h-[2px] before:bg-current before:-translate-y-1/2"
                              : "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                          )}
                          style={{ backgroundColor: colors.purple }}
                        >
                          {isDeclaring ? 'STARTING...' : 'DECLARE'}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!isPlayerAlive
                          ? 'You have no cards'
                          : isInDeclarePhase
                            ? 'Declaration in progress'
                            : 'Are you sure?'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            <button
              onClick={onLeaveGame}
              disabled={!!game.leftPlayer || isGameOver}
              className="flex items-center gap-1 text-xs font-medium underline hover:opacity-70 transition-opacity disabled:opacity-50"
              style={{ color: colors.red }}
            >
              <img src={leaveIcon} alt="Leave" className="h-3 w-3" />
              Leave
            </button>
            {isHost && (
              <button
                onClick={onReturnToLobby}
                className="flex items-center gap-1 text-xs font-medium underline hover:opacity-70 transition-opacity"
                style={{ color: colors.blue }}
              >
                <RotateCcw className="h-3 w-3" />
                Return All
              </button>
            )}
          </div>

          {/* Card Organization */}
          {isPlayer && onShuffle && onSort && (
            <div className="relative pt-2 border-t mt-2">
              {sortToast && (
                <div className={cn(
                  "absolute -top-1 left-0 right-0 text-center bg-black/80 text-white text-xs px-2 py-1 rounded-full transition-opacity duration-200 pointer-events-none -translate-y-full",
                  sortToast.visible ? "opacity-100" : "opacity-0"
                )}>
                  {sortToast.message}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-white border border-gray-200 hover:bg-gray-50"
                  onClick={onSort}
                  title="Sort cards"
                >
                  <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                  Sort
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-white border border-gray-200 hover:bg-gray-50"
                  onClick={onShuffle}
                  title="Shuffle cards"
                >
                  <Shuffle className="h-3.5 w-3.5 mr-1" />
                  Shuffle
                </Button>
              </div>
            </div>
          )}

          {declareError && (
            <div className="text-xs text-destructive">{declareError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInfoSheet;
