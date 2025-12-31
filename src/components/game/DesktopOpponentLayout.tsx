import React from 'react';
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";
import OpponentHandVisual from './OpponentHandVisual';
import type { Game } from '@/firebase/gameService';

interface DesktopOpponentLayoutProps {
  allOtherPlayers: string[];
  opponents: string[];
  game: Game;
  userId?: string;
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
  userId,
  isMyTurn,
  isInDeclarePhase,
  onSelectOpponent,
  getUsername,
  getUserColor,
}) => {
  const myTeam = userId ? game.teams[userId] : undefined;
  const myHandSize = userId ? (game.playerHands[userId]?.length || 0) : 0;
  const myTeamColor = myTeam === 0 ? '#ef4444' : '#3b82f6';
  const myTeamName = myTeam === 0 ? 'Red Team' : 'Blue Team';

  return (
    <>
      {/* Other players in arc at top */}
      {allOtherPlayers.map((playerId, index) => {
        const position = getOpponentPosition(index, allOtherPlayers.length);
        const isCurrentTurn = game.currentTurn === playerId;
        const handSize = game.playerHands[playerId]?.length || 0;
        const isOpponent = opponents.includes(playerId);
        const isClickable = isMyTurn && !isInDeclarePhase && isOpponent;
        const teamColor = game.teams[playerId] === 0 ? '#ef4444' : '#3b82f6';

        return (
          <div
            key={playerId}
            className={cn(
              "absolute z-20 flex flex-col items-center p-2 rounded-lg transition-all",
              isClickable && "cursor-pointer hover:bg-muted/50"
            )}
            style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
            onClick={() => isClickable && onSelectOpponent(playerId)}
          >
            <div
              className={cn(
                "w-24 h-24 rounded-full bg-muted flex items-center justify-center transition-all",
                isCurrentTurn ? "border-4" : "border-2"
              )}
              style={{ borderColor: teamColor }}
            >
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="mt-2 text-center space-y-1">
              <div className="text-sm font-semibold" style={{ color: getUserColor(playerId) }}>
                {getUsername(playerId)} <span className="font-normal" style={{ color: teamColor }}>({game.teams[playerId] === 0 ? 'Red Team' : 'Blue Team'})</span>
              </div>
              <OpponentHandVisual count={handSize} />
            </div>
          </div>
        );
      })}

      {/* Current player at bottom (only show for players, not spectators) */}
      {userId && (
        <div
          className="absolute z-20 flex flex-col items-center"
          style={{ left: '50%', top: '60%', transform: 'translate(-50%, -50%)' }}
        >
          <div
            className={cn(
              "w-24 h-24 rounded-full bg-muted flex items-center justify-center",
              isMyTurn ? "border-4" : "border-2"
            )}
            style={{ borderColor: myTeamColor }}
          >
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="mt-2 text-center space-y-1">
            <div className="text-sm font-semibold" style={{ color: getUserColor(userId) }}>
              You <span className="font-normal" style={{ color: myTeamColor }}>({myTeamName})</span>
            </div>
            <OpponentHandVisual count={myHandSize} />
          </div>
        </div>
      )}
    </>
  );
};

export default DesktopOpponentLayout;
