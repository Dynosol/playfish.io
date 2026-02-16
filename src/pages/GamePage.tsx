import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import {
  subscribeToGame,
  getPlayerHand,
  getOpponents,
  getTeammates,
  getPlayerTeam,
  askForCard,
  passTurnToTeammate,
  belongsToHalfSuit,
  getHalfSuitFromCard,
  getCardKey,
  isPlayerAlive,
  startDeclaration,
  abortDeclaration,
  selectDeclarationHalfSuit,
  selectDeclarationTeam,
  finishDeclaration,
  voteForReplay,
  leaveGame,
  forfeitGame,
  startChallenge,
  respondToChallenge,
  LEAVE_TIMEOUT_SECONDS,
  type Card
} from '../firebase/gameService';
import { subscribeToLobby, returnToLobby, replayGame } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import ChatBox from '../components/ChatBox';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { sortCards, getNextSortMethod, getSortMethodLabel, type SortMethod } from '../utils/cardSorting';
import { useCardDrag, type CardDimensions } from '../hooks/useCardDrag';
import MobileOpponentGrid from '../components/game/MobileOpponentGrid';
import GameInfoSheet from '../components/game/GameInfoSheet';
import DeclarationOverlay from '../components/game/DeclarationOverlay';
import GameOverCard from '../components/game/GameOverCard';
import GameSidebar from '../components/game/GameSidebar';
import PlayerHand, { MobilePlayerHand } from '../components/game/PlayerHand';
import AskCardDialog from '../components/game/AskCardDialog';
import SelectOpponentDialog from '../components/game/SelectOpponentDialog';
import DesktopOpponentLayout from '../components/game/DesktopOpponentLayout';
import { TurnBanner, DeclarationBanner, LeftPlayerBanner, PassTurnBanner, ChallengeBanner } from '../components/game/StatusBanner';
import ChallengeHalfSuitDialog from '../components/game/ChallengeHalfSuitDialog';
import ChallengeResponsePopup from '../components/game/ChallengeResponsePopup';
import SelectTeammateDialog from '../components/game/SelectTeammateDialog';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Linear interpolation helper for continuous sizing
const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();

  const [showSelectOpponent, setShowSelectOpponent] = useState(false);
  const [showSelectTeammate, setShowSelectTeammate] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [selectedSuit, setSelectedSuit] = useState<Card['suit']>('spades');
  const [selectedRank, setSelectedRank] = useState<Card['rank']>('A');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAsking, setIsAsking] = useState(false);
  const [declareError, setDeclareError] = useState<string>('');
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [declarationAssignments, setDeclarationAssignments] = useState<{ [cardKey: string]: string }>({});
  const [localPlayerHand, setLocalPlayerHand] = useState<Card[]>([]);
  const [sortMethod, setSortMethod] = useState<SortMethod>('suit_rank_asc');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [challengeTimeRemaining, setChallengeTimeRemaining] = useState(30);

  // Track window width continuously for responsive card sizing
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive factor (0 = mobile, 1 = desktop) based on window width
  const responsiveFactor = Math.min(1, Math.max(0, (windowWidth - 480) / (1024 - 480)));

  // Get continuous card dimensions based on window width
  const cardDimensions: CardDimensions = useMemo(() => {
    const cardWidth = lerp(60, 120, responsiveFactor);
    const cardHeight = lerp(84, 168, responsiveFactor);
    return {
      cardWidth,
      cardHeight,
      radius: lerp(600, 1500, responsiveFactor),
      angleStep: lerp(1.5, 2, responsiveFactor),
      indexRotationFactor: lerp(0.3, 0.5, responsiveFactor),
      translateYFactor: lerp(2, 5, responsiveFactor),
      bottomOffset: cardHeight * -0.24,
      containerHeight: cardHeight * 1.1,
      cardSpacing: cardWidth * 0.5,
      minWidth: lerp(150, 250, responsiveFactor),
      maxWidth: lerp(320, 1000, responsiveFactor),
    };
  }, [responsiveFactor]);

  // Use the card drag hook
  const { dragState, dragCardRef, handleDragStart } = useCardDrag(
    localPlayerHand,
    setLocalPlayerHand,
    cardDimensions
  );

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
      setDeclarationAssignments({});
      setDeclareError('');
    }
  }, [game]);

  // Handle countdown timer when a player has left
  useEffect(() => {
    if (!game?.leftPlayer || game.gameOver) {
      setLeaveCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - game.leftPlayer!.odAt;
      const remaining = Math.max(0, LEAVE_TIMEOUT_SECONDS - Math.floor(elapsed / 1000));
      setLeaveCountdown(remaining);

      if (remaining === 0 && lobby?.onGoingGame) {
        forfeitGame(lobby.onGoingGame);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [game?.leftPlayer, game?.gameOver, lobby?.onGoingGame]);

  // Handle challenge countdown timer
  useEffect(() => {
    if (!game?.challengePhase?.active) {
      setChallengeTimeRemaining(30);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - game.challengePhase!.startedAt;
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 1000));
      setChallengeTimeRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [game?.challengePhase?.active, game?.challengePhase?.startedAt]);

  const playersArray = useMemo(() => game?.players || [], [game?.players]);
  const usersData = useUsers(playersArray);

  const getUsername = (playerId: string) => usersData.get(playerId)?.username || `Player ${playerId.slice(0, 8)}`;
  const getUserColor = (playerId: string) => getUserColorHex(usersData.get(playerId)?.color || 'slate');

  const isPlayer = (!!user && game?.players?.includes(user.uid)) || false;
  const isMyTurn = (!!user && isPlayer && game && game.currentTurn === user.uid) || false;
  const myHandIsEmpty = (!!user && isPlayer && game && (game.playerHands[user.uid]?.length || 0) === 0) || false;

  // Challenge mode computed values
  const myTeam = user && game ? getPlayerTeam(game, user.uid) : undefined;
  const isInChallengePhase = game?.challengePhase?.active || false;
  const isChallenger = isPlayer && game?.challengePhase?.challengerId === user?.uid;
  const isChallengedTeam = isPlayer && game?.challengePhase?.challengedTeam === myTeam;
  const challengerMustDeclare = game?.challengePhase?.challengerMustDeclare || false;
  const myResponse = user && game?.challengePhase?.responses ? game.challengePhase.responses[user.uid] : null;

  // Can challenge: challenge mode enabled, not my turn, opponent hasn't acted, no active phases
  const canChallenge = !!(
    game?.challengeMode &&
    isPlayer &&
    !isMyTurn &&
    !game?.turnActed &&
    !game?.declarePhase?.active &&
    !game?.challengePhase?.active &&
    !game?.gameOver
  );

  // Check if player has cards in the challenged half-suit (for declare button)
  const hasCardsInChallengedHalfSuit = useMemo(() => {
    if (!game?.challengePhase?.selectedHalfSuit || !user) return false;
    const hand = game.playerHands[user.uid] || [];
    return hand.some(card => card.halfSuit === game.challengePhase!.selectedHalfSuit);
  }, [game?.challengePhase?.selectedHalfSuit, game?.playerHands, user]);

  const teammates = useMemo(() => {
    if (!game || !user) return [];
    return getTeammates(game, user.uid);
  }, [game, user]);

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
    navigate('/');
    return null;
  }

  if (!lobby.onGoingGame || !game) {
    navigate(`/lobby/${gameId}`);
    return null;
  }

  const playerHand = localPlayerHand;
  const opponents = (isPlayer && user && game) ? getOpponents(game, user.uid) : [];
  const allOtherPlayers = (isPlayer && user && game)
    ? game.players.filter(playerId => playerId !== user.uid)
    : [];

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
      const nextMethod = getNextSortMethod(prev);
      setLocalPlayerHand(currentHand => sortCards(currentHand, nextMethod));
      setToast({ message: `Ordered by ${getSortMethodLabel(nextMethod)}!`, visible: true });
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

  const handlePassTurnToTeammate = async (teammateId: string) => {
    if (!user || !isPlayer || !game) return;

    setShowSelectTeammate(false);
    const result = await passTurnToTeammate(game.id, teammateId);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  const canAskForCard = (): boolean => {
    if (!isPlayer || !selectedOpponent) return false;
    if (game.declarePhase?.active) return false;
    if (isGameOver) return false;

    const cardHalfSuit = getHalfSuitFromCard(selectedSuit, selectedRank);

    // Must belong to the half-suit
    if (!belongsToHalfSuit(playerHand, cardHalfSuit)) return false;

    // Check if we already have the card (only block if bluff mode is disabled)
    const alreadyHaveCard = playerHand.some(c => c.suit === selectedSuit && c.rank === selectedRank);
    if (alreadyHaveCard && !game?.bluffQuestions) return false;

    return true;
  };

  const handleDeclare = async () => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);
    setDeclarationAssignments({});

    const result = await startDeclaration(game.id, user.uid);

    if (!result.success && result.error) {
      setDeclareError(result.error);
      setIsDeclaring(false);
    } else {
      setIsDeclaring(false);
    }
  };

  const handleAbortDeclaration = async () => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);

    const result = await abortDeclaration(game.id);

    if (!result.success && result.error) {
      setDeclareError(result.error);
    }

    setIsDeclaring(false);
  };

  const handleSelectHalfSuit = async (halfSuit: Card['halfSuit']) => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);
    setDeclarationAssignments({});

    const result = await selectDeclarationHalfSuit(game.id, halfSuit);

    if (!result.success && result.error) {
      setDeclareError(result.error);
    }

    setIsDeclaring(false);
  };

  const handleSelectTeam = async (team: 0 | 1) => {
    if (!isPlayer || !game || !user) return;

    setDeclareError('');
    setIsDeclaring(true);
    setDeclarationAssignments({});

    const result = await selectDeclarationTeam(game.id, team);

    if (!result.success && result.error) {
      setDeclareError(result.error);
    }

    setIsDeclaring(false);
  };

  const handleAssignCard = (cardKey: string, playerId: string) => {
    setDeclarationAssignments(prev => ({
      ...prev,
      [cardKey]: playerId
    }));
  };

  const handleFinishDeclaration = async () => {
    if (!isPlayer || !game || !user) return;

    const declarationHalfSuit = game.declarePhase?.selectedHalfSuit;
    const declarationTeam = game.declarePhase?.selectedTeam;

    if (!declarationHalfSuit || declarationTeam === undefined) return;

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
      setDeclarationAssignments({});
    }

    setIsDeclaring(false);
  };

  // Challenge handlers
  const handleStartChallenge = async (halfSuit: Card['halfSuit']) => {
    if (!isPlayer || !game || !user) return;

    setShowChallengeDialog(false);

    const result = await startChallenge(game.id, halfSuit);

    if (!result.success && result.error) {
      setDeclareError(result.error);
    }
  };

  const handleRespondToChallenge = async (response: 'pass' | 'declare') => {
    if (!isPlayer || !game || !user) return;

    const result = await respondToChallenge(game.id, response);

    if (!result.success && result.error) {
      setDeclareError(result.error);
    }
  };

  const isInDeclarePhase = game.declarePhase?.active || false;
  const isDeclaree = isPlayer && game.declarePhase?.declareeId === user?.uid;
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

  const handleLeaveGame = async () => {
    if (!game || !user || !isPlayer) return;
    try {
      const result = await leaveGame(game.id, user.uid);
      if (result.success) {
        navigate('/');
      } else {
        console.error('Failed to leave game:', result.error);
      }
    } catch (error) {
      console.error('Failed to leave game:', error);
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-auto bg-background flex flex-col">
      <SEO
        title={`Playing: ${lobby.name}`}
        description="Active Fish card game in progress."
        noindex={true}
      />
      <Header
        type="game"
        roomName={lobby.name}
        className="bg-background/95 backdrop-blur shrink-0"
      />

      {/* Status Banners */}
      {!isGameOver && (
        <>
          {/* Left Player Warning Banner */}
          {game.leftPlayer && (
            <LeftPlayerBanner
              leftPlayerId={game.leftPlayer.odId}
              leftReason={game.leftPlayer.reason || 'left'}
              leaveCountdown={leaveCountdown}
              isCurrentUser={game.leftPlayer.odId === user?.uid}
              getUsername={getUsername}
            />
          )}

          {/* Current Turn Banner - show PassTurnBanner if it's my turn but I have no cards */}
          {!game.leftPlayer && isMyTurn && myHandIsEmpty && !isInDeclarePhase && (
            <PassTurnBanner
              onPassTurnClick={() => setShowSelectTeammate(true)}
            />
          )}
          {!game.leftPlayer && !(isMyTurn && myHandIsEmpty && !isInDeclarePhase) && (
            <TurnBanner
              isMyTurn={isMyTurn}
              currentTurnPlayerId={game.currentTurn}
              isInDeclarePhase={isInDeclarePhase}
              getUsername={getUsername}
              getUserColor={getUserColor}
              onAskClick={() => setShowSelectOpponent(true)}
            />
          )}

          {/* Declaration Banner */}
          {isInDeclarePhase && (
            <DeclarationBanner
              isDeclaree={isDeclaree}
              declareeId={game.declarePhase?.declareeId || ''}
              getUsername={getUsername}
            />
          )}

          {/* Challenge Banner */}
          {isInChallengePhase && game.challengePhase && (
            <ChallengeBanner
              isChallenger={isChallenger}
              isChallengedTeam={isChallengedTeam}
              challengerMustDeclare={challengerMustDeclare}
              challengerName={getUsername(game.challengePhase.challengerId)}
              halfSuit={game.challengePhase.selectedHalfSuit}
              timeRemaining={challengeTimeRemaining}
            />
          )}
        </>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Chat (hidden on mobile) */}
        <div className="hidden lg:block w-72 shrink-0 p-3">
          <ChatBox chatId={gameId!} className="border border-gray-200" title="Game Chat" gameTurns={game?.turns} declarations={game?.declarations} getUsername={getUsername} currentTurn={game?.currentTurn} />
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">

          {isGameOver && winningTeam !== null ? (
            <GameOverCard
              game={game}
              winningTeam={winningTeam as 0 | 1}
              userId={user?.uid}
              isHost={isHost}
              replayVoteCount={replayVoteCount}
              nonHostPlayersCount={nonHostPlayers.length}
              hasVotedForReplay={hasVotedForReplay}
              onReplay={handleReplay}
              onVoteForReplay={handleVoteForReplay}
              onReturnToLobby={handleReturnToLobby}
              getUsername={getUsername}
              getUserColor={getUserColor}
            />
          ) : (
            <>
              {/* Mobile/Tablet: Compact grid layout for opponents */}
              {!isDesktop ? (
                <div className="p-2">
                  <MobileOpponentGrid
                    opponents={opponents}
                    allOtherPlayers={allOtherPlayers}
                    currentTurn={game.currentTurn}
                    teams={game.teams}
                    playerHands={game.playerHands}
                    isMyTurn={isMyTurn}
                    isInDeclarePhase={isInDeclarePhase}
                    onSelectOpponent={setSelectedOpponent}
                    getUsername={getUsername}
                    getUserColor={getUserColor}
                    userId={user?.uid}
                  />
                </div>
              ) : (
                /* Desktop: Circular layout for opponents */
                <DesktopOpponentLayout
                  allOtherPlayers={allOtherPlayers}
                  opponents={opponents}
                  game={game}
                  userId={user?.uid}
                  isMyTurn={isMyTurn}
                  isInDeclarePhase={isInDeclarePhase}
                  onSelectOpponent={setSelectedOpponent}
                  getUsername={getUsername}
                  getUserColor={getUserColor}
                />
              )}

              {/* Declaration Overlay */}
              {isInDeclarePhase && isDeclaree && (
                <DeclarationOverlay
                  game={game}
                  user={user}
                  declarationHalfSuit={game.declarePhase?.selectedHalfSuit ?? null}
                  declarationTeam={game.declarePhase?.selectedTeam ?? null}
                  declarationAssignments={declarationAssignments}
                  isDeclaring={isDeclaring}
                  declareError={declareError}
                  onSelectHalfSuit={handleSelectHalfSuit}
                  onSelectTeam={handleSelectTeam}
                  onAssignCard={handleAssignCard}
                  onFinishDeclaration={handleFinishDeclaration}
                  onAbortDeclaration={handleAbortDeclaration}
                  getUsername={getUsername}
                  getUserColor={getUserColor}
                />
              )}

              {/* Ask Card UI - centered when selecting opponent */}
              {isMyTurn && !isInDeclarePhase && selectedOpponent && (
                <AskCardDialog
                  selectedSuit={selectedSuit}
                  selectedRank={selectedRank}
                  onSuitChange={setSelectedSuit}
                  onRankChange={setSelectedRank}
                  onAsk={handleAskForCard}
                  onCancel={() => setSelectedOpponent('')}
                  canAsk={canAskForCard()}
                  isAsking={isAsking}
                  errorMessage={errorMessage}
                  playerHand={playerHand}
                  bluffQuestions={game?.bluffQuestions}
                />
              )}
            </>
          )}

          {/* Desktop only: Fan layout player hand */}
          {isDesktop && isPlayer && playerHand.length > 0 && (
            <PlayerHand
              playerHand={playerHand}
              cardDimensions={cardDimensions}
              responsiveFactor={responsiveFactor}
              isDesktop={isDesktop}
              dragState={dragState}
              onDragStart={handleDragStart}
            />
          )}

          {/* Dragged Card Visual */}
          {dragState && dragCardRef.current && (() => {
            const { cardWidth: dragCardWidth, cardHeight: dragCardHeight } = cardDimensions;
            return (
              <div
                className="fixed z-50 pointer-events-none"
                style={{
                  left: dragState.isDropping ? dragState.dropX : dragState.currentX - dragState.offsetX,
                  top: dragState.isDropping ? dragState.dropY : dragState.currentY - dragState.offsetY,
                  width: dragCardWidth,
                  height: dragCardHeight,
                  transform: dragState.isDropping
                    ? `rotate(${dragState.dropRotation}deg) scale(1.0)`
                    : 'scale(1.1)',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                  transition: dragState.isDropping ? 'all 0.2s ease-out' : 'none',
                  zIndex: 100
                }}
              >
                <img
                  src={dragCardRef.current.imageSrc}
                  alt=""
                  width={dragCardWidth}
                  height={dragCardHeight}
                  draggable={false}
                  style={{
                    width: dragCardWidth,
                    height: dragCardHeight,
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  } as React.CSSProperties}
                />
              </div>
            );
          })()}
        </div>

        {/* Right Sidebar - Options (hidden on mobile) */}
        <div className="hidden lg:block w-56 shrink-0 p-3">
          <GameSidebar
            game={game}
            lobby={lobby}
            user={user}
            isHost={isHost}
            isPlayer={isPlayer}
            isMyTurn={isMyTurn}
            isInDeclarePhase={isInDeclarePhase}
            isInChallengePhase={isInChallengePhase}
            isGameOver={isGameOver}
            isDeclaring={isDeclaring}
            declareError={declareError}
            isPlayerAlive={isPlayerAlive(game, user?.uid || '')}
            hasLeftPlayer={!!game.leftPlayer}
            canChallenge={canChallenge}
            onLeaveGame={() => setShowLeaveConfirm(true)}
            onReturnToLobby={handleReturnToLobby}
            onDeclare={handleDeclare}
            onChallenge={() => setShowChallengeDialog(true)}
            onAsk={() => setShowSelectOpponent(true)}
            onShuffle={handleShuffle}
            onSort={handleSort}
            sortToast={toast}
          />
        </div>

        {/* Mobile: Player Hand, Game Info and Chat at bottom */}
        <div className="lg:hidden flex flex-col shrink-0">
          {/* Mobile Player Hand */}
          {isPlayer && playerHand.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50">
              <MobilePlayerHand playerHand={playerHand} />
            </div>
          )}
          {/* Mobile Game Info */}
          <GameInfoSheet
            game={game}
            lobby={lobby}
            user={user}
            isHost={isHost}
            isPlayer={isPlayer}
            isMyTurn={isMyTurn}
            isInDeclarePhase={isInDeclarePhase}
            isInChallengePhase={isInChallengePhase}
            isGameOver={isGameOver}
            isDeclaring={isDeclaring}
            declareError={declareError}
            onLeaveGame={() => setShowLeaveConfirm(true)}
            onReturnToLobby={handleReturnToLobby}
            onDeclare={handleDeclare}
            onChallenge={() => setShowChallengeDialog(true)}
            onAsk={() => setShowSelectOpponent(true)}
            isPlayerAlive={isPlayerAlive(game, user?.uid || '')}
            canChallenge={canChallenge}
            onShuffle={handleShuffle}
            onSort={handleSort}
            sortToast={toast}
          />
          {/* Mobile Chat */}
          <div className="p-2 border-t border-gray-200">
            <ChatBox chatId={gameId!} className="border border-gray-200 rounded-lg h-40" title="Game Chat" gameTurns={game?.turns} declarations={game?.declarations} getUsername={getUsername} currentTurn={game?.currentTurn} />
          </div>
        </div>
      </div>

      {/* Select Opponent Dialog */}
      {game && isMyTurn && !isInDeclarePhase && showSelectOpponent && !selectedOpponent && (
        <SelectOpponentDialog
          opponents={opponents}
          teams={game.teams}
          playerHands={game.playerHands}
          onSelectOpponent={(playerId) => {
            setSelectedOpponent(playerId);
            setShowSelectOpponent(false);
          }}
          onCancel={() => setShowSelectOpponent(false)}
          getUsername={getUsername}
          getUserColor={getUserColor}
        />
      )}

      {/* Select Teammate Dialog (for passing turn when you have no cards) */}
      {game && isMyTurn && myHandIsEmpty && !isInDeclarePhase && showSelectTeammate && (
        <SelectTeammateDialog
          teammates={teammates}
          teams={game.teams}
          playerHands={game.playerHands}
          onSelectTeammate={handlePassTurnToTeammate}
          onCancel={() => setShowSelectTeammate(false)}
          getUsername={getUsername}
          getUserColor={getUserColor}
        />
      )}

      {/* Leave Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Leave Game?"
        message={`Are you sure you want to leave this game? Your team will forfeit if no one returns within ${LEAVE_TIMEOUT_SECONDS} seconds.`}
        confirmLabel="Leave"
        onConfirm={() => {
          setShowLeaveConfirm(false);
          handleLeaveGame();
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Challenge Half-Suit Selection Dialog */}
      {showChallengeDialog && game && (
        <ChallengeHalfSuitDialog
          completedHalfsuits={game.completedHalfsuits}
          onSelect={handleStartChallenge}
          onCancel={() => setShowChallengeDialog(false)}
        />
      )}

      {/* Challenge Response Popup for challenged team members */}
      {isInChallengePhase && isChallengedTeam && !challengerMustDeclare && game?.challengePhase && myResponse === null && (
        <ChallengeResponsePopup
          challengePhase={game.challengePhase}
          challengerName={getUsername(game.challengePhase.challengerId)}
          myResponse={myResponse}
          timeRemaining={challengeTimeRemaining}
          canDeclare={hasCardsInChallengedHalfSuit}
          onPass={() => handleRespondToChallenge('pass')}
          onDeclare={() => handleRespondToChallenge('declare')}
        />
      )}
    </div>
  );
};

export default GamePage;
