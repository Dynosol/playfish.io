import React from 'react';
import PlayerRow, { EmptyRow } from './PlayerRow';
import { colors } from '@/utils/colors';
import type { Lobby } from '@/firebase/lobbyService';

interface TeamPanelProps {
  team: 0 | 1;
  teamPlayers: string[];
  lobby: Lobby;
  userId: string | undefined;
  userTeam: 0 | 1 | null;
  isHost: boolean;
  isInThisLobby: boolean;
  onJoinTeam: (team: 0 | 1) => void;
  onSwapTeam: (playerId: string) => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const TeamPanel: React.FC<TeamPanelProps> = ({
  team,
  teamPlayers,
  lobby,
  userId,
  userTeam,
  isHost,
  isInThisLobby,
  onJoinTeam,
  onSwapTeam,
  getUsername,
  getUserColor,
}) => {
  const teamColor = team === 0 ? colors.red : colors.blue;
  const teamName = team === 0 ? 'Red Team' : 'Blue Team';
  const maxTeamSize = lobby.maxPlayers / 2;

  return (
    <div className="bg-gray-50 p-3 sm:p-4 pb-4 sm:pb-6 rounded shadow">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: `2px solid ${teamColor}` }}>
            <th className="py-2 text-left text-sm font-semibold" style={{ color: teamColor }} colSpan={2}>
              {teamName}
            </th>
            <th className="py-2 text-right">
              <span style={{ backgroundColor: teamColor, color: 'white', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px' }}>
                {teamPlayers.length}/{maxTeamSize}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(teamPlayers.length, maxTeamSize) }).map((_, index) => {
            const playerId = teamPlayers[index];
            return playerId ? (
              <PlayerRow
                key={playerId}
                playerId={playerId}
                index={index}
                isCurrentUser={playerId === userId}
                isHost={isHost}
                isPlayerHost={playerId === lobby.createdBy}
                showSwap
                onSwapTeam={onSwapTeam}
                getUsername={getUsername}
                getUserColor={getUserColor}
              />
            ) : (
              <EmptyRow key={`empty-${team}-${index}`} index={index} />
            );
          })}
        </tbody>
      </table>
      {userId && userTeam !== team && isInThisLobby && (
        <button
          onClick={() => onJoinTeam(team)}
          className="w-full mt-2 py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
          style={{ backgroundColor: teamColor }}
        >
          Join {teamName}
        </button>
      )}
    </div>
  );
};

export default TeamPanel;
