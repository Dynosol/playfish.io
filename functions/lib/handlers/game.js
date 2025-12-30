"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.forfeitGame = exports.returnToGame = exports.leaveGame = exports.voteForReplay = exports.finishDeclaration = exports.startDeclaration = exports.askForCard = exports.createGame = exports.archiveCompletedGameFromLobby = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const rateLimiter_1 = require("../rateLimiter");
const db = admin.firestore();
const LEAVE_TIMEOUT_SECONDS = 60;
// Helper functions
const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '9', '10', 'J', 'Q', 'K'];
const getHalfSuitFromCard = (suit, rank) => {
    const lowRanks = ['A', '2', '3', '4', '5', '6'];
    const isLow = lowRanks.includes(rank);
    const prefix = isLow ? 'low' : 'high';
    return `${prefix}-${suit}`;
};
const getAllCardsInHalfSuit = (halfSuit) => {
    const [lowOrHigh, suit] = halfSuit.split('-');
    const isLow = lowOrHigh === 'low';
    const ranksForHalfSuit = isLow
        ? ['A', '2', '3', '4', '5', '6']
        : ['7', '9', '10', 'J', 'Q', 'K'];
    return ranksForHalfSuit.map(rank => ({
        suit,
        rank,
        halfSuit: getHalfSuitFromCard(suit, rank)
    }));
};
const getCardKey = (card) => `${card.suit}-${card.rank}`;
const isPlayerAlive = (game, playerId) => {
    const hand = game.playerHands[playerId] || [];
    return hand.length > 0;
};
const createDeck = () => {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ suit, rank, halfSuit: getHalfSuitFromCard(suit, rank) });
        }
    }
    return deck;
};
const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
const distributeCards = (players) => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const playerHands = {};
    const cardsPerPlayer = Math.floor(shuffled.length / players.length);
    const remainder = shuffled.length % players.length;
    let cardIndex = 0;
    for (let i = 0; i < players.length; i++) {
        const playerId = players[i];
        const cardsForThisPlayer = cardsPerPlayer + (i < remainder ? 1 : 0);
        playerHands[playerId] = shuffled.slice(cardIndex, cardIndex + cardsForThisPlayer);
        cardIndex += cardsForThisPlayer;
    }
    return playerHands;
};
const getTeamPlayers = (game, team) => {
    const teamPlayers = [];
    for (const playerId of game.players) {
        if (game.teams[playerId] === team) {
            teamPlayers.push(playerId);
        }
    }
    return teamPlayers;
};
const getOpponents = (game, playerId) => {
    const playerTeam = game.teams[playerId];
    if (playerTeam === undefined)
        return [];
    const opponents = [];
    for (const id of game.players) {
        if (id !== playerId && game.teams[id] !== playerTeam) {
            opponents.push(id);
        }
    }
    return opponents;
};
const belongsToHalfSuit = (hand, halfSuit) => {
    return hand.some(card => card.halfSuit === halfSuit);
};
const hasCard = (hand, targetCard) => {
    return hand.some(card => card.suit === targetCard.suit && card.rank === targetCard.rank);
};
// Archive functions
const archiveCompletedGame = async (gameDocId, gameData) => {
    const archivedGameRef = db.collection('completedGames').doc(gameDocId);
    await archivedGameRef.set({
        ...gameData,
        archivedAt: firestore_1.FieldValue.serverTimestamp()
    });
    await db.collection('games').doc(gameDocId).delete();
};
const archiveCompletedGameFromLobby = async (gameDocId) => {
    const gameSnap = await db.collection('games').doc(gameDocId).get();
    if (gameSnap.exists) {
        await archiveCompletedGame(gameDocId, { id: gameSnap.id, ...gameSnap.data() });
    }
};
exports.archiveCompletedGameFromLobby = archiveCompletedGameFromLobby;
const archiveUnfinishedGame = async (gameDocId, gameData, reason) => {
    const archivedGameRef = db.collection('unfinishedGames').doc(gameDocId);
    await archivedGameRef.set({
        ...gameData,
        archivedAt: firestore_1.FieldValue.serverTimestamp(),
        endReason: reason
    });
    await db.collection('games').doc(gameDocId).delete();
};
// Exported for use by lobby handler
const createGame = async (gameId, players, teamAssignments, lobbyUuid) => {
    const playerHands = distributeCards(players);
    const teams = { ...teamAssignments };
    const randomIndex = Math.floor(Math.random() * players.length);
    const firstPlayer = players[randomIndex];
    const uuid = require('crypto').randomUUID();
    const gameData = {
        uuid,
        lobbyUuid,
        gameId,
        players,
        teams,
        playerHands,
        currentTurn: firstPlayer,
        turnOrder: players,
        turns: [],
        scores: { 0: 0, 1: 0 },
        completedHalfsuits: [],
        declarations: [],
        declarePhase: null,
        gameOver: null,
        replayVotes: [],
        leftPlayer: null,
        createdAt: firestore_1.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('games').add(gameData);
    return docRef.id;
};
exports.createGame = createGame;
exports.askForCard = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const askerId = request.auth.uid;
    const { gameDocId, targetId, card } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    if (!targetId || typeof targetId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'targetId is required');
    }
    if (!card || !card.suit || !card.rank) {
        throw new https_1.HttpsError('invalid-argument', 'card is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(askerId, 'game:askForCard');
    const gameRef = db.collection('games').doc(gameDocId);
    return await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (game.declarePhase?.active) {
            throw new https_1.HttpsError('failed-precondition', 'Game is paused during declaration phase');
        }
        if (game.leftPlayer) {
            throw new https_1.HttpsError('failed-precondition', 'Game is paused - a player has left');
        }
        if (game.currentTurn !== askerId) {
            throw new https_1.HttpsError('failed-precondition', 'It is not your turn');
        }
        const opponents = getOpponents(game, askerId);
        if (!opponents.includes(targetId)) {
            throw new https_1.HttpsError('failed-precondition', 'You must ask a player on the opposing team');
        }
        const askerHand = game.playerHands[askerId] || [];
        const targetHand = game.playerHands[targetId] || [];
        if (hasCard(askerHand, card)) {
            throw new https_1.HttpsError('failed-precondition', 'You already have this card');
        }
        if (!belongsToHalfSuit(askerHand, card.halfSuit)) {
            throw new https_1.HttpsError('failed-precondition', 'You do not belong to this half-suit');
        }
        const targetHasCard = hasCard(targetHand, card);
        const updatedPlayerHands = { ...game.playerHands };
        if (targetHasCard) {
            updatedPlayerHands[targetId] = targetHand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
            updatedPlayerHands[askerId] = [...askerHand, card];
        }
        const newTurn = { askerId, targetId, card, success: targetHasCard, timestamp: new Date() };
        transaction.update(gameRef, {
            playerHands: updatedPlayerHands,
            currentTurn: targetHasCard ? askerId : targetId,
            turns: [...game.turns, newTurn]
        });
        return { success: true };
    });
});
exports.startDeclaration = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const declareeId = request.auth.uid;
    const { gameDocId } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(declareeId, 'game:startDeclaration');
    const gameRef = db.collection('games').doc(gameDocId);
    return await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (game.declarePhase?.active) {
            throw new https_1.HttpsError('failed-precondition', 'A declaration is already in progress');
        }
        if (game.leftPlayer) {
            throw new https_1.HttpsError('failed-precondition', 'Game is paused - a player has left');
        }
        if (!isPlayerAlive(game, declareeId)) {
            throw new https_1.HttpsError('failed-precondition', 'You must have cards to declare');
        }
        transaction.update(gameRef, { declarePhase: { active: true, declareeId } });
        return { success: true };
    });
});
exports.finishDeclaration = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const declareeId = request.auth.uid;
    const { gameDocId, halfSuit, team, assignments } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    if (!halfSuit || typeof halfSuit !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'halfSuit is required');
    }
    if (team !== 0 && team !== 1) {
        throw new https_1.HttpsError('invalid-argument', 'team must be 0 or 1');
    }
    if (!assignments || typeof assignments !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'assignments is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(declareeId, 'game:finishDeclaration');
    const gameRef = db.collection('games').doc(gameDocId);
    const result = await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (!game.declarePhase?.active || game.declarePhase.declareeId !== declareeId) {
            throw new https_1.HttpsError('failed-precondition', 'You are not the active declaree');
        }
        if (game.completedHalfsuits.includes(halfSuit)) {
            throw new https_1.HttpsError('failed-precondition', 'This halfsuit has already been completed');
        }
        const allCardsInHalfSuit = getAllCardsInHalfSuit(halfSuit);
        const allCardsAssigned = allCardsInHalfSuit.every(c => assignments[getCardKey(c)] !== undefined);
        if (!allCardsAssigned) {
            throw new https_1.HttpsError('failed-precondition', 'You must assign all cards in the halfsuit');
        }
        const teamPlayers = getTeamPlayers(game, team);
        for (const card of allCardsInHalfSuit) {
            if (!teamPlayers.includes(assignments[getCardKey(card)])) {
                throw new https_1.HttpsError('failed-precondition', 'All cards must be assigned to players on the selected team');
            }
        }
        const updatedPlayerHands = { ...game.playerHands };
        let allCorrect = true;
        for (const card of allCardsInHalfSuit) {
            const assignedHand = updatedPlayerHands[assignments[getCardKey(card)]] || [];
            if (!hasCard(assignedHand, card))
                allCorrect = false;
        }
        for (const playerId of game.players) {
            updatedPlayerHands[playerId] = (updatedPlayerHands[playerId] || []).filter(c => c.halfSuit !== halfSuit);
        }
        const declareeTeam = game.teams[declareeId];
        const oppositeTeam = declareeTeam === 0 ? 1 : 0;
        const updatedScores = { ...game.scores };
        updatedScores[allCorrect ? declareeTeam : oppositeTeam]++;
        let gameOver = game.gameOver;
        const wasGameOver = gameOver !== null;
        if (updatedScores[0] >= 5)
            gameOver = { winner: 0 };
        else if (updatedScores[1] >= 5)
            gameOver = { winner: 1 };
        transaction.update(gameRef, {
            playerHands: updatedPlayerHands,
            scores: updatedScores,
            completedHalfsuits: [...game.completedHalfsuits, halfSuit],
            declarations: [...game.declarations, { declareeId, halfSuit, team, assignments, correct: allCorrect, timestamp: new Date() }],
            declarePhase: null,
            gameOver
        });
        return { success: true, gameOver, wasGameOver, updatedScores, gameId: game.gameId };
    });
    // Update lobby historical scores if game just ended
    if (result.gameOver && !result.wasGameOver) {
        const lobbyRef = db.collection('lobbies').doc(result.gameId);
        const lobbySnap = await lobbyRef.get();
        if (lobbySnap.exists) {
            const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
            await lobbyRef.update({
                historicalScores: { 0: current[0] + result.updatedScores[0], 1: current[1] + result.updatedScores[1] }
            });
        }
    }
    return { success: true };
});
exports.voteForReplay = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const playerId = request.auth.uid;
    const { gameDocId } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(playerId, 'game:voteForReplay');
    const gameRef = db.collection('games').doc(gameDocId);
    const result = await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (!game.gameOver) {
            throw new https_1.HttpsError('failed-precondition', 'Game is not over');
        }
        if (game.replayVotes.includes(playerId)) {
            throw new https_1.HttpsError('failed-precondition', 'You have already voted for replay');
        }
        const lobbyRef = db.collection('lobbies').doc(game.gameId);
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        const nonHostPlayers = game.players.filter(p => p !== lobbyData.createdBy);
        const updatedReplayVotes = [...game.replayVotes, playerId];
        const allNonHostVoted = nonHostPlayers.every(p => updatedReplayVotes.includes(p));
        transaction.update(gameRef, { replayVotes: updatedReplayVotes });
        return {
            success: true,
            allNonHostVoted,
            game,
            lobbyRef,
            historicalScores: lobbyData.historicalScores || { 0: 0, 1: 0 }
        };
    });
    if (result.allNonHostVoted) {
        const teamAssignments = {};
        result.game.players.forEach(pid => { teamAssignments[pid] = result.game.teams[pid]; });
        const newGameDocId = await (0, exports.createGame)(result.game.gameId, result.game.players, teamAssignments, result.game.lobbyUuid);
        await result.lobbyRef.update({
            status: 'playing',
            onGoingGame: newGameDocId,
            historicalScores: result.historicalScores
        });
        await archiveCompletedGame(result.game.id, result.game);
        return { success: true, shouldReplay: true };
    }
    return { success: true, shouldReplay: false };
});
exports.leaveGame = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const playerId = request.auth.uid;
    const { gameDocId } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(playerId, 'game:leaveGame');
    const gameRef = db.collection('games').doc(gameDocId);
    return await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (!game.players.includes(playerId)) {
            throw new https_1.HttpsError('permission-denied', 'You are not in this game');
        }
        if (game.gameOver) {
            throw new https_1.HttpsError('failed-precondition', 'Game is already over');
        }
        if (game.leftPlayer) {
            throw new https_1.HttpsError('failed-precondition', 'A player has already left');
        }
        transaction.update(gameRef, {
            leftPlayer: {
                odId: playerId,
                odAt: Date.now()
            }
        });
        return { success: true };
    });
});
exports.returnToGame = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const playerId = request.auth.uid;
    const { gameDocId } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(playerId, 'game:returnToGame');
    const gameRef = db.collection('games').doc(gameDocId);
    return await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        if (!game.leftPlayer) {
            throw new https_1.HttpsError('failed-precondition', 'No player has left');
        }
        if (game.leftPlayer.odId !== playerId) {
            throw new https_1.HttpsError('permission-denied', 'You are not the player who left');
        }
        if (game.gameOver) {
            throw new https_1.HttpsError('failed-precondition', 'Game is already over');
        }
        const elapsed = Date.now() - game.leftPlayer.odAt;
        if (elapsed >= LEAVE_TIMEOUT_SECONDS * 1000) {
            throw new https_1.HttpsError('failed-precondition', 'Return timeout has expired');
        }
        transaction.update(gameRef, { leftPlayer: null });
        return { success: true };
    });
});
exports.forfeitGame = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { gameDocId } = request.data;
    if (!gameDocId || typeof gameDocId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'gameDocId is required');
    }
    await (0, rateLimiter_1.checkRateLimit)(userId, 'game:forfeitGame');
    const gameRef = db.collection('games').doc(gameDocId);
    const result = await db.runTransaction(async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Game not found');
        }
        const game = { id: gameSnap.id, ...gameSnap.data() };
        // Verify user is in the game
        if (!game.players.includes(userId)) {
            throw new https_1.HttpsError('permission-denied', 'You are not in this game');
        }
        if (game.gameOver) {
            throw new https_1.HttpsError('failed-precondition', 'Game is already over');
        }
        if (!game.leftPlayer) {
            throw new https_1.HttpsError('failed-precondition', 'No player has left');
        }
        const leftPlayerTeam = game.teams[game.leftPlayer.odId];
        const winningTeam = leftPlayerTeam === 0 ? 1 : 0;
        const updatedGame = {
            ...game,
            gameOver: { winner: winningTeam },
            leftPlayer: null
        };
        transaction.update(gameRef, {
            gameOver: { winner: winningTeam },
            leftPlayer: null
        });
        return { success: true, gameId: game.gameId, winningTeam, game: updatedGame };
    });
    // Update lobby historical scores
    const lobbyRef = db.collection('lobbies').doc(result.gameId);
    const lobbySnap = await lobbyRef.get();
    if (lobbySnap.exists) {
        const current = lobbySnap.data()?.historicalScores || { 0: 0, 1: 0 };
        const updatedScores = { ...current };
        updatedScores[result.winningTeam]++;
        await lobbyRef.update({ historicalScores: updatedScores });
    }
    // Archive the forfeited game
    await archiveUnfinishedGame(gameDocId, result.game, 'forfeit');
    return { success: true };
});
//# sourceMappingURL=game.js.map