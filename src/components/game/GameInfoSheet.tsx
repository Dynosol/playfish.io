import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import leaveIcon from '@/assets/leave.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { colors } from '@/utils/colors';
import type { Game } from '@/firebase/gameService';
import type { Lobby } from '@/firebase/lobbyService';

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
  isPlayerAlive: boolean;
}

export const GameInfoSheet: React.FC<GameInfoSheetProps> = ({
  game,
  lobby,
  user,
  isHost,
  isPlayer,
  isMyTurn: _isMyTurn,
  isInDeclarePhase,
  isGameOver,
  isDeclaring,
  declareError,
  onLeaveGame,
  onReturnToLobby,
  onDeclare,
  isPlayerAlive,
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
                  className={cn(
                    'text-[10px] px-1 py-0 h-4 text-white border-none',
                    game.teams[user.uid] === 0 ? 'bg-red-500' : 'bg-blue-500'
                  )}
                >
                  {game.teams[user.uid] === 0 ? 'Red' : 'Blue'}
                </Badge>
              </div>
            )}
          </div>

          {/* Completed Halfsuits */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Completed Halfsuits</div>
            {game.completedHalfsuits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">None yet</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {game.completedHalfsuits.map((hs) => (
                  <Badge key={hs} variant="secondary" className="text-[10px]">
                    {hs}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {isPlayer && !isGameOver && (
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

          {declareError && (
            <div className="text-xs text-destructive">{declareError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInfoSheet;
