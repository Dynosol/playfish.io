import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import { subscribeToLobby, subscribeToActiveLobbies, createLobby, joinLobby } from '../firebase/lobbyService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Header from '@/components/Header';
import ChatBox from '@/components/ChatBox';

const StartPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyNameError, setLobbyNameError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<string>("4");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const hostUids = useMemo(() => lobbies.map(l => l.createdBy).filter(Boolean), [lobbies]);
  const hostUsersData = useUsers(hostUids);

  // Helper to get styled username for hosts
  const getHostUsername = (hostId: string) => hostUsersData.get(hostId)?.username || '...';
  const getHostColor = (hostId: string) => getUserColorHex(hostUsersData.get(hostId)?.color || 'slate');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setUserDoc(userData);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!userDoc?.currentLobbyId) {
      setCurrentLobby(null);
      return;
    }

    const unsubscribe = subscribeToLobby(userDoc.currentLobbyId, (lobby) => {
      setCurrentLobby(lobby);
    });

    return unsubscribe;
  }, [userDoc?.currentLobbyId]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveLobbies((lobbiesList) => {
      setLobbies(lobbiesList);
      setLoadingLobbies(false);
    });

    return unsubscribe;
  }, []);

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

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    setLobbyNameError('');

    if (!user) return;
    if (currentLobby) return;

    const validationError = validateLobbyName(lobbyName);
    if (validationError) {
      setLobbyNameError(validationError);
      return;
    }

    setCreating(true);

    try {
      const lobbyId = await createLobby({
        name: sanitizeLobbyName(lobbyName),
        createdBy: user.uid,
        maxPlayers: parseInt(maxPlayers)
      });
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Error creating lobby:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (lobbyId: string) => {
    if (!user) return;
    
    setJoining(lobbyId);
    try {
      await joinLobby(lobbyId, user.uid);
      navigate(`/lobby/${lobbyId}`);
    } catch (error) {
      console.error('Failed to join lobby:', error);
      setJoining(null);
    }
  };

  const handleSpectate = (lobbyId: string, status: string) => {
    if (status === 'playing') {
      navigate(`/game/${lobbyId}`);
    } else {
      navigate(`/lobby/${lobbyId}`);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header type="home" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Global Chat */}
        <div className="p-3 shrink-0">
          <ChatBox chatId="global" className="border border-gray-200" />
        </div>

        <main className="flex-1 overflow-y-auto p-3">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Center: Lobby List */}
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardContent className="p-0">
                {loadingLobbies ? (
                  <div className="p-8 text-center text-muted-foreground">Loading lobbies...</div>
                ) : lobbies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No active lobbies found. Create one to get started!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="py-1">Lobby Name</TableHead>
                        <TableHead className="py-1">Host</TableHead>
                        <TableHead className="py-1">Players</TableHead>
                        <TableHead className="py-1">Status</TableHead>
                        <TableHead className="py-1 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lobbies.map(lobby => {
                        const isFull = (lobby.players?.length || 0) >= (lobby.maxPlayers || 4);
                        const isInThisLobby = user && lobby.players?.includes(user.uid);
                        const isInAnotherLobby = currentLobby && !isInThisLobby;
                        const isInActiveGame = currentLobby?.status === 'playing';
                        const canJoin = !isFull && lobby.status === 'waiting' && !isInThisLobby && !isInAnotherLobby;
                        const blockedReason = isInActiveGame
                          ? 'You must leave your current game before joining another'
                          : isInAnotherLobby
                            ? 'You must leave your current lobby before joining another'
                            : null;

                        return (
                          <TableRow key={lobby.id} className={`h-8 ${isInThisLobby ? 'bg-gray-100' : ''}`}>
                            <TableCell className="py-1 font-medium">{lobby.name}</TableCell>
                            <TableCell className="py-1">
                              <span className="font-semibold" style={{ color: getHostColor(lobby.createdBy) }}>
                                {getHostUsername(lobby.createdBy)}
                              </span>
                            </TableCell>
                            <TableCell className="py-1">
                              {lobby.players?.length || 0}/{lobby.maxPlayers || 4}
                            </TableCell>
                            <TableCell className="py-1">
                              <Badge className={lobby.status === 'waiting' ? 'bg-purple-500 text-white hover:bg-purple-500 font-normal' : 'font-normal'} variant={lobby.status === 'waiting' ? 'default' : 'secondary'}>
                                {lobby.status === 'waiting' ? (isFull ? 'Waiting to start' : 'Waiting for players') : 'In Progress'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 text-right">
                              {isInThisLobby ? (
                                <Button
                                  size="sm"
                                  className="h-6 w-20 rounded bg-green-700 hover:bg-green-800 text-white text-xs"
                                  onClick={() => handleSpectate(lobby.id, lobby.status)}
                                >
                                  Return
                                </Button>
                              ) : canJoin ? (
                                <button
                                  className="underline hover:opacity-70 disabled:opacity-50"
                                  onClick={() => handleJoinGame(lobby.id)}
                                  disabled={joining === lobby.id}
                                >
                                  {joining === lobby.id ? 'Joining...' : 'Join'}
                                </button>
                              ) : blockedReason ? (
                                <span
                                  className="text-gray-400 underline cursor-not-allowed relative group"
                                  title={blockedReason}
                                >
                                  Join
                                  <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {blockedReason}
                                  </span>
                                </span>
                              ) : (
                                <button
                                  className="underline hover:opacity-70"
                                  onClick={() => handleSpectate(lobby.id, lobby.status)}
                                >
                                  Spectate
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Center: Create Game */}
          <div>
            <Card>
              <CardHeader>
                <CardDescription>Set up a new game room for you and your friends.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateLobby}>
                <CardContent className="space-y-4">
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
                <CardFooter>
                  <Button
                    className={currentLobby ? "w-full rounded bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed" : "w-full rounded bg-purple-500 hover:bg-purple-500/90 text-white"}
                    type="submit"
                    disabled={creating || !!currentLobby}
                  >
                    {creating ? 'Creating...' : currentLobby?.status === 'playing' ? 'You are currently in a game' : currentLobby ? 'You are currently in a lobby' : 'Create Lobby'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StartPage;
