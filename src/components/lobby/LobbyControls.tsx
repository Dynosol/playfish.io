import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import copyIcon from '@/assets/copy.png';
import randomizeIcon from '@/assets/randomize.png';
import leaveIcon from '@/assets/leave.png';
import trashIcon from '@/assets/trash.png';
import playIcon from '@/assets/play.png';
import { colors } from '@/utils/colors';

const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
`;

interface LobbyControlsProps {
  isHost: boolean;
  isInThisLobby: boolean;
  isWaiting: boolean;
  isPlaying: boolean;
  teamsEven: boolean;
  playerCount: number;
  copied: boolean;
  gameId: string;
  onStartLobby: () => void;
  onCopyInviteLink: () => void;
  onRandomizeTeams: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onNavigateToGame: () => void;
  onSpectateGame: () => void;
}

const LobbyControls: React.FC<LobbyControlsProps> = ({
  isHost,
  isInThisLobby,
  isWaiting,
  isPlaying,
  teamsEven,
  playerCount,
  copied,
  onStartLobby,
  onCopyInviteLink,
  onRandomizeTeams,
  onLeave,
  onDelete,
  onNavigateToGame,
  onSpectateGame,
}) => {
  const canStart = teamsEven && playerCount >= 2;

  // Host controls during waiting state
  if (isWaiting && isInThisLobby && isHost) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <button
          onClick={onStartLobby}
          disabled={!canStart}
          className="w-full relative overflow-hidden flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded"
          style={{
            backgroundColor: canStart ? colors.purple : '#e5e7eb',
            color: canStart ? 'white' : '#9ca3af',
            cursor: canStart ? 'pointer' : 'not-allowed'
          }}
        >
          {canStart && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
                backgroundSize: '300% 100%',
                animation: 'shimmer 3s linear infinite',
              }}
            />
          )}
          <img src={playIcon} alt="Play" className="h-3.5 w-3.5 relative z-10" />
          <span className="relative z-10">Start Game</span>
        </button>

        {!teamsEven && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: colors.red }}>
            <AlertCircle className="h-3.5 w-3.5" />
            Teams must be even to start
          </p>
        )}

        <div className="flex flex-wrap gap-2 sm:gap-4 bg-gray-50 p-2 sm:p-3 rounded shadow">
          <button
            onClick={onCopyInviteLink}
            className="flex items-center gap-1 text-sm text-black underline hover:opacity-70 transition-opacity whitespace-nowrap"
          >
            {copied ? <Check className="h-3 w-3" /> : <img src={copyIcon} alt="Copy" className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
          <button
            onClick={onRandomizeTeams}
            className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
            style={{ color: colors.blue }}
          >
            <img src={randomizeIcon} alt="Randomize" className="h-3.5 w-3.5" />
            Randomize Teams
          </button>
          <button
            onClick={onLeave}
            className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
            style={{ color: colors.red }}
          >
            <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
            Leave Lobby
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
            style={{ color: colors.red }}
          >
            <img src={trashIcon} alt="Delete" className="h-3.5 w-3.5" />
            Delete Lobby
          </button>
        </div>
      </>
    );
  }

  // Non-host controls during waiting state
  if (isWaiting && isInThisLobby && !isHost) {
    return (
      <div className="flex flex-wrap gap-2 sm:gap-4 bg-gray-50 p-2 sm:p-3 rounded shadow">
        <button
          onClick={onCopyInviteLink}
          className="flex items-center gap-1 text-sm text-black underline hover:opacity-70 transition-opacity whitespace-nowrap"
        >
          {copied ? <Check className="h-3 w-3" /> : <img src={copyIcon} alt="Copy" className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </button>
        <button
          onClick={onLeave}
          className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
          style={{ color: colors.red }}
        >
          <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
          Leave Lobby
        </button>
      </div>
    );
  }

  // Playing state - return to game
  if (isPlaying && isInThisLobby) {
    return (
      <button
        onClick={onNavigateToGame}
        className="w-full py-2 text-sm text-white font-medium transition-colors rounded hover:opacity-90"
        style={{ backgroundColor: colors.green }}
      >
        Return to game
      </button>
    );
  }

  // Playing state - spectate
  if (isPlaying && !isInThisLobby) {
    return (
      <button
        onClick={onSpectateGame}
        style={{ backgroundColor: colors.purple, color: 'white' }}
        className="w-full py-2 text-sm font-medium transition-colors rounded hover:opacity-90"
      >
        Spectate game
      </button>
    );
  }

  return null;
};

export default LobbyControls;
