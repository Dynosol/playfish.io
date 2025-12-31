import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { colors } from '@/utils/colors';
import type { Lobby } from '@/firebase/lobbyService';

const sanitizeLobbyName = (name: string): string => {
  // Trim whitespace and collapse multiple spaces
  return name.trim().replace(/\s+/g, ' ');
};

const validateLobbyName = (name: string): string | null => {
  const sanitized = sanitizeLobbyName(name);
  if (!sanitized) {
    return 'Please enter a lobby name';
  }
  if (sanitized.length < 2) {
    return 'Lobby name must be at least 2 characters';
  }
  if (sanitized.length > 30) {
    return 'Lobby name must be 30 characters or less';
  }
  return null;
};

interface CreateLobbyFormProps {
  currentLobby: Lobby | null;
  onCreateLobby: (name: string, maxPlayers: number) => Promise<void>;
}

const CreateLobbyForm: React.FC<CreateLobbyFormProps> = ({
  currentLobby,
  onCreateLobby,
}) => {
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyNameError, setLobbyNameError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<string>("4");
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
      await onCreateLobby(sanitizeLobbyName(lobbyName), parseInt(maxPlayers));
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
              <input
                id="lobbyName"
                type="text"
                className={`w-40 px-2 py-1 border rounded text-sm outline-none ${lobbyNameError ? 'border-red-500' : 'border-gray-300 focus:border-gray-400'}`}
                placeholder="Enter name"
                value={lobbyName}
                onChange={(e) => {
                  setLobbyName(e.target.value);
                  if (lobbyNameError) setLobbyNameError('');
                }}
                disabled={creating || !!currentLobby}
              />
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
