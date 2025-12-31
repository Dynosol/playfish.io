import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, Shuffle, ArrowDownUp, RotateCcw } from 'lucide-react';
import leaveIcon from '@/assets/leave.png';
import { useAuth } from '../contexts/AuthContext';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import {
  subscribeToGame,
  getPlayerHand,
  getTeamPlayers,
  getOpponents,
  askForCard,
  belongsToHalfSuit,
  getHalfSuitFromCard,
  getCardKey,
  isPlayerAlive,
  startDeclaration,
  abortDeclaration,
  finishDeclaration,
  voteForReplay,
  leaveGame,
  forfeitGame,
  LEAVE_TIMEOUT_SECONDS,
  type Card
} from '../firebase/gameService';
import { subscribeToLobby, returnToLobby, replayGame } from '../firebase/lobbyService';
import type { Game } from '../firebase/gameService';
import type { Lobby } from '../firebase/lobbyService';
import cardBack from '../assets/cards/card_back.svg';
import ChatBox from '../components/ChatBox';
import { useUsers } from '../hooks/useUsername';
import { getUserColorHex } from '../utils/userColors';
import CardImage from '../components/CardImage';
import { getCardImageSrc } from '../utils/cardUtils';
import { useBreakpoint } from '../hooks/useBreakpoint';
import MobileOpponentGrid from '../components/game/MobileOpponentGrid';
import GameInfoSheet from '../components/game/GameInfoSheet';
import DeclarationOverlay from '../components/game/DeclarationOverlay';
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { colors } from '../utils/colors';

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

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();

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
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Track window width continuously for responsive card sizing
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Linear interpolation helper for continuous sizing
  const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

  // Calculate responsive factor (0 = mobile, 1 = desktop) based on window width
  // 480px = fully mobile, 1024px = fully desktop
  const responsiveFactor = Math.min(1, Math.max(0, (windowWidth - 480) / (1024 - 480)));

  // Get continuous card dimensions based on window width - no rounding for smooth scaling
  const cardDimensions = useMemo(() => {
    const cardWidth = lerp(60, 120, responsiveFactor);
    const cardHeight = lerp(84, 168, responsiveFactor);
    return {
      cardWidth,
      cardHeight,
      radius: lerp(600, 1500, responsiveFactor),
      angleStep: lerp(1.5, 2, responsiveFactor),
      indexRotationFactor: lerp(0.3, 0.5, responsiveFactor),
      translateYFactor: lerp(2, 5, responsiveFactor),
      // Use proportional values based on cardHeight for consistent cutoff
      bottomOffset: cardHeight * -0.18,
      containerHeight: cardHeight * 0.75,
      cardSpacing: cardWidth * 0.5,
      minWidth: lerp(150, 250, responsiveFactor),
      maxWidth: lerp(320, 1000, responsiveFactor),
    };
  }, [responsiveFactor]);

  const [dragState, setDragState] = useState<{
    index: number;
    cardKey: string;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
    isDropping?: boolean;
    dropX?: number;
    dropY?: number;
    dropRotation?: number;
  } | null>(null);
  
  const dragCardRef = useRef<{ card: Card; imageSrc: string } | null>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number, card: Card) => {
    // For mouse events, only handle left click
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    // Get clientX/Y from mouse or touch event
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragCardRef.current = {
      card,
      imageSrc: getCardImageSrc(card)
    };

    setDragState({
      index,
      cardKey: getCardKey(card),
      currentX: clientX,
      currentY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    });
  };

  const getFanConfig = (totalCards: number) => {
    const { radius, angleStep, indexRotationFactor } = cardDimensions;
    const startAngle = -((totalCards - 1) * angleStep) / 2;

    const firstCardRotation = startAngle;
    const lastCardRotation = startAngle + ((totalCards - 1) * angleStep) + ((totalCards - 1) * indexRotationFactor);
    const centerRotation = (firstCardRotation + lastCardRotation) / 2;
    const centerOffsetRadians = (centerRotation * Math.PI) / 180;
    const xOffset = radius * Math.sin(centerOffsetRadians);

    return { radius, angleStep, startAngle, xOffset, indexRotationFactor };
  };

  useEffect(() => {
    if (!dragState || dragState.isDropping) return;

    const handleMove = (clientX: number, clientY: number) => {
      setDragState(prev => prev ? { ...prev, currentX: clientX, currentY: clientY } : null);

      // Live reordering
      const { radius: FAN_RADIUS, cardHeight: CARD_HEIGHT } = cardDimensions;

      const totalCards = localPlayerHand.length;
      const { angleStep, startAngle, xOffset, indexRotationFactor } = getFanConfig(totalCards);

      // Adjust pivotX by xOffset because the fan is shifted left by xOffset
      const pivotX = (window.innerWidth / 2) - xOffset;
      const pivotY = window.innerHeight - CARD_HEIGHT + 30 + FAN_RADIUS;

      const dx = clientX - pivotX;
      const dy = clientY - pivotY;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      const normalizedAngle = angleDeg + 90;

      let bestIndex = 0;
      let minDiff = Infinity;

      for (let i = 0; i < totalCards; i++) {
         const indexRotation = i * indexRotationFactor;
         const slotAngle = startAngle + (i * angleStep) + indexRotation;
         const diff = Math.abs(normalizedAngle - slotAngle);
         if (diff < minDiff) {
           minDiff = diff;
           bestIndex = i;
         }
      }

      if (bestIndex !== dragState.index) {
         setLocalPlayerHand(prev => {
           const newHand = [...prev];
           const [moved] = newHand.splice(dragState.index, 1);
           newHand.splice(bestIndex, 0, moved);
           return newHand;
         });
         setDragState(prev => prev ? { ...prev, index: bestIndex } : null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      const slotElement = document.getElementById(`card-slot-${dragState.index}`);
      if (slotElement) {
        const rect = slotElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const totalCards = localPlayerHand.length;
        const { angleStep, startAngle, indexRotationFactor } = getFanConfig(totalCards);
        const indexRotation = dragState.index * indexRotationFactor;
        const targetRotation = startAngle + (dragState.index * angleStep) + indexRotation;

        const { cardWidth, cardHeight } = cardDimensions;

        setDragState(prev => prev ? {
          ...prev,
          isDropping: true,
          dropX: centerX - cardWidth / 2,
          dropY: centerY - cardHeight / 2,
          dropRotation: targetRotation
        } : null);

        setTimeout(() => {
          setDragState(null);
          dragCardRef.current = null;
        }, 200);
      } else {
        setDragState(null);
        dragCardRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState, localPlayerHand, cardDimensions]);

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

      // Auto-forfeit when countdown reaches 0
      if (remaining === 0 && lobby?.onGoingGame) {
        forfeitGame(lobby.onGoingGame);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [game?.leftPlayer, game?.gameOver, lobby?.onGoingGame]);

  const playersArray = useMemo(() => game?.players || [], [game?.players]);
  const usersData = useUsers(playersArray);

  // Helper to get styled username
  const getUsername = (playerId: string) => usersData.get(playerId)?.username || `Player ${playerId.slice(0, 8)}`;
  const getUserColor = (playerId: string) => getUserColorHex(usersData.get(playerId)?.color || 'slate');

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
        <UICard className="rounded shadow">
          <CardHeader>
            <CardTitle>Lobby not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline" className="rounded">
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
        <UICard className="rounded shadow">
          <CardHeader>
            <CardTitle>Game not started</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/lobby/${gameId}`)} variant="outline" className="rounded">
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

  const getOpponentPosition = (index: number, total: number) => {
    if (total === 0) return { left: '50%', top: '50%' };
    if (total === 1) {
      return { left: '50%', top: '30%' };
    }
    // Spread across 160 degrees (wider arc) for more spacing
    const arcSpread = Math.min(160, 40 * total);
    const step = arcSpread / (total - 1);
    const startAngle = 270 - arcSpread / 2; // Center the arc at top
    const angleDeg = startAngle + (index * step);
    const angleRad = (angleDeg * Math.PI) / 180;
    // Larger radius for more spread, responsive to number of players
    const radius = Math.min(35, 25 + total * 2);
    const centerX = 50;
    const centerY = 50;
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
                className="border-white border bg-red-500 block"
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
                  className="border-white border bg-red-500 block"
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
        <span className="text-xs font-semibold text-muted-foreground">{count} left</span>
      </div>
    );
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
          <style>{shimmerKeyframes}</style>

          {/* Left Player Warning Banner */}
          {game.leftPlayer && (
            <div
              className="w-full py-2 px-4 text-center text-white relative overflow-hidden"
              style={{
                backgroundColor: colors.red,
                boxShadow: `0 0 8px ${colors.red}80`
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
                  backgroundSize: '300% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              />
              <span className="relative z-10 text-sm">
                {game.leftPlayer.reason === 'inactive' ? (
                  <>
                    Game inactive for 1 hour. <span className="font-semibold">{game.leftPlayer.odId === user?.uid ? 'You have' : `${getUsername(game.leftPlayer.odId)} has`}</span>
                    {leaveCountdown !== null && (
                      <span className="font-semibold"> {leaveCountdown}s</span>
                    )} to make a move or the game ends.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{getUsername(game.leftPlayer.odId)}</span> has left the game.
                    {leaveCountdown !== null && (
                      <span className="font-semibold"> {leaveCountdown}s</span>
                    )} to return or the game ends.
                  </>
                )}
              </span>
            </div>
          )}

          {/* Current Turn Banner - always shows, gray during declare phase */}
          {!game.leftPlayer && (
            <div
              className="w-full py-2 px-4 text-center text-white relative overflow-hidden"
              style={{
                backgroundColor: isInDeclarePhase ? '#6b7280' : (isMyTurn ? colors.green : getUserColor(game.currentTurn)),
                boxShadow: isInDeclarePhase ? 'none' : `0 0 8px ${isMyTurn ? colors.green : getUserColor(game.currentTurn)}80`
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
                  backgroundSize: '300% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              />
              <span className="relative z-10 text-sm">
                {isMyTurn ? (
                  <>
                    <span className="font-semibold">It's your turn!</span>
                    {!isInDeclarePhase && ' Click on an opponent to ask for a card.'}
                  </>
                ) : (
                  <>It's <span className="font-semibold">{getUsername(game.currentTurn)}</span>'s turn...</>
                )}
              </span>
            </div>
          )}

          {/* Declaration Banner - shows below turn banner during declare phase */}
          {isInDeclarePhase && (
            <div
              className="w-full py-2 px-4 text-center text-white relative overflow-hidden"
              style={{
                backgroundColor: colors.purple,
                boxShadow: `0 0 8px ${colors.purple}80`
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
                  backgroundSize: '300% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              />
              <span className="relative z-10 text-sm">
                {isDeclaree ? (
                  <span className="font-semibold">You are declaring!</span>
                ) : (
                  <>
                    <span className="font-semibold">{getUsername(game.declarePhase?.declareeId || '')}</span> has started declaring!
                  </>
                )}
              </span>
            </div>
          )}
        </>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Chat (hidden on mobile) */}
        <div className="hidden lg:block w-72 shrink-0 p-3">
          <ChatBox chatId={gameId!} className="border border-gray-200" title="Game Chat" />
        </div>

        {/* Center - Game Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">

      {isGameOver && winningTeam !== null ? (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <UICard className="w-96 rounded shadow">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {winningTeam === 0 ? 'RED TEAM' : 'BLUE TEAM'} WINS!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Winning Team:</h3>
                <ul className="text-sm space-y-1">
                  {getTeamPlayers(game, winningTeam as 0 | 1).map(playerId => (
                    <li key={playerId}>
                      {playerId === user?.uid ? (
                        <span className="font-semibold" style={{ color: getUserColor(playerId) }}>You</span>
                      ) : (
                        <span className="font-semibold" style={{ color: getUserColor(playerId) }}>{getUsername(playerId)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                {isHost ? (
                  <Button onClick={handleReplay} size="sm" className="flex-1 rounded">
                    Replay {nonHostPlayers.length > 0 ? `(${replayVoteCount}/${nonHostPlayers.length})` : ''}
                  </Button>
                ) : (
                  <Button onClick={handleVoteForReplay} disabled={hasVotedForReplay} size="sm" className="flex-1 rounded">
                    {hasVotedForReplay ? 'Voted' : 'Vote Replay'}
                  </Button>
                )}
                <Button onClick={handleReturnToLobby} variant="outline" size="sm" className="rounded">
                  Back to Lobby
                </Button>
              </div>
            </CardContent>
          </UICard>
        </div>
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
              />
            </div>
          ) : (
            /* Desktop: Circular layout for opponents */
            allOtherPlayers.map((playerId, index) => {
              const position = getOpponentPosition(index, allOtherPlayers.length);
              const isCurrentTurn = game.currentTurn === playerId;
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
                    <div className="text-sm font-semibold" style={{ color: getUserColor(playerId) }}>
                      {getUsername(playerId)} <span className={game.teams[playerId] === 0 ? "text-red-500 font-normal" : "text-blue-500 font-normal"}>({game.teams[playerId] === 0 ? 'Red' : 'Blue'})</span>
                    </div>
                    <OpponentHandVisual count={handSize} />
                  </div>
                </div>
              );
            })
          )}

          {/* Declaration Overlay */}
          {isInDeclarePhase && isDeclaree && (
            <DeclarationOverlay
              game={game}
              user={user}
              declarationHalfSuit={declarationHalfSuit}
              declarationTeam={declarationTeam}
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
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <UICard className="w-80 pointer-events-auto rounded shadow">
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
                      className="flex-1 rounded"
                    >
                      {isAsking ? 'Asking...' : 'Ask'}
                    </Button>
                    <Button
                      onClick={() => setSelectedOpponent('')}
                      variant="outline"
                      size="sm"
                      className="rounded"
                    >
                      Cancel
                    </Button>
                  </div>
                  {errorMessage && (
                    <div className="text-xs text-destructive">{errorMessage}</div>
                  )}
                </CardContent>
              </UICard>
            </div>
          )}

        </>
      )}

      {isPlayer && playerHand.length > 0 && (
        <div
          className={cn(
            "fixed left-1/2 z-30 flex justify-center overflow-hidden",
            isMyTurn && responsiveFactor > 0.5 && "ring-4 ring-green-500 ring-offset-2 ring-offset-background"
          )}
          style={{
            transform: 'translateX(-50%)',
            width: `${Math.min(Math.max(playerHand.length * cardDimensions.cardSpacing, cardDimensions.minWidth), cardDimensions.maxWidth)}px`,
            height: `${cardDimensions.containerHeight}px`,
            // In responsive mode, position above the GameInfo/Chat section (~400px)
            bottom: isDesktop ? 0 : `${lerp(380, 0, responsiveFactor)}px`
          }}
        >
          {/* Sort/Shuffle buttons - hidden on small screens for cleaner UI */}
          <div className={cn(
            "absolute left-[-140px] bottom-[20px] flex flex-col gap-2 z-50 items-center",
            responsiveFactor < 0.5 && "hidden"
          )}>
            <div className={cn(
              "absolute bottom-full mb-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity duration-200 pointer-events-none",
              toast.visible ? "opacity-100" : "opacity-0"
            )}>
              {toast.message}
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 bg-white border border-gray-200 hover:bg-gray-50"
              onClick={handleSort}
              title="Sort cards"
            >
              <ArrowDownUp className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 bg-white border border-gray-200 hover:bg-gray-50"
              onClick={handleShuffle}
              title="Shuffle cards"
            >
              <Shuffle className="h-5 w-5" />
            </Button>
          </div>

          {playerHand.map((card, index) => {
            const totalCards = playerHand.length;
            const { radius, angleStep, startAngle, xOffset, indexRotationFactor } = getFanConfig(totalCards);

            // Add extra rotation based on index to complement the vertical offset
            const indexRotation = index * indexRotationFactor;
            const rotation = startAngle + (index * angleStep) + indexRotation;

            // Increasing vertical offset for each card
            const translateY = index * cardDimensions.translateYFactor;

            const { cardWidth, cardHeight } = cardDimensions;

            return (
              <div
                id={`card-slot-${index}`}
                key={getCardKey(card)}
                className={cn(
                  "absolute transition-transform duration-200 cursor-pointer",
                  !dragState && responsiveFactor > 0.5 && "hover:translate-y-[-20px] hover:z-40"
                )}
                onMouseDown={(e) => handleDragStart(e, index, card)}
                onTouchStart={(e) => handleDragStart(e, index, card)}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  left: '50%',
                  bottom: `${cardDimensions.bottomOffset}px`,
                  marginLeft: `calc(-${cardWidth / 2}px - ${xOffset}px)`,
                  transformOrigin: `50% ${radius}px`,
                  transform: `rotate(${rotation}deg) translateY(-${translateY}px)`,
                  zIndex: index,
                  opacity: dragState?.cardKey === getCardKey(card) ? 0 : 1,
                  pointerEvents: dragState ? 'none' : 'auto'
                }}
              >
                <CardImage card={card} width={cardWidth} height={cardHeight} />
              </div>
            );
          })}
        </div>
      )}
      
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
          <div className="bg-white rounded shadow">
            {/* Score Section */}
            <div className="p-3">
              <div className="text-sm font-semibold mb-2">Score</div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs text-red-500 uppercase tracking-wider font-semibold">Red</span>
                  <span className="text-2xl font-bold">{game.scores?.[0] || 0}</span>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Blue</span>
                  <span className="text-2xl font-bold">{game.scores?.[1] || 0}</span>
                </div>
              </div>
            </div>

            <div className="mx-3 border-t border-gray-200" />

            {/* Game Options Section */}
            <div className="p-3 space-y-2">
              <button
                onClick={() => setShowLeaveConfirm(true)}
                disabled={!!game.leftPlayer || isGameOver}
                className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: colors.red }}
              >
                <img src={leaveIcon} alt="Leave" className="h-3.5 w-3.5" />
                Leave Game
              </button>
              {isHost && (
                <button
                  onClick={handleReturnToLobby}
                  className="flex items-center gap-1 text-sm font-medium underline hover:opacity-70 transition-opacity whitespace-nowrap"
                  style={{ color: colors.blue }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return All to Lobby
                </button>
              )}
            </div>

            <div className="mx-3 border-t border-gray-200" />

            {/* Game Info Section */}
            <div className="p-3 space-y-2">
              <div className="text-sm font-semibold">Game Info</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">{lobby.name}</span>
                </div>
                <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{game.players.length}</span>
                </div>
                <div className="flex justify-between bg-gray-50 px-2 py-1 rounded shadow-sm">
                  <span className="text-muted-foreground">Your Team:</span>
                  <span className="font-medium">
                    {user && game.teams[user.uid] === 0 ? 'Red' : user && game.teams[user.uid] === 1 ? 'Blue' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mx-3 border-t border-gray-200" />

            {/* Completed Halfsuits Section */}
            <div className="p-3 space-y-2">
              <div className="text-sm font-semibold">Completed Halfsuits</div>
              {game.completedHalfsuits.length === 0 ? (
                <p className="text-xs text-muted-foreground">None yet</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {game.completedHalfsuits.map(hs => (
                    <Badge key={hs} variant="secondary" className="text-xs">
                      {hs}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Section - at bottom */}
            {isPlayer && !isGameOver && (
              <>
                <div className="mx-3 border-t border-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="text-sm font-semibold">Available Actions</div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            disabled={!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer}
                            className={cn(
                              "w-full rounded font-semibold transition-all relative",
                              (!isMyTurn || isInDeclarePhase || isGameOver || !isPlayer)
                                ? "opacity-70 cursor-not-allowed before:absolute before:left-2 before:right-2 before:top-1/2 before:h-[2px] before:bg-current before:-translate-y-1/2"
                                : "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                            )}
                          >
                            ASK
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {(!isMyTurn || isInDeclarePhase) && (
                        <TooltipContent>
                          <p>It is not your turn</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            onClick={handleDeclare}
                            disabled={isDeclaring || isInDeclarePhase || !isPlayer || !isPlayerAlive(game, user?.uid || '')}
                            className={cn(
                              "w-full rounded font-semibold transition-all text-white relative",
                              (isDeclaring || isInDeclarePhase || !isPlayerAlive(game, user?.uid || ''))
                                ? "opacity-70 cursor-not-allowed before:absolute before:left-2 before:right-2 before:top-1/2 before:h-[2px] before:bg-current before:-translate-y-1/2"
                                : "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                            )}
                            style={{ backgroundColor: colors.purple }}
                          >
                            {isDeclaring ? 'STARTING...' : 'DECLARE'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {!isPlayerAlive(game, user?.uid || '')
                            ? 'You have no cards'
                            : isInDeclarePhase
                              ? 'Declaration in progress'
                              : 'Are you sure?'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {declareError && (
                    <div className="text-xs text-destructive text-center">{declareError}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile: Game Info and Chat at bottom */}
        <div className="lg:hidden flex flex-col shrink-0">
          {/* Mobile Game Info */}
          <GameInfoSheet
            game={game}
            lobby={lobby}
            user={user}
            isHost={isHost}
            isPlayer={isPlayer}
            isMyTurn={isMyTurn}
            isInDeclarePhase={isInDeclarePhase}
            isGameOver={isGameOver}
            isDeclaring={isDeclaring}
            declareError={declareError}
            onLeaveGame={() => setShowLeaveConfirm(true)}
            onReturnToLobby={handleReturnToLobby}
            onDeclare={handleDeclare}
            isPlayerAlive={isPlayerAlive(game, user?.uid || '')}
          />
          {/* Mobile Chat */}
          <div className="p-2 border-t border-gray-200">
            <ChatBox chatId={gameId!} className="border border-gray-200 rounded-lg h-40" title="Game Chat" />
          </div>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">Leave Game?</h2>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to leave this game? Your team will forfeit if no one returns within {LEAVE_TIMEOUT_SECONDS} seconds.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveGame();
                }}
                className="flex-1 py-2 text-sm font-medium text-white rounded hover:opacity-90 transition-opacity"
                style={{ backgroundColor: colors.red }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
