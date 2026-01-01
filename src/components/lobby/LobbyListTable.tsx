import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { colors } from '@/utils/colors';
import type { Lobby } from '@/firebase/lobbyService';
import type { Game } from '@/firebase/gameService';
import type { User } from 'firebase/auth';

const formatCreatedDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return 'Unknown';

  const locale = navigator.language || 'en-US';
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

interface LobbyListTableProps {
  lobbies: Lobby[];
  currentLobby: Lobby | null;
  currentGame: Game | null;
  user: User | null;
  joining: string | null;
  isReturning: boolean;
  onJoinGame: (lobbyId: string) => void;
  onSpectate: (lobbyId: string, status: string) => void;
  onReturnToGame: (lobbyId: string) => void;
  getHostUsername: (hostId: string) => string;
  getHostColor: (hostId: string) => string;
}

const LobbyListTable: React.FC<LobbyListTableProps> = ({
  lobbies,
  currentLobby,
  currentGame,
  user,
  joining,
  isReturning,
  onJoinGame,
  onSpectate,
  onReturnToGame,
  getHostUsername,
  getHostColor,
}) => {
  // Check if user has left their current game
  const hasUserLeftGame = currentGame?.leftPlayer?.odId === user?.uid;

  return (
    <Card>
      <CardContent className="p-0 max-h-[24rem] overflow-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {lobbies.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No active lobbies found. Create one to get started!
          </div>
        ) : (
          <TooltipProvider delayDuration={300}>
          <Table className="min-w-[500px]">
            <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
              <TableRow className="h-8 text-xs sm:text-sm">
                <TableHead className="py-1 whitespace-nowrap bg-white">Lobby Name</TableHead>
                <TableHead className="py-1 whitespace-nowrap bg-white">Host</TableHead>
                <TableHead className="py-1 whitespace-nowrap bg-white">Players</TableHead>
                <TableHead className="py-1 whitespace-nowrap bg-white">Status</TableHead>
                <TableHead className="py-1 text-right whitespace-nowrap bg-white">Action</TableHead>
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
                  <Tooltip key={lobby.id}>
                    <TooltipTrigger asChild>
                    <TableRow className={`h-8 ${isInThisLobby ? 'bg-gray-100' : ''}`}>
                    <TableCell className="py-1 font-medium whitespace-nowrap">{lobby.name}</TableCell>
                    <TableCell className="py-1 whitespace-nowrap">
                      <span className="font-semibold" style={{ color: getHostColor(lobby.createdBy) }}>
                        {getHostUsername(lobby.createdBy)}
                      </span>
                    </TableCell>
                    <TableCell className="py-1 whitespace-nowrap">
                      {lobby.players?.length || 0}/{lobby.maxPlayers || 4}
                    </TableCell>
                    <TableCell className="py-1 whitespace-nowrap">
                      {lobby.stale && lobby.status === 'waiting' ? (
                        <Badge
                          className="font-normal text-white"
                          style={{ backgroundColor: colors.grayMedium }}
                        >
                          Stale
                        </Badge>
                      ) : lobby.status === 'waiting' ? (
                        <Badge
                          className="font-normal text-white"
                          style={{ backgroundColor: colors.purple }}
                        >
                          {isFull ? 'Waiting to start' : 'Waiting for players'}
                        </Badge>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-400 text-white">
                          In Progress
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1 text-right whitespace-nowrap">
                      {isInThisLobby ? (
                        hasUserLeftGame && lobby.status === 'playing' ? (
                          <Button
                            size="sm"
                            className="h-6 w-20 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={() => onReturnToGame(lobby.id)}
                            disabled={isReturning}
                          >
                            {isReturning ? '...' : 'Return'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-6 w-20 rounded bg-green-700 hover:bg-green-800 text-white text-xs"
                            onClick={() => onSpectate(lobby.id, lobby.status)}
                          >
                            Return
                          </Button>
                        )
                      ) : canJoin ? (
                        <button
                          className="underline hover:opacity-70 disabled:opacity-50"
                          onClick={() => onJoinGame(lobby.id)}
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
                          onClick={() => onSpectate(lobby.id, lobby.status)}
                        >
                          Spectate
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Created: {formatCreatedDate(lobby.createdAt)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TableBody>
          </Table>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
};

export default LobbyListTable;
