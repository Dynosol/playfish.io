import { httpsCallable } from 'firebase/functions';
import type { HttpsCallableResult } from 'firebase/functions';
import { functions } from './config';
import type { Card } from './gameService';

// Generic callable wrapper with error handling
function createCallable<TData, TResult>(name: string) {
  const callable = httpsCallable<TData, TResult>(functions, name);
  return async (data: TData): Promise<TResult> => {
    try {
      const result: HttpsCallableResult<TResult> = await callable(data);
      return result.data;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      // Handle rate limit errors specifically
      if (err.code === 'functions/resource-exhausted') {
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      }
      throw error;
    }
  };
}

// Chat functions
export const callSendMessage = createCallable<
  { chatId: string; message: string },
  { success: boolean }
>('sendMessage');

// User functions
export const callCreateOrUpdateUser = createCallable<
  Record<string, never>,
  { success: boolean }
>('createOrUpdateUser');

export const callUpdateUsername = createCallable<
  { username: string },
  { success: boolean }
>('updateUsername');

export const callUpdateUserLastOnline = createCallable<
  Record<string, never>,
  { success: boolean }
>('updateUserLastOnline');

export const callUpdateUserCurrentLobby = createCallable<
  { lobbyId: string | null },
  { success: boolean }
>('updateUserCurrentLobby');

// Lobby functions
export const callCreateLobby = createCallable<
  {
    name: string;
    maxPlayers: number;
    isPrivate?: boolean;
    challengeMode?: boolean;
    bluffQuestions?: boolean;
    declarationMode?: 'own-turn' | 'team-turn' | 'anytime';
    harshDeclarations?: boolean;
    highSuitsDouble?: boolean;
  },
  { success: boolean; lobbyId: string }
>('createLobby');

export const callJoinLobby = createCallable<
  { lobbyId: string },
  { success: boolean }
>('joinLobby');

export const callLeaveLobby = createCallable<
  { lobbyId: string },
  { success: boolean }
>('leaveLobby');

export const callDeleteLobby = createCallable<
  { lobbyId: string },
  { success: boolean }
>('deleteLobby');

export const callJoinTeam = createCallable<
  { lobbyId: string; team: 0 | 1 },
  { success: boolean }
>('joinTeam');

export const callLeaveTeam = createCallable<
  { lobbyId: string },
  { success: boolean }
>('leaveTeam');

export const callSwapPlayerTeam = createCallable<
  { lobbyId: string; playerId: string },
  { success: boolean }
>('swapPlayerTeam');

export const callRandomizeTeams = createCallable<
  { lobbyId: string },
  { success: boolean }
>('randomizeTeams');

export const callUpdateLobbySettings = createCallable<
  {
    lobbyId: string;
    challengeMode?: boolean;
    bluffQuestions?: boolean;
    declarationMode?: 'own-turn' | 'team-turn' | 'anytime';
    harshDeclarations?: boolean;
    highSuitsDouble?: boolean;
  },
  { success: boolean }
>('updateLobbySettings');

export const callStartLobby = createCallable<
  { lobbyId: string },
  { success: boolean; gameDocId: string }
>('startLobby');

export const callReturnToLobby = createCallable<
  { lobbyId: string },
  { success: boolean }
>('returnToLobby');

// Game functions
export const callAskForCard = createCallable<
  { gameDocId: string; targetId: string; card: Card },
  { success: boolean; error?: string }
>('askForCard');

export const callPassTurnToTeammate = createCallable<
  { gameDocId: string; teammateId: string },
  { success: boolean; error?: string }
>('passTurnToTeammate');

export const callStartDeclaration = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('startDeclaration');

export const callAbortDeclaration = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('abortDeclaration');

export const callSelectDeclarationHalfSuit = createCallable<
  { gameDocId: string; halfSuit: string },
  { success: boolean; error?: string }
>('selectDeclarationHalfSuit');

export const callSelectDeclarationTeam = createCallable<
  { gameDocId: string; team: 0 | 1 },
  { success: boolean; error?: string }
>('selectDeclarationTeam');

export const callFinishDeclaration = createCallable<
  { gameDocId: string; halfSuit: string; team: 0 | 1; assignments: { [cardKey: string]: string } },
  { success: boolean; error?: string }
>('finishDeclaration');

export const callVoteForReplay = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string; shouldReplay?: boolean }
>('voteForReplay');

export const callLeaveGame = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('leaveGame');

export const callReturnToGame = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('returnToGame');

export const callForfeitGame = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('forfeitGame');

// Challenge functions
export const callStartChallenge = createCallable<
  { gameDocId: string; halfSuit: string },
  { success: boolean; error?: string }
>('startChallenge');

export const callAbortChallenge = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('abortChallenge');

export const callRespondToChallenge = createCallable<
  { gameDocId: string; response: 'pass' | 'declare' },
  { success: boolean; error?: string; wonRace?: boolean }
>('respondToChallenge');

// Feedback functions
export const callSubmitFeedback = createCallable<
  { message: string },
  { success: boolean }
>('submitFeedback');
