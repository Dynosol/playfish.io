import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { subscribeToUser } from '../firebase/userService';
import { subscribeToLobby, subscribeToActiveLobbies, createLobby, joinLobby } from '../firebase/lobbyService';
import type { UserDocument } from '../firebase/userService';
import type { Lobby } from '../firebase/lobbyService';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Header from '@/components/Header';

const StartPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<string>("4");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

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

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !lobbyName.trim()) return;

    setCreating(true);
    
    try {
      const lobbyId = await createLobby({
        name: lobbyName,
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header type="home" />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Center: Lobby List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Open Lobbies</h2>
            </div>
            
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
                      <TableRow>
                        <TableHead>Lobby Name</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lobbies.map(lobby => {
                        const isFull = (lobby.players?.length || 0) >= (lobby.maxPlayers || 4);
                        const isInThisLobby = user && lobby.players?.includes(user.uid);
                        const isInActiveGame = currentLobby?.status === 'playing';
                        const canJoin = !isFull && lobby.status === 'waiting' && !isInThisLobby && !isInActiveGame;

                        return (
                          <TableRow key={lobby.id}>
                            <TableCell className="font-medium">{lobby.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {lobby.players?.length || 0}/{lobby.maxPlayers || 4}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={lobby.status === 'waiting' ? 'default' : 'secondary'}>
                                {lobby.status === 'waiting' ? 'Waiting' : 'In Progress'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {isInThisLobby ? (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleSpectate(lobby.id, lobby.status)}
                                >
                                  Return
                                </Button>
                              ) : canJoin ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinGame(lobby.id)}
                                  disabled={joining === lobby.id}
                                >
                                  {joining === lobby.id ? 'Joining...' : 'Join'}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleSpectate(lobby.id, lobby.status)}
                                >
                                  Spectate
                                </Button>
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
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Create Game</h2>
            <Card>
              <CardHeader>
                <CardTitle>New Lobby</CardTitle>
                <CardDescription>Set up a new game room for you and your friends.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateLobby}>
                <CardContent className="space-y-4">
                  {currentLobby?.status === 'playing' && (
                    <div className="text-sm text-destructive">
                      You cannot create a new lobby while in an active game.
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="lobbyName">Lobby Name</Label>
                    <Input
                      id="lobbyName"
                      placeholder="Enter lobby name"
                      value={lobbyName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLobbyName(e.target.value)}
                      required
                      disabled={creating || currentLobby?.status === 'playing'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPlayers">Max Players</Label>
                    <Select
                      value={maxPlayers}
                      onValueChange={setMaxPlayers}
                      disabled={creating || currentLobby?.status === 'playing'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select players" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Players</SelectItem>
                        <SelectItem value="6">6 Players</SelectItem>
                        <SelectItem value="8">8 Players</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" type="submit" disabled={creating || !lobbyName.trim() || currentLobby?.status === 'playing'}>
                    {creating ? 'Creating...' : 'Create Lobby'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StartPage;
