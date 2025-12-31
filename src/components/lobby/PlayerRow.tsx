import React from 'react';
import { Crown } from 'lucide-react';
import swapIcon from '@/assets/swap.png';

interface PlayerRowProps {
  playerId: string;
  index: number;
  isCurrentUser: boolean;
  isHost: boolean;
  isPlayerHost: boolean;
  showSwap?: boolean;
  onSwapTeam?: (playerId: string) => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  playerId,
  index,
  isCurrentUser,
  isHost,
  isPlayerHost,
  showSwap = false,
  onSwapTeam,
  getUsername,
  getUserColor,
}) => {
  return (
    <tr>
      <td className="py-2 pr-2 text-base text-black font-bold w-6">{index + 1}</td>
      <td className="py-2" colSpan={2}>
        <div className="inline-flex items-center bg-white px-3 py-2 rounded shadow-sm">
          <span className="text-base font-semibold" style={{ color: getUserColor(playerId) }}>
            {isCurrentUser ? 'You' : getUsername(playerId)}
          </span>
          {isPlayerHost && (
            <Crown className="h-3.5 w-3.5 text-yellow-400 ml-1.5" />
          )}
          {showSwap && isHost && !isCurrentUser && onSwapTeam && (
            <button
              onClick={() => onSwapTeam(playerId)}
              className="p-1 hover:bg-gray-100 transition-colors ml-1.5 rounded"
            >
              <img src={swapIcon} alt="Swap" className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

interface EmptyRowProps {
  index: number;
}

export const EmptyRow: React.FC<EmptyRowProps> = ({ index }) => {
  return (
    <tr className="border-b border-gray-100 last:border-b-0">
      <td className="py-2 pr-2 text-base text-black font-bold w-6">{index + 1}</td>
      <td className="py-2 text-base text-gray-300 italic" colSpan={2}>Empty</td>
    </tr>
  );
};

export default PlayerRow;
