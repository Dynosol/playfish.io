import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, Shuffle, ArrowDownUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '@/components/Header';
import {
  subscribeToGame,
  getPlayerHand,
  getTeamPlayers,
  getOpponents,
  askForCard,
  belongsToHalfSuit,
  getHalfSuitFromCard,
  getAllCardsInHalfSuit,
  getCardKey,
  isPlayerAlive,
  startDeclaration,
  finishDeclaration,
  voteForReplay,
  type Card
} from '../firebase/gameService';
import { subscribeToLobby, returnToLobby, replayGame } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import cardBack from '../assets/cards/card_back.svg';
import ChatBox from '../components/ChatBox';
import { useUsernames } from '../hooks/useUsername';
import CardImage from '../components/CardImage';
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [selectedSuit, setSelectedSuit] = useState<Card['suit']>('spades');
  const [selectedRank, setSelectedRank] = useState<Card['rank']>('A');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAsking, setIsAsking] = useState(false);
  const [declareError, setDeclareError] = useState<string>('');
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [declarationHalfSuit, setDeclarationHalfSuit] = useState<Card['halfSuit'] | null>(null);
  const [declarationTeam, setDeclarationTeam] = useState<0 | 1 | null>(null);
  const [declarationAssignments, setDeclarationAssignments] = useState<{ [cardKey: string]: string }>({});
  const [localPlayerHand, setLocalPlayerHand] = useState<Card[]>([]);
  const [sortMethod, setSortMethod] = useState<'rank_asc' | 'rank_desc' | 'suit_rank_asc' | 'suit_rank_desc'>('suit_rank_asc');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  useEffect(() => {
    if (!gameId) return;

    let gameUnsubscribe: (() => void) | null = null;

    const lobbyUnsubscribe = subscribeToLobby(gameId, (lobbyData) => {
      setLobby(lobbyData);
      
      if (gameUnsubscribe) {
        gameUnsubscribe();
        gameUnsubscribe = null;
      }
      
      if (lobbyData?.onGoingGame) {
        gameUnsubscribe = subscribeToGame(lobbyData.onGoingGame, (gameData) => {
          setGame(gameData);
          setLoading(false);
        });
      } else {
        setGame(null);
        setLoading(false);
      }
    });

    return () => {
      lobbyUnsubscribe();
      if (gameUnsubscribe) {
        gameUnsubscribe();
      }
    };
  }, [gameId]);

  useEffect(() => {
    if (game && !game.declarePhase?.active) {
      setDeclarationHalfSuit(null);
      setDeclarationTeam(null);
      setDeclarationAssignments({});
      setDeclareError('');
    }
  }, [game]);

  const playersArray = useMemo(() => game?.players || [], [game?.players]);
  const usernames = useUsernames(playersArray);

  const isPlayer = (!!user && game?.players?.includes(user.uid)) || false;
  const isMyTurn = (!!user && isPlayer && game && game.currentTurn === user.uid) || false;
  
  const serverPlayerHand = useMemo(() => {
    if (!isPlayer || !game || !user) return [];
    return getPlayerHand(game, user.uid);
  }, [game, isPlayer, user]);
  
  useEffect(() => {
    if (isPlayer && game && user) {
      setLocalPlayerHand(prev => {
        const prevKeys = prev.map(getCardKey).sort().join(',');
        const newKeys = serverPlayerHand.map(getCardKey).sort().join(',');
        
        if (prevKeys !== newKeys) {
           return sortCards(serverPlayerHand, sortMethod);
        }
        return prev;
      });
    } else {
      setLocalPlayerHand([]);
    }
  }, [game, isPlayer, user, sortMethod, serverPlayerHand]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading game...</div>;
  }

  if (!lobby) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <UICard>
          <CardHeader>
            <CardTitle>Lobby not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </UICard>
      </div>
    );
  }

  if (!lobby.onGoingGame || !game) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <UICard>
          <CardHeader>
            <CardTitle>Game not started</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/lobby/${gameId}`)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
          </CardContent>
        </UICard>
      </div>
    );
  }

  const playerHand = localPlayerHand;

  const opponents = (isPlayer && user && game) ? getOpponents(game, user.uid) : [];
  const allOtherPlayers = (isPlayer && user && game)
    ? game.players.filter(playerId => playerId !== user.uid)
    : [];

  const allSuits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const allRanks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];

  const sortCards = (cards: Card[], method: 'rank_asc' | 'rank_desc' | 'suit_rank_asc' | 'suit_rank_desc') => {
    const rankValues: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const suitValues: Record<string, number> = { 'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3 };

    return [...cards].sort((a, b) => {
      if (method === 'rank_asc') {
        return rankValues[a.rank] - rankValues[b.rank] || suitValues[a.suit] - suitValues[b.suit];
      } else if (method === 'rank_desc') {
        return rankValues[b.rank] - rankValues[a.rank] || suitValues[b.suit] - suitValues[a.suit];
      } else if (method === 'suit_rank_asc') {
        return suitValues[a.suit] - suitValues[b.suit] || rankValues[a.rank] - rankValues[b.rank];
      } else { // suit_rank_desc
        return suitValues[b.suit] - suitValues[a.suit] || rankValues[b.rank] - rankValues[a.rank];
      }
    });
  };

  const handleShuffle = () => {
    setLocalPlayerHand(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setToast({ message: 'Shuffled!', visible: true });
  };

  const handleSort = () => {
    setSortMethod(prev => {
      const methods: ('rank_asc' | 'rank_desc' | 'suit_rank_asc' | 'suit_rank_desc')[] = ['suit_rank_asc', 'suit_rank_desc', 'rank_asc', 'rank_desc'];
      const currentIndex = methods.indexOf(prev);
      const nextMethod = methods[(currentIndex + 1) % methods.length];
      setLocalPlayerHand(currentHand => sortCards(currentHand, nextMethod));
      
      const labels: Record<string, string> = {
        'rank_asc': 'ascending rank',
        'rank_desc': 'descending rank',
        'suit_rank_asc': 'ascending suit',
        'suit_rank_desc': 'descending suit'
      };
      setToast({ message: `Ordered by ${labels[nextMethod]}!`, visible: true });

      return nextMethod;
    });
  };

  const handleAskForCard = async () => {
    if (!user || !isPlayer || !game) return;

    setErrorMessage('');
    setIsAsking(true);

    const card: Card = { 
      suit: selectedSuit, 
      rank: selectedRank, 
      halfSuit: getHalfSuitFromCard(selectedSuit, selectedRank) 
    };

    const result = await askForCard(game.id, user.uid, selectedOpponent, card);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    } else {
      setSelectedOpponent('');
      setErrorMessage('');
    }

    setIsAsking(false);
  };

  const canAskForCard = (): boolean => {
    if (!isPlayer || !selectedOpponent) return false;
    if (game.declarePhase?.active) return false;
    if (isGameOver) return false;

    const cardHalfSuit = getHalfSuitFromCard(selectedSuit, selectedRank);

    return belongsToHalfSuit(playerHand, cardHalfSuit) &&
           !playerHand.some(c => c.suit === selectedSuit && c.rank === selectedRank);
  };

  const handleDeclare = async () => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);
    setDeclarationHalfSuit(null);
    setDeclarationTeam(null);
    setDeclarationAssignments({});

    const result = await startDeclaration(game.id, user.uid);

    if (!result.success && result.error) {
      setDeclareError(result.error);
      setIsDeclaring(false);
    } else {
      setIsDeclaring(false);
    }
  };

  const handleSelectHalfSuit = (halfSuit: Card['halfSuit']) => {
    setDeclarationHalfSuit(halfSuit);
    setDeclarationTeam(null);
    setDeclarationAssignments({});
  };

  const handleSelectTeam = (team: 0 | 1) => {
    setDeclarationTeam(team);
    setDeclarationAssignments({});
  };

  const handleAssignCard = (cardKey: string, playerId: string) => {
    setDeclarationAssignments(prev => ({
      ...prev,
      [cardKey]: playerId
    }));
  };

  const handleFinishDeclaration = async () => {
    if (!isPlayer || !game || !user) return;
    if (!declarationHalfSuit || declarationTeam === null) return;

    setDeclareError('');
    setIsDeclaring(true);

    const result = await finishDeclaration(
      game.id,
      user.uid,
      declarationHalfSuit,
      declarationTeam,
      declarationAssignments
    );

    if (!result.success && result.error) {
      setDeclareError(result.error);
    } else {
      setDeclarationHalfSuit(null);
      setDeclarationTeam(null);
      setDeclarationAssignments({});
    }

    setIsDeclaring(false);
  };

  const isInDeclarePhase = game.declarePhase?.active || false;
  const isDeclaree = isPlayer && game.declarePhase?.declareeId === user?.uid;
  const allHalfSuits: Card['halfSuit'][] = [
    'low-spades', 'high-spades', 'low-hearts', 'high-hearts',
    'low-diamonds', 'high-diamonds', 'low-clubs', 'high-clubs'
  ];
  const availableHalfSuits = allHalfSuits.filter(hs => !game.completedHalfsuits.includes(hs));
  const isGameOver = game.gameOver?.winner !== null && game.gameOver?.winner !== undefined;
  const winningTeam = game.gameOver?.winner ?? null;
  const isHost = lobby?.createdBy === user?.uid;
  const nonHostPlayers = game.players.filter(p => p !== lobby?.createdBy);
  const replayVoteCount = game.replayVotes?.filter(v => nonHostPlayers.includes(v)).length || 0;
  const hasVotedForReplay = game.replayVotes?.includes(user?.uid || '') || false;

  const handleReturnToLobby = async () => {
    if (!gameId) return;
    try {
      await returnToLobby(gameId);
    } catch (error) {
      console.error('Failed to return to lobby:', error);
    }
  };

  const handleReplay = async () => {
    if (!gameId || !isHost) return;
    try {
      await replayGame(gameId);
    } catch (error) {
      console.error('Failed to replay game:', error);
    }
  };

  const handleVoteForReplay = async () => {
    if (!game || !user || hasVotedForReplay) return;
    try {
      const result = await voteForReplay(game.id, user.uid);
      if (!result.success && result.error) {
        console.error('Failed to vote for replay:', result.error);
      }
    } catch (error) {
      console.error('Failed to vote for replay:', error);
    }
  };

  const getOpponentPosition = (index: number, total: number) => {
    if (total === 0) return { left: '50%', top: '50%' };
    if (total === 1) {
      return { left: '50%', top: '35%' };
    }
    const step = 120 / (total - 1);
    const angleDeg = 210 + (index * step);
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = 20;
    const centerX = 50;
    const centerY = 45;
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return { left: `${x}%`, top: `${y}%` };
  };

  const OpponentHandVisual = ({ count }: { count: number }) => {
    if (count === 0) return <div className="h-12" />; // Placeholder height

    const topRow = Math.ceil(count / 2);
    const bottomRow = Math.floor(count / 2);
    const cardHeight = 32;
    const cardWidth = 22;

    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center -space-y-4 mt-1">
          {/* Top Row */}
          <div className="flex">
            {Array.from({ length: topRow }).map((_, i) => (
              <img
                key={`top-${i}`}
                src={cardBack}
                alt="card back"
                className="shadow-sm rounded-sm border-white border-[0.5px] bg-red-500 block"
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  marginLeft: i === 0 ? 0 : '-14px',
                  zIndex: i
                }}
              />
            ))}
          </div>
          {/* Bottom Row */}
          {bottomRow > 0 && (
            <div className="flex">
              {Array.from({ length: bottomRow }).map((_, i) => (
                <img
                  key={`bottom-${i}`}
                  src={cardBack}
                  alt="card back"
                  className="shadow-sm rounded-sm border-white border-[0.5px] bg-red-500 block"
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    marginLeft: i === 0 ? 0 : '-14px',
                    zIndex: 10 + i
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-bold text-muted-foreground">{count} left</span>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative">
      <Header 
        type="game" 
        roomName={lobby.name} 
        className="absolute top-0 left-0 right-0 bg-background/95 backdrop-blur" 
      />

      {/* Scores (Center Table) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col gap-4 items-center pointer-events-none">
        <div className="text-2xl font-bold bg-background/50 p-4 rounded-xl border shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-sm text-red-500 uppercase tracking-wider font-bold">Red Team</span>
              <span className="text-4xl">{game.scores?.[0] || 0}</span>
            </div>
            <div className="h-12 w-px bg-border mx-2" />
            <div className="flex flex-col items-center">
              <span className="text-sm text-blue-500 uppercase tracking-wider font-bold">Blue Team</span>
              <span className="text-4xl">{game.scores?.[1] || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Announcement (Top Center - below header) */}
      <div className="absolute top-[72px] left-0 right-0 z-30 px-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto max-w-md">
          {!isInDeclarePhase ? (
            <div className="bg-background/95 backdrop-blur shadow-md border rounded-lg px-4 py-2">
              <div className="text-sm text-center">
                {isMyTurn ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-base text-green-600">It is your turn!</span>
                    <span className="text-xs text-muted-foreground">Press on the player you wish to ask.</span>
                  </div>
                ) : (
                  <div className="font-medium">
                    Waiting for {usernames.get(game.currentTurn) || 'player'}...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-background/95 backdrop-blur shadow-md border rounded-lg px-4 py-2">
              <div className="text-sm text-center">
                {isDeclaree ? (
                  <span className="font-bold text-amber-600">You are declaring!</span>
                ) : (
                  <span className="font-medium">
                    {usernames.get(game.declarePhase?.declareeId || '') || 'A player'} has started declaring...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-50">
        <ChatBox gameId={game.id} />
      </div>

      {isGameOver && winningTeam !== null ? (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <UICard className="w-96">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {winningTeam === 0 ? 'RED TEAM' : 'BLUE TEAM'} WINS!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Winning Team:</h3>
                <ul className="text-sm space-y-1">
                  {getTeamPlayers(game, winningTeam as 0 | 1).map(playerId => {
                    const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                    return (
                      <li key={playerId}>{playerId === user?.uid ? 'You' : playerUsername}</li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex gap-2">
                {isHost ? (
                  <Button onClick={handleReplay} size="sm" className="flex-1">
                    Replay {nonHostPlayers.length > 0 ? `(${replayVoteCount}/${nonHostPlayers.length})` : ''}
                  </Button>
                ) : (
                  <Button onClick={handleVoteForReplay} disabled={hasVotedForReplay} size="sm" className="flex-1">
                    {hasVotedForReplay ? 'Voted' : 'Vote Replay'}
                  </Button>
                )}
                <Button onClick={handleReturnToLobby} variant="outline" size="sm">
                  Back to Lobby
                </Button>
              </div>
            </CardContent>
          </UICard>
        </div>
      ) : (
        <>
          {allOtherPlayers.map((playerId, index) => {
            const position = getOpponentPosition(index, allOtherPlayers.length);
            const isCurrentTurn = game.currentTurn === playerId;
            const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
            const handSize = game.playerHands[playerId]?.length || 0;
            const isOpponent = opponents.includes(playerId);
            const isClickable = isMyTurn && !isInDeclarePhase && isOpponent;
            
            return (
              <div
                key={playerId}
                className="absolute z-20 flex flex-col items-center"
                style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
              >
                <div
                  className={cn(
                    "w-24 h-24 rounded-full bg-muted border-4 flex items-center justify-center transition-all",
                    isCurrentTurn ? "border-green-500" : "border-border",
                    isClickable ? "cursor-pointer hover:bg-muted/80" : "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => isClickable && setSelectedOpponent(playerId)}
                >
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="mt-2 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-sm font-bold">{playerUsername}</div>
                    <Badge className={cn(
                      "text-xs px-1 py-0 h-5 text-white border-none",
                      game.teams[playerId] === 0 ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                    )}>
                      {game.teams[playerId] === 0 ? 'Red' : 'Blue'}
                    </Badge>
                  </div>
                  <OpponentHandVisual count={handSize} />
                </div>
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            {isInDeclarePhase && isDeclaree ? (
              <UICard className="w-96 max-h-[60vh] overflow-y-auto pointer-events-auto">
                <CardHeader>
                  <CardTitle className="text-sm">Declaration Phase</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!declarationHalfSuit && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Step 1: Select Halfsuit</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableHalfSuits.map(halfSuit => (
                          <Button
                            key={halfSuit}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectHalfSuit(halfSuit)}
                          >
                            {halfSuit}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {declarationHalfSuit && declarationTeam === null && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Step 2: Select Team</h4>
                      <div className="mb-2 text-xs text-muted-foreground">
                        Halfsuit: {declarationHalfSuit}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSelectTeam(0)} variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                          Red Team
                        </Button>
                        <Button onClick={() => handleSelectTeam(1)} variant="outline" size="sm" className="text-blue-500 border-blue-200 hover:bg-blue-50 hover:text-blue-600">
                          Blue Team
                        </Button>
                      </div>
                    </div>
                  )}

                  {declarationHalfSuit && declarationTeam !== null && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Step 3: Assign Cards</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {getAllCardsInHalfSuit(declarationHalfSuit).map(card => {
                          const cardKey = getCardKey(card);
                          const assignedPlayerId = declarationAssignments[cardKey];
                          const teamPlayers = getTeamPlayers(game, declarationTeam);
                          
                          return (
                            <div key={cardKey} className="flex items-center gap-2">
                              <CardImage card={card} width={30} height={42} />
                              <Select
                                value={assignedPlayerId || ''}
                                onValueChange={(value) => handleAssignCard(cardKey, value)}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamPlayers.map(playerId => {
                                    const playerUsername = usernames.get(playerId) || `Player ${playerId.slice(0, 16)}`;
                                    return (
                                      <SelectItem key={playerId} value={playerId} className="text-xs">
                                        {playerId === user?.uid ? 'You' : playerUsername}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        onClick={handleFinishDeclaration}
                        disabled={isDeclaring || !getAllCardsInHalfSuit(declarationHalfSuit).every(card => {
                          const cardKey = getCardKey(card);
                          return declarationAssignments[cardKey] !== undefined;
                        })}
                        className="w-full mt-4"
                        size="sm"
                      >
                        {isDeclaring ? 'Finishing...' : 'Finish Declaration'}
                      </Button>
                    </div>
                  )}

                  {declareError && (
                    <div className="text-xs text-destructive">{declareError}</div>
                  )}
                </CardContent>
              </UICard>
            ) : isMyTurn && !isInDeclarePhase && selectedOpponent ? (
              <UICard className="w-80 pointer-events-auto">
                <CardHeader>
                  <CardTitle className="text-sm">Your Turn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Suit</Label>
                    <Select value={selectedSuit} onValueChange={(value) => setSelectedSuit(value as Card['suit'])}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allSuits.map(suit => (
                          <SelectItem key={suit} value={suit} className="text-xs">{suit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Rank</Label>
                    <Select value={selectedRank} onValueChange={(value) => setSelectedRank(value as Card['rank'])}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allRanks.map(rank => (
                          <SelectItem key={rank} value={rank} className="text-xs">{rank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAskForCard}
                      disabled={!canAskForCard() || isAsking}
                      size="sm"
                      className="flex-1"
                    >
                      {isAsking ? 'Asking...' : 'Ask'}
                    </Button>
                    <Button
                      onClick={() => setSelectedOpponent('')}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                  {errorMessage && (
                    <div className="text-xs text-destructive">{errorMessage}</div>
                  )}
                </CardContent>
              </UICard>
            ) : null}
          </div>

          <div className="absolute left-1/2 bottom-[180px] -translate-x-1/2 z-20">
            <fieldset className="border-2 border-border rounded-lg p-4 bg-background w-[500px]">
              <legend className="px-2 text-xs font-semibold">Available actions:</legend>
              <div className="flex gap-4">
                <Button
                  disabled={!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer}
                  className={cn(
                    "flex-1 h-12 text-lg relative overflow-hidden",
                    (!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer) && 
                    "opacity-50 cursor-not-allowed after:absolute after:inset-0 after:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]"
                  )}
                >
                  Ask
                </Button>
                <Button
                  onClick={handleDeclare}
                  disabled={isDeclaring || isInDeclarePhase || !isPlayer || !isPlayerAlive(game, user?.uid || '')}
                  className="flex-1 h-12 text-lg"
                >
                  {isDeclaring ? 'Starting...' : 'Declare'}
                </Button>
              </div>
              {declareError && (
                <div className="text-xs text-destructive mt-2 text-center">{declareError}</div>
              )}
            </fieldset>
          </div>
        </>
      )}

      {isPlayer && playerHand.length > 0 && (
        <div
          className={cn(
            "fixed bottom-0 left-1/2 z-30 flex justify-center",
            isMyTurn && "ring-4 ring-green-500 rounded-t-lg ring-offset-2 ring-offset-background"
          )}
          style={{ 
            transform: 'translateX(-50%)',
            width: `${Math.min(Math.max(playerHand.length * 55, 250), 1000)}px`,
            height: '140px'
          }}
        >
          <div className="absolute left-[-140px] bottom-[20px] flex flex-col gap-2 z-50 items-center">
            <div className={cn(
              "absolute bottom-full mb-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity duration-200 pointer-events-none",
              toast.visible ? "opacity-100" : "opacity-0"
            )}>
              {toast.message}
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background/80 hover:bg-background"
              onClick={handleSort}
              title="Sort cards"
            >
              <ArrowDownUp className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background/80 hover:bg-background"
              onClick={handleShuffle}
              title="Shuffle cards"
            >
              <Shuffle className="h-5 w-5" />
            </Button>
          </div>

          {playerHand.map((card, index) => {
            const totalCards = playerHand.length;
            const radius = 1500; // Radius of the circle
            const angleStep = 2; // Degrees between cards
            const startAngle = -((totalCards - 1) * angleStep) / 2;
            
            // Add extra rotation based on index to complement the vertical offset
            const indexRotation = index * 0.5; 
            const rotation = startAngle + (index * angleStep) + indexRotation;
            
            // Increasing vertical offset for each card
            const translateY = index * 5;

            // Calculate the X offset caused by the rotation to center the fan
            // We want the center of the fan (average X position) to be at 0
            // For a given card i, x_i ≈ radius * sin(rotation_i)
            // Average x ≈ (1/N) * Σ(radius * sin(rotation_i))
            // We need to shift everything left by Average x
            
            // Approximate calculation for the shift needed:
            // Calculate rotation of first and last card
            const firstCardRotation = startAngle; // index 0
            const lastCardRotation = startAngle + ((totalCards - 1) * angleStep) + ((totalCards - 1) * 0.5);
            
            // The "visual center" rotation is the average of first and last
            const centerRotation = (firstCardRotation + lastCardRotation) / 2;
            
            // We need to counteract this rotation to center the fan
            // Shift the transform origin point horizontally? No, easier to shift the container or the cards.
            // Shifting the cards by rotating the whole system by -centerRotation is the most geometrically correct way
            // But we want to keep the specific individual rotations requested.
            // Instead, let's calculate the horizontal displacement caused by 'centerRotation' at 'radius'
            // x_offset = radius * sin(centerRotation)
            
            const centerOffsetRadians = (centerRotation * Math.PI) / 180;
            const xOffset = radius * Math.sin(centerOffsetRadians);

            return (
              <div
                key={getCardKey(card)}
                className="absolute transition-all duration-200 cursor-pointer hover:translate-y-[-20px] hover:z-40"
                style={{
                  left: '50%',
                  bottom: '-30px', // Translate cards downward
                  marginLeft: `calc(-60px - ${xOffset}px)`, // Adjust left margin to center the fan
                  transformOrigin: `50% ${radius}px`,
                  transform: `rotate(${rotation}deg) translateY(-${translateY}px)`,
                  zIndex: index,
                }}
              >
                <CardImage card={card} width={120} height={168} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GamePage;
