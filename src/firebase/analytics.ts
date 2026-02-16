import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { app } from './config';

let analytics: Analytics | null = null;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

function log(eventName: string, params?: Record<string, string | number | boolean>) {
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

// ─── User Identity ───────────────────────────────────────────────

export function identifyUser(uid: string) {
  if (!analytics) return;
  setUserId(analytics, uid);
}

export function setUserProps(props: { color?: string; has_custom_username?: boolean }) {
  if (!analytics) return;
  setUserProperties(analytics, props);
}

// ─── Page Views ──────────────────────────────────────────────────

export function logPageView(pageName: string, pageLocation?: string) {
  log('screen_view', {
    firebase_screen: pageName,
    firebase_screen_class: pageName,
    ...(pageLocation && { page_location: pageLocation }),
  });
}

// ─── Lobby Events ────────────────────────────────────────────────

export function logLobbyCreated(params: { maxPlayers: number; isPrivate: boolean }) {
  log('lobby_created', {
    max_players: params.maxPlayers,
    is_private: params.isPrivate,
  });
}

export function logLobbyJoined(params: { lobbyId: string; playerCount: number }) {
  log('lobby_joined', {
    lobby_id: params.lobbyId,
    player_count: params.playerCount,
  });
}

export function logLobbyLeft(lobbyId: string) {
  log('lobby_left', { lobby_id: lobbyId });
}

export function logLobbyDeleted(lobbyId: string) {
  log('lobby_deleted', { lobby_id: lobbyId });
}

export function logTeamJoined(params: { lobbyId: string; team: number }) {
  log('team_joined', {
    lobby_id: params.lobbyId,
    team: params.team,
  });
}

export function logTeamLeft(lobbyId: string) {
  log('team_left', { lobby_id: lobbyId });
}

export function logTeamSwapped(lobbyId: string) {
  log('team_swapped', { lobby_id: lobbyId });
}

export function logTeamsRandomized(lobbyId: string) {
  log('teams_randomized', { lobby_id: lobbyId });
}

export function logInviteLinkCopied(lobbyId: string) {
  log('invite_link_copied', { lobby_id: lobbyId });
}

export function logLobbySettingChanged(params: { setting: string; value: string | boolean }) {
  log('lobby_setting_changed', {
    setting_name: params.setting,
    setting_value: String(params.value),
  });
}

export function logGameStarted(params: {
  lobbyId: string;
  playerCount: number;
  challengeMode: boolean;
  bluffQuestions: boolean;
  declarationMode: string;
  harshDeclarations: boolean;
  highSuitsDouble: boolean;
}) {
  log('game_started', {
    lobby_id: params.lobbyId,
    player_count: params.playerCount,
    challenge_mode: params.challengeMode,
    bluff_questions: params.bluffQuestions,
    declaration_mode: params.declarationMode,
    harsh_declarations: params.harshDeclarations,
    high_suits_double: params.highSuitsDouble,
  });
}

// ─── Gameplay Events ─────────────────────────────────────────────

export function logCardAsked(halfSuit: string) {
  log('card_asked', { half_suit: halfSuit });
}

export function logTurnPassed() {
  log('turn_passed');
}

export function logDeclarationStarted() {
  log('declaration_started');
}

export function logDeclarationCompleted(params: { halfSuit: string; team: number }) {
  log('declaration_completed', {
    half_suit: params.halfSuit,
    team: params.team,
  });
}

export function logDeclarationAborted() {
  log('declaration_aborted');
}

export function logChallengeStarted(halfSuit: string) {
  log('challenge_started', { half_suit: halfSuit });
}

export function logChallengeResponded(response: 'pass' | 'declare') {
  log('challenge_responded', { response });
}

export function logGameOver(params: {
  winnerTeam: number;
  score0: number;
  score1: number;
  turnCount: number;
  declarationCount: number;
  playerCount: number;
}) {
  log('game_over', {
    winner_team: params.winnerTeam,
    score_team_0: params.score0,
    score_team_1: params.score1,
    turn_count: params.turnCount,
    declaration_count: params.declarationCount,
    player_count: params.playerCount,
  });
}

export function logReplayVoted() {
  log('replay_voted');
}

export function logGameLeft() {
  log('game_left');
}

export function logGameReturned() {
  log('game_returned');
}

export function logGameForfeited() {
  log('game_forfeited');
}

export function logReturnToLobby() {
  log('return_to_lobby');
}

export function logReplayStarted() {
  log('replay_started');
}

// ─── Hand Management Events ──────────────────────────────────────

export function logHandShuffled() {
  log('hand_shuffled');
}

export function logHandSorted(sortMethod: string) {
  log('hand_sorted', { sort_method: sortMethod });
}

// ─── Chat Events ─────────────────────────────────────────────────

export function logChatMessageSent(params: { chatType: 'global' | 'lobby' | 'game'; messageLength: number }) {
  log('chat_message_sent', {
    chat_type: params.chatType,
    message_length: params.messageLength,
  });
}

// ─── User Settings Events ────────────────────────────────────────

export function logUsernameChanged() {
  log('username_changed');
}

// ─── Feedback Events ─────────────────────────────────────────────

export function logFeedbackSubmitted(messageLength: number) {
  log('feedback_submitted', { message_length: messageLength });
}

// ─── Navigation Events ──────────────────────────────────────────

export function logSpectateGame(lobbyId: string) {
  log('spectate_game', { lobby_id: lobbyId });
}
