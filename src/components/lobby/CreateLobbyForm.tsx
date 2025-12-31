import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { colors } from '@/utils/colors';
import { containsProfanity } from '@/utils/profanityFilter';
import type { Lobby } from '@/firebase/lobbyService';

// Must match cloud function MAX_LOBBY_NAME_LENGTH
const MAX_LOBBY_NAME_LENGTH = 30;

const sanitizeLobbyName = (name: string): string => {
  // Trim whitespace and collapse multiple spaces
  return name.trim().replace(/\s+/g, ' ');
};

const validateLobbyName = (name: string): string | null => {
  const sanitized = sanitizeLobbyName(name);
  // Empty name is valid - server will use auto-generated lobby ID as name
  if (!sanitized) {
    return null;
  }
  if (sanitized.length > MAX_LOBBY_NAME_LENGTH) {
    return `Lobby name must be ${MAX_LOBBY_NAME_LENGTH} characters or less`;
  }
  if (containsProfanity(sanitized)) {
    return 'Lobby name contains inappropriate language';
  }
  return null;
};

interface CreateLobbyFormProps {
  currentLobby: Lobby | null;
  onCreateLobby: (name: string, maxPlayers: number, isPrivate: boolean) => Promise<void>;
}

const CreateLobbyForm: React.FC<CreateLobbyFormProps> = ({
  currentLobby,
  onCreateLobby,
}) => {
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyNameError, setLobbyNameError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<string>("4");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLobbyNameError('');

    if (currentLobby) return;

    const validationError = validateLobbyName(lobbyName);
    if (validationError) {
      setLobbyNameError(validationError);
      return;
    }

    setCreating(true);

    try {
      await onCreateLobby(sanitizeLobbyName(lobbyName), parseInt(maxPlayers), isPrivate);
    } catch (error) {
      console.error('Error creating lobby:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardDescription className="text-black font-semibold">Create Game</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="lobbyName" className="text-sm font-medium">Lobby name</label>
              <TooltipProvider>
                <Tooltip open={sanitizeLobbyName(lobbyName).length > MAX_LOBBY_NAME_LENGTH}>
                  <TooltipTrigger asChild>
                    <input
                      id="lobbyName"
                      type="text"
                      className={`w-40 px-2 py-1 border rounded text-sm outline-none ${
                        lobbyNameError || sanitizeLobbyName(lobbyName).length > MAX_LOBBY_NAME_LENGTH
                          ? 'border-red-500'
                          : 'border-gray-300 focus:border-gray-400'
                      }`}
                      placeholder="(optional)"
                      value={lobbyName}
                      maxLength={MAX_LOBBY_NAME_LENGTH + 5}
                      onChange={(e) => {
                        setLobbyName(e.target.value);
                        if (lobbyNameError) setLobbyNameError('');
                      }}
                      disabled={creating || !!currentLobby}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-red-500 text-white">
                    <p>Choose a shorter name!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {lobbyNameError && (
              <p className="text-xs text-red-500 text-right">{lobbyNameError}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="maxPlayers" className="text-sm font-medium">Number of players</label>
            <select
              id="maxPlayers"
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              disabled={creating || !!currentLobby}
            >
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="isPrivate" className="text-sm font-medium">Private room</label>
            <button
              id="isPrivate"
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isPrivate ? 'bg-purple-600' : 'bg-gray-300'
              }`}
              disabled={creating || !!currentLobby}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPrivate ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0">
          <Button
            className="w-full rounded text-white"
            style={{ backgroundColor: currentLobby ? '#9ca3af' : colors.purple }}
            type="submit"
            disabled={creating || !!currentLobby}
          >
            {creating ? 'Creating...' : currentLobby?.status === 'playing' ? 'You are currently in a game' : currentLobby ? 'You are currently in a lobby' : 'Create Lobby'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CreateLobbyForm;
