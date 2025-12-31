import React from 'react';
import { colors } from '@/utils/colors';

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

interface StatusBannerProps {
  backgroundColor: string;
  children: React.ReactNode;
  showShimmer?: boolean;
}

const StatusBanner: React.FC<StatusBannerProps> = ({
  backgroundColor,
  children,
  showShimmer = true,
}) => {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className="w-full py-2 px-4 text-center text-white relative overflow-hidden"
        style={{
          backgroundColor,
          boxShadow: `0 0 8px ${backgroundColor}80`
        }}
      >
        {showShimmer && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.15) 65%, transparent 100%)',
              backgroundSize: '300% 100%',
              animation: 'shimmer 3s linear infinite',
            }}
          />
        )}
        <span className="relative z-10 text-sm">
          {children}
        </span>
      </div>
    </>
  );
};

interface TurnBannerProps {
  isMyTurn: boolean;
  currentTurnPlayerId: string;
  isInDeclarePhase: boolean;
  getUsername: (playerId: string) => string;
  getUserColor: (playerId: string) => string;
  onAskClick?: () => void;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  isMyTurn,
  currentTurnPlayerId,
  isInDeclarePhase,
  getUsername,
  getUserColor,
  onAskClick,
}) => {
  const backgroundColor = isInDeclarePhase
    ? '#6b7280'
    : (isMyTurn ? colors.green : getUserColor(currentTurnPlayerId));

  return (
    <StatusBanner backgroundColor={backgroundColor} showShimmer={!isInDeclarePhase || isMyTurn}>
      {isMyTurn ? (
        <span className="inline-flex items-center gap-2">
          <span className="font-semibold">It's your turn!</span>
          {!isInDeclarePhase && onAskClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAskClick();
              }}
              className="ml-2 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white font-medium transition-colors"
            >
              Ask for a card
            </button>
          )}
        </span>
      ) : (
        <>It's <span className="font-semibold">{getUsername(currentTurnPlayerId)}</span>'s turn...</>
      )}
    </StatusBanner>
  );
};

interface DeclarationBannerProps {
  isDeclaree: boolean;
  declareeId: string;
  getUsername: (playerId: string) => string;
}

export const DeclarationBanner: React.FC<DeclarationBannerProps> = ({
  isDeclaree,
  declareeId,
  getUsername,
}) => {
  return (
    <StatusBanner backgroundColor={colors.purple}>
      {isDeclaree ? (
        <span className="font-semibold">You are declaring!</span>
      ) : (
        <>
          <span className="font-semibold">{getUsername(declareeId)}</span> has started declaring!
        </>
      )}
    </StatusBanner>
  );
};

interface LeftPlayerBannerProps {
  leftPlayerId: string;
  leftReason: 'inactive' | 'left';
  leaveCountdown: number | null;
  isCurrentUser: boolean;
  getUsername: (playerId: string) => string;
}

interface PassTurnBannerProps {
  onPassTurnClick?: () => void;
}

export const PassTurnBanner: React.FC<PassTurnBannerProps> = ({
  onPassTurnClick,
}) => {
  return (
    <StatusBanner backgroundColor={colors.amber}>
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold">It's your turn but you have no cards!</span>
        {onPassTurnClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPassTurnClick();
            }}
            className="ml-2 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white font-medium transition-colors"
          >
            Pass to teammate
          </button>
        )}
      </span>
    </StatusBanner>
  );
};

export const LeftPlayerBanner: React.FC<LeftPlayerBannerProps> = ({
  leftPlayerId,
  leftReason,
  leaveCountdown,
  isCurrentUser,
  getUsername,
}) => {
  return (
    <StatusBanner backgroundColor={colors.red}>
      {leftReason === 'inactive' ? (
        <>
          Game inactive for 1 hour. <span className="font-semibold">{isCurrentUser ? 'You have' : `${getUsername(leftPlayerId)} has`}</span>
          {leaveCountdown !== null && (
            <span className="font-semibold"> {leaveCountdown}s</span>
          )} to make a move or the game ends.
        </>
      ) : (
        <>
          <span className="font-semibold">{getUsername(leftPlayerId)}</span> has left the game.
          {leaveCountdown !== null && (
            <span className="font-semibold"> {leaveCountdown}s</span>
          )} to return or the game ends.
        </>
      )}
    </StatusBanner>
  );
};

export default StatusBanner;
