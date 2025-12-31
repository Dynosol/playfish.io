import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all handlers
export { sendMessage } from './handlers/chat';

export { submitFeedback } from './handlers/feedback';

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
  leaveTeam,
  swapPlayerTeam,
  randomizeTeams,
  startLobby,
  returnToLobby
} from './handlers/lobby';

export {
  askForCard,
  startDeclaration,
  abortDeclaration,
  selectDeclarationHalfSuit,
  selectDeclarationTeam,
  finishDeclaration,
  voteForReplay,
  leaveGame,
  returnToGame,
  forfeitGame,
  checkInactiveGames
} from './handlers/game';
