import React from 'react';
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Game } from '@/firebase/gameService';
import { getTeamPlayers } from '@/firebase/gameService';

interface GameOverCardProps {
  game: Game;
  winningTeam: 0 | 1;
  userId: string | undefined;
  isHost: boolean;
  replayVoteCount: number;
  nonHostPlayersCount: number;
  hasVotedForReplay: boolean;
  onReplay: () => void;
  onVoteForReplay: () => void;
  onReturnToLobby: () => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const GameOverCard: React.FC<GameOverCardProps> = ({
  game,
  winningTeam,
  userId,
  isHost,
  replayVoteCount,
  nonHostPlayersCount,
  hasVotedForReplay,
  onReplay,
  onVoteForReplay,
  onReturnToLobby,
  getUsername,
  getUserColor,
}) => {
  const winnerContent = (
    <>
      <h2 className="text-xl lg:text-2xl font-bold text-center mb-3">
        <span style={{ color: winningTeam === 0 ? '#ef4444' : '#3b82f6' }}>
          {winningTeam === 0 ? 'RED TEAM' : 'BLUE TEAM'}
        </span>
        {' WINS!'}
      </h2>
      <div className="mb-3">
        <h3 className="font-semibold mb-2 text-sm">Winning Team:</h3>
        <ul className="text-sm space-y-1">
          {getTeamPlayers(game, winningTeam).map(playerId => (
            <li key={playerId}>
              {playerId === userId ? (
                <span className="font-semibold italic" style={{ color: getUserColor(playerId) }}>You</span>
              ) : (
                <span className="font-semibold" style={{ color: getUserColor(playerId) }}>{getUsername(playerId)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        {isHost ? (
          <Button onClick={onReplay} size="sm" className="flex-1 rounded">
            Replay {nonHostPlayersCount > 0 ? `(${replayVoteCount}/${nonHostPlayersCount})` : ''}
          </Button>
        ) : (
          <Button onClick={onVoteForReplay} disabled={hasVotedForReplay} size="sm" className="flex-1 rounded">
            {hasVotedForReplay ? 'Voted' : 'Vote Replay'}
          </Button>
        )}
        <Button onClick={onReturnToLobby} variant="outline" size="sm" className="flex-1 rounded">
          Back to Lobby
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: Simple inline content */}
      <div className="lg:hidden p-4">
        {winnerContent}
      </div>

      {/* Desktop: Centered card overlay */}
      <div className="hidden lg:flex absolute inset-0 items-center justify-center z-30 p-4">
        <UICard className="w-full max-w-sm rounded shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center font-bold">
              <span style={{ color: winningTeam === 0 ? '#ef4444' : '#3b82f6' }}>
                {winningTeam === 0 ? 'RED TEAM' : 'BLUE TEAM'}
              </span>
              {' WINS!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">Winning Team:</h3>
              <ul className="text-sm space-y-1">
                {getTeamPlayers(game, winningTeam).map(playerId => (
                  <li key={playerId}>
                    {playerId === userId ? (
                      <span className="font-semibold italic" style={{ color: getUserColor(playerId) }}>You</span>
                    ) : (
                      <span className="font-semibold" style={{ color: getUserColor(playerId) }}>{getUsername(playerId)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              {isHost ? (
                <Button onClick={onReplay} size="sm" className="flex-1 rounded">
                  Replay {nonHostPlayersCount > 0 ? `(${replayVoteCount}/${nonHostPlayersCount})` : ''}
                </Button>
              ) : (
                <Button onClick={onVoteForReplay} disabled={hasVotedForReplay} size="sm" className="flex-1 rounded">
                  {hasVotedForReplay ? 'Voted' : 'Vote Replay'}
                </Button>
              )}
              <Button onClick={onReturnToLobby} variant="outline" size="sm" className="rounded">
                Back to Lobby
              </Button>
            </div>
          </CardContent>
        </UICard>
      </div>
    </>
  );
};

export default GameOverCard;
