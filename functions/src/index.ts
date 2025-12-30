import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all handlers
export { sendMessage } from './handlers/chat';

export {
  createOrUpdateUser,
  updateUsername,
  updateUserLastOnline,
  updateUserCurrentLobby
} from './handlers/user';

export {
  createLobby,
  joinLobby,
  leaveLobby,
  deleteLobby,
  joinTeam,
  swapPlayerTeam,
  randomizeTeams,
  startLobby,
  returnToLobby
} from './handlers/lobby';

export {
  askForCard,
  startDeclaration,
  finishDeclaration,
  voteForReplay,
  leaveGame,
  returnToGame,
  forfeitGame,
  checkInactiveGames
} from './handlers/game';
