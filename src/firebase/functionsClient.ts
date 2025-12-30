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
  { name: string; maxPlayers: number },
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

export const callSwapPlayerTeam = createCallable<
  { lobbyId: string; playerId: string },
  { success: boolean }
>('swapPlayerTeam');

export const callRandomizeTeams = createCallable<
  { lobbyId: string },
  { success: boolean }
>('randomizeTeams');

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

export const callStartDeclaration = createCallable<
  { gameDocId: string },
  { success: boolean; error?: string }
>('startDeclaration');

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
