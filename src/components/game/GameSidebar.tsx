import React from 'react';
import { RotateCcw, Shuffle, ArrowDownUp } from 'lucide-react';
import leaveIcon from '@/assets/leave.png';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { colors } from '@/utils/colors';
import type { Game, Card } from '@/firebase/gameService';
import type { Lobby } from '@/firebase/lobbyService';
import type { User } from 'firebase/auth';

const suitIcons: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

const ALL_HALFSUITS: Card['halfSuit'][] = [
  'low-spades', 'high-spades',
  'low-hearts', 'high-hearts',
  'low-clubs', 'high-clubs',
  'low-diamonds', 'high-diamonds'
];

const HalfsuitsGrid: React.FC<{ completedHalfsuits: Card['halfSuit'][] }> = ({ completedHalfsuits }) => {
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;

  return (
    <div className="grid grid-cols-2 gap-1">
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
                "flex items-center gap-1 px-1.5 py-1 rounded text-xs border",
                isCompleted
                  ? "bg-gray-100 border-gray-300"
                  : "bg-gray-50 border-gray-200 opacity-40"
              )}
            >
              <span
                style={{ color: suitColor }}
                className="text-sm leading-none"
              >
                {suitIcons[suit]}
              </span>
              <span className={cn("capitalize", isCompleted ? "font-medium" : "text-gray-500")}>
                {level}
              </span>
            </div>
          );
        });
      })}
    </div>
  );
};

interface GameSidebarProps {
  game: Game;
  lobby: Lobby;
  user: User | null;
  isHost: boolean;
  isPlayer: boolean;
  isMyTurn: boolean;
  isInDeclarePhase: boolean;
  isGameOver: boolean;
  isDeclaring: boolean;
  declareError: string;
  isPlayerAlive: boolean;
  hasLeftPlayer: boolean;
  onLeaveGame: () => void;
  onReturnToLobby: () => void;
  onDeclare: () => void;
  onAsk: () => void;
  onShuffle?: () => void;
  onSort?: () => void;
  sortToast?: { message: string; visible: boolean };
}

const GameSidebar: React.FC<GameSidebarProps> = ({
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
  isPlayerAlive,
  hasLeftPlayer,
  onLeaveGame,
  onReturnToLobby,
  onDeclare,
  onAsk,
  onShuffle,
  onSort,
  sortToast,
}) => {
  return (
    <div className="bg-white rounded shadow">
      {/* Score Section */}
      <div className="p-3">
        <div className="text-sm font-semibold mb-2">Score</div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-red-500 uppercase tracking-wider font-semibold">Red</span>
            <span className="text-2xl font-bold">{game.scores?.[0] || 0}</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Blue</span>
            <span className="text-2xl font-bold">{game.scores?.[1] || 0}</span>
          </div>
        </div>
      </div>

      <div className="mx-3 border-t border-gray-200" />

      {/* Game Options Section */}
      <div className="p-3 space-y-2">
        <button
          onClick={onLeaveGame}
          disabled={hasLeftPlayer || isGameOver}
          className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: colors.red }}
        >
          <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
          Leave Game
        </button>
        {isHost && (
          <button
            onClick={onReturnToLobby}
            className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
            style={{ color: colors.blue }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Return All to Lobby
          </button>
        )}
      </div>

      <div className="mx-3 border-t border-gray-200" />

      {/* Game Info Section */}
      <div className="p-3 space-y-2">
        <div className="text-sm font-semibold">Game Info</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
            <span className="text-muted-foreground">Room:</span>
            <span className="font-medium">{lobby.name}</span>
          </div>
          <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
            <span className="text-muted-foreground">Players:</span>
            <span className="font-medium">{game.players.length}</span>
          </div>
          <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
            <span className="text-muted-foreground">Your Team:</span>
            <span className="font-medium">
              {user && game.teams[user.uid] === 0 ? 'Red Team' : user && game.teams[user.uid] === 1 ? 'Blue Team' : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-3 border-t border-gray-200" />

      {/* Completed Halfsuits Section */}
      <div className="p-3 space-y-2">
        <div className="text-sm font-semibold">Completed Halfsuits</div>
        <HalfsuitsGrid completedHalfsuits={game.completedHalfsuits} />
      </div>

      {/* Actions Section - at bottom */}
      {isPlayer && !isGameOver && (
        <>
          <div className="mx-3 border-t border-gray-200" />
          <div className="p-3 space-y-2">
            <div className="text-sm font-semibold">Available Actions</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button
                      onClick={onAsk}
                      disabled={!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer}
                      className={cn(
                        "w-full rounded font-semibold transition-all relative",
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
                  <div className="w-full">
                    <Button
                      onClick={onDeclare}
                      disabled={isDeclaring || isInDeclarePhase || !isPlayer || !isPlayerAlive}
                      className={cn(
                        "w-full rounded font-semibold transition-all text-white relative",
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
            {declareError && (
              <div className="text-xs text-destructive text-center">{declareError}</div>
            )}
            {/* Card Organization - Shuffle & Sort */}
            {onShuffle && onSort && (
              <div className="relative pt-2">
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
                    className="flex-1 h-8 bg-white border border-gray-200 hover:bg-gray-50"
                    onClick={onSort}
                    title="Sort cards"
                  >
                    <ArrowDownUp className="h-4 w-4 mr-1" />
                    Sort
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 h-8 bg-white border border-gray-200 hover:bg-gray-50"
                    onClick={onShuffle}
                    title="Shuffle cards"
                  >
                    <Shuffle className="h-4 w-4 mr-1" />
                    Shuffle
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GameSidebar;
