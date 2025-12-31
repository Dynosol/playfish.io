import React from 'react';
import { Button } from "@/components/ui/button";
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SelectOpponentDialogProps {
  opponents: string[];
  teams: { [playerId: string]: 0 | 1 };
  playerHands: { [playerId: string]: unknown[] };
  onSelectOpponent: (playerId: string) => void;
  onCancel: () => void;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
}

const SelectOpponentDialog: React.FC<SelectOpponentDialogProps> = ({
  opponents,
  teams,
  playerHands,
  onSelectOpponent,
  onCancel,
  getUsername,
  getUserColor,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="w-80 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3">
          <h2 className="text-white font-semibold">SELECT OPPONENT</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-600 mb-3">Choose an opponent to ask for a card:</p>

          {opponents.map((playerId) => {
            const handSize = playerHands[playerId]?.length || 0;
            const teamColor = teams[playerId] === 0 ? '#ef4444' : '#3b82f6';
            const teamName = teams[playerId] === 0 ? 'Red' : 'Blue';

            return (
              <button
                key={playerId}
                onClick={() => onSelectOpponent(playerId)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 flex items-center gap-3 text-left transition-all",
                  "hover:bg-gray-50 active:bg-gray-100"
                )}
                style={{ borderColor: teamColor }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"
                  style={{ borderColor: teamColor }}
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: getUserColor(playerId) }}>
                    {getUsername(playerId)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span style={{ color: teamColor }}>{teamName} Team</span>
                    {' · '}
                    {handSize} card{handSize !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="w-full rounded"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectOpponentDialog;
