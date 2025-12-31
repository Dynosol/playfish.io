import React from 'react';
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";
import OpponentHandVisual from './OpponentHandVisual';
import type { Game } from '@/firebase/gameService';

interface DesktopOpponentLayoutProps {
  allOtherPlayers: string[];
  opponents: string[];
  game: Game;
  isMyTurn: boolean;
  isInDeclarePhase: boolean;
  onSelectOpponent: (playerId: string) => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const getOpponentPosition = (index: number, total: number) => {
  if (total === 0) return { left: '50%', top: '50%' };
  if (total === 1) {
    return { left: '50%', top: '30%' };
  }
  // Spread across 160 degrees (wider arc) for more spacing
  const arcSpread = Math.min(160, 40 * total);
  const step = arcSpread / (total - 1);
  const startAngle = 270 - arcSpread / 2; // Center the arc at top
  const angleDeg = startAngle + (index * step);
  const angleRad = (angleDeg * Math.PI) / 180;
  // Larger radius for more spread, responsive to number of players
  const radius = Math.min(35, 25 + total * 2);
  const centerX = 50;
  const centerY = 50;
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);
  return { left: `${x}%`, top: `${y}%` };
};

const DesktopOpponentLayout: React.FC<DesktopOpponentLayoutProps> = ({
  allOtherPlayers,
  opponents,
  game,
  isMyTurn,
  isInDeclarePhase,
  onSelectOpponent,
  getUsername,
  getUserColor,
}) => {
  return (
    <>
      {allOtherPlayers.map((playerId, index) => {
        const position = getOpponentPosition(index, allOtherPlayers.length);
        const isCurrentTurn = game.currentTurn === playerId;
        const handSize = game.playerHands[playerId]?.length || 0;
        const isOpponent = opponents.includes(playerId);
        const isClickable = isMyTurn && !isInDeclarePhase && isOpponent;

        return (
          <div
            key={playerId}
            className="absolute z-20 flex flex-col items-center"
            style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
          >
            <div
              className={cn(
                "w-24 h-24 rounded-full bg-muted border-4 flex items-center justify-center transition-all",
                isClickable ? "cursor-pointer hover:bg-muted/80" : "cursor-not-allowed opacity-60"
              )}
              style={{ borderColor: isCurrentTurn ? '#16a34a' : (game.teams[playerId] === 0 ? '#ef4444' : '#3b82f6') }}
              onClick={() => isClickable && onSelectOpponent(playerId)}
            >
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="mt-2 text-center space-y-1">
              <div className="text-sm font-semibold" style={{ color: getUserColor(playerId) }}>
                {getUsername(playerId)} <span className="font-normal" style={{ color: game.teams[playerId] === 0 ? '#ef4444' : '#3b82f6' }}>({game.teams[playerId] === 0 ? 'Red Team' : 'Blue Team'})</span>
              </div>
              <OpponentHandVisual count={handSize} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default DesktopOpponentLayout;
