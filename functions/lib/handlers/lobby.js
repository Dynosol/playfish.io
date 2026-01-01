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
exports.checkInactiveLobbies = exports.returnToLobby = exports.startLobby = exports.updateLobbySettings = exports.randomizeTeams = exports.swapPlayerTeam = exports.leaveTeam = exports.joinTeam = exports.deleteLobby = exports.leaveLobby = exports.joinLobby = exports.createLobby = exports.MAX_LOBBY_NAME_LENGTH = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const rateLimiter_1 = require("../rateLimiter");
const game_1 = require("./game");
const usernameGenerator_1 = require("../utils/usernameGenerator");
const userColors_1 = require("../utils/userColors");
const profanityFilter_1 = require("../utils/profanityFilter");
const db = admin.firestore();
const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];
// Validation constants
exports.MAX_LOBBY_NAME_LENGTH = 30;
// Word lists for lobby ID generation
const adjectives = ['red', 'blue', 'green', 'gold', 'swift', 'calm', 'bold', 'wise'];
const nouns = ['fox', 'owl', 'wolf', 'bear', 'hawk', 'deer', 'lion', 'eagle'];
const generateLobbyId = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}-${noun}-${num}`;
};
const updateUserCurrentLobby = async (uid, lobbyId) => {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    // If user document doesn't exist or is missing username, create a proper one
    if (!userSnap.exists || !userSnap.data()?.username) {
        await userRef.set({
            uid,
            username: (0, usernameGenerator_1.generateUsername)(),
            color: (0, userColors_1.getRandomUserColor)(),
            currentLobbyId: lobbyId,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastOnline: firestore_1.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    else {
        await userRef.set({
            currentLobbyId: lobbyId,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        }, { merge: true });
    }
};
const moveLobbyToDeleted = async (lobbyId, lobbyData) => {
    const deletedLobbyRef = db.collection('deletedLobbies').doc(lobbyId);
    await deletedLobbyRef.set({
        ...lobbyData,
        deletedAt: firestore_1.FieldValue.serverTimestamp()
    });
    await db.collection('lobbies').doc(lobbyId).delete();
};
const leaveCurrentLobby = async (userId, excludeLobbyId) => {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists)
        return;
    const userData = userSnap.data();
    const currentLobbyId = userData?.currentLobbyId;
    if (!currentLobbyId || currentLobbyId === excludeLobbyId)
        return;
    const lobbyRef = db.collection('lobbies').doc(currentLobbyId);
    const lobbySnap = await lobbyRef.get();
    if (!lobbySnap.exists) {
        await updateUserCurrentLobby(userId, null);
        return;
    }
    const lobbyData = lobbySnap.data();
    const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
    const isHost = lobbyData.createdBy === userId;
    if (updatedPlayers.length === 0) {
        await moveLobbyToDeleted(currentLobbyId, lobbyData);
    }
    else {
        const updatedTeams = { ...lobbyData.teams };
        delete updatedTeams[userId];
        const updateData = {
            players: firestore_1.FieldValue.arrayRemove(userId),
            teams: updatedTeams
        };
        if (isHost && updatedPlayers.length > 0) {
            updateData.createdBy = updatedPlayers[0];
        }
        await lobbyRef.update(updateData);
    }
    await updateUserCurrentLobby(userId, null);
};
const areTeamsEven = (lobby) => {
    let team0Count = 0;
    let team1Count = 0;
    for (const playerId of lobby.players) {
        const team = lobby.teams[playerId];
        if (team === 0)
            team0Count++;
        else if (team === 1)
            team1Count++;
    }
    const totalAssigned = team0Count + team1Count;
    return team0Count === team1Count && team0Count > 0 && totalAssigned === lobby.players.length;
};
exports.createLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { name, maxPlayers } = request.data;
    // Validate maxPlayers
    if (!maxPlayers || typeof maxPlayers !== 'number' || maxPlayers < 2 || maxPlayers > 6) {
        throw new https_1.HttpsError('invalid-argument', 'maxPlayers must be between 2 and 6');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:createLobby');
    // Leave any current lobby
    await leaveCurrentLobby(userId);
    // Generate unique lobby ID
    let lobbyId = generateLobbyId();
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
        const existingDoc = await db.collection('lobbies').doc(lobbyId).get();
        if (!existingDoc.exists)
            break;
        lobbyId = generateLobbyId();
        attempts++;
    }
    if (attempts >= maxAttempts) {
        throw new https_1.HttpsError('internal', 'Failed to generate unique lobby ID');
    }
    const uuid = require('crypto').randomUUID();
    const { isPrivate, challengeMode } = request.data;
    // Determine lobby name: use provided name or default to lobbyId
    let lobbyName = lobbyId;
    if (name && typeof name === 'string' && name.trim().length > 0) {
        const trimmedName = name.trim();
        if (trimmedName.length > exports.MAX_LOBBY_NAME_LENGTH) {
            throw new https_1.HttpsError('invalid-argument', `Lobby name must be ${exports.MAX_LOBBY_NAME_LENGTH} characters or less`);
        }
        if ((0, profanityFilter_1.containsProfanity)(trimmedName)) {
            throw new https_1.HttpsError('invalid-argument', 'Lobby name contains inappropriate language');
        }
        lobbyName = trimmedName;
    }
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await lobbyRef.set({
        name: lobbyName,
        createdBy: userId,
        maxPlayers,
        uuid,
        players: [userId],
        teams: { [userId]: null },
        status: 'waiting',
        onGoingGame: null,
        historicalScores: { 0: 0, 1: 0 },
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        lastActivityAt: Date.now(),
        stale: false,
        isPrivate: isPrivate || false,
        challengeMode: challengeMode || false
    });
    await updateUserCurrentLobby(userId, lobbyId);
    return { success: true, lobbyId };
});
exports.joinLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:joinLobby');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    const lobbySnap = await lobbyRef.get();
    if (!lobbySnap.exists) {
        throw new https_1.HttpsError('not-found', 'Lobby not found');
    }
    const lobbyData = lobbySnap.data();
    if (lobbyData.players.includes(userId)) {
        return { success: true }; // Already in lobby
    }
    if (lobbyData.players.length >= lobbyData.maxPlayers) {
        throw new https_1.HttpsError('failed-precondition', 'Lobby is full');
    }
    if (lobbyData.status !== 'waiting') {
        throw new https_1.HttpsError('failed-precondition', 'Lobby is not accepting new players');
    }
    await leaveCurrentLobby(userId, lobbyId);
    const updatedTeams = { ...lobbyData.teams, [userId]: null };
    await lobbyRef.update({
        players: firestore_1.FieldValue.arrayUnion(userId),
        teams: updatedTeams,
        lastActivityAt: Date.now(),
        stale: false
    });
    await updateUserCurrentLobby(userId, lobbyId);
    return { success: true };
});
exports.leaveLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:leaveLobby');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    const lobbySnap = await lobbyRef.get();
    if (lobbySnap.exists) {
        const lobbyData = lobbySnap.data();
        const updatedPlayers = lobbyData.players.filter(playerId => playerId !== userId);
        const isHost = lobbyData.createdBy === userId;
        if (updatedPlayers.length === 0) {
            await moveLobbyToDeleted(lobbyId, lobbyData);
        }
        else {
            const updatedTeams = { ...lobbyData.teams };
            delete updatedTeams[userId];
            const updateData = {
                players: firestore_1.FieldValue.arrayRemove(userId),
                teams: updatedTeams,
                lastActivityAt: Date.now(),
                stale: false
            };
            if (isHost && updatedPlayers.length > 0) {
                updateData.createdBy = updatedPlayers[0];
            }
            await lobbyRef.update(updateData);
        }
    }
    await updateUserCurrentLobby(userId, null);
    return { success: true };
});
exports.deleteLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:deleteLobby');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    const lobbySnap = await lobbyRef.get();
    if (!lobbySnap.exists) {
        throw new https_1.HttpsError('not-found', 'Lobby not found');
    }
    const lobbyData = lobbySnap.data();
    if (lobbyData.createdBy !== userId) {
        throw new https_1.HttpsError('permission-denied', 'Only the host can delete the lobby');
    }
    // Clear currentLobbyId for all players
    for (const playerId of lobbyData.players) {
        await updateUserCurrentLobby(playerId, null);
    }
    await moveLobbyToDeleted(lobbyId, lobbyData);
    return { success: true };
});
exports.joinTeam = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId, team } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    if (team !== 0 && team !== 1) {
        throw new https_1.HttpsError('invalid-argument', 'team must be 0 or 1');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:joinTeam');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        if (!lobbyData.players.includes(userId)) {
            throw new https_1.HttpsError('permission-denied', 'User is not in this lobby');
        }
        if (lobbyData.status !== 'waiting') {
            throw new https_1.HttpsError('failed-precondition', 'Lobby is not accepting team changes');
        }
        transaction.update(lobbyRef, {
            teams: { ...lobbyData.teams, [userId]: team },
            lastActivityAt: Date.now(),
            stale: false
        });
    });
    return { success: true };
});
exports.leaveTeam = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:leaveTeam');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        if (!lobbyData.players.includes(userId)) {
            throw new https_1.HttpsError('permission-denied', 'User is not in this lobby');
        }
        if (lobbyData.status !== 'waiting') {
            throw new https_1.HttpsError('failed-precondition', 'Lobby is not accepting team changes');
        }
        transaction.update(lobbyRef, {
            teams: { ...lobbyData.teams, [userId]: null },
            lastActivityAt: Date.now(),
            stale: false
        });
    });
    return { success: true };
});
exports.swapPlayerTeam = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId, playerId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    if (!playerId || typeof playerId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'playerId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:swapPlayerTeam');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        // Only host can swap other players
        if (lobbyData.createdBy !== userId && playerId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Only the host can swap other players');
        }
        if (lobbyData.status !== 'waiting') {
            throw new https_1.HttpsError('failed-precondition', 'Lobby is not accepting team changes');
        }
        const currentTeam = lobbyData.teams[playerId];
        if (currentTeam === null || currentTeam === undefined) {
            throw new https_1.HttpsError('failed-precondition', 'Player must be assigned to a team before swapping');
        }
        transaction.update(lobbyRef, {
            teams: { ...lobbyData.teams, [playerId]: currentTeam === 0 ? 1 : 0 },
            lastActivityAt: Date.now(),
            stale: false
        });
    });
    return { success: true };
});
exports.randomizeTeams = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:randomizeTeams');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        // Only host can randomize
        if (lobbyData.createdBy !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Only the host can randomize teams');
        }
        if (lobbyData.status !== 'waiting') {
            throw new https_1.HttpsError('failed-precondition', 'Lobby is not accepting team changes');
        }
        const shuffledPlayers = [...lobbyData.players];
        for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
        }
        const newTeams = {};
        const teamSize = Math.ceil(shuffledPlayers.length / 2);
        shuffledPlayers.forEach((player, i) => {
            newTeams[player] = i < teamSize ? 0 : 1;
        });
        transaction.update(lobbyRef, {
            teams: newTeams,
            lastActivityAt: Date.now(),
            stale: false
        });
    });
    return { success: true };
});
exports.updateLobbySettings = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId, challengeMode } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:updateLobbySettings');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        // Only host can update settings
        if (lobbyData.createdBy !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Only the host can update lobby settings');
        }
        if (lobbyData.status !== 'waiting') {
            throw new https_1.HttpsError('failed-precondition', 'Cannot change settings while game is in progress');
        }
        const updateData = {
            lastActivityAt: Date.now(),
            stale: false
        };
        if (typeof challengeMode === 'boolean') {
            updateData.challengeMode = challengeMode;
        }
        transaction.update(lobbyRef, updateData);
    });
    return { success: true };
});
exports.startLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:startLobby');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    const lobbySnap = await lobbyRef.get();
    if (!lobbySnap.exists) {
        throw new https_1.HttpsError('not-found', 'Lobby not found');
    }
    const lobbyData = lobbySnap.data();
    // Only host can start
    if (lobbyData.createdBy !== userId) {
        throw new https_1.HttpsError('permission-denied', 'Only the host can start the game');
    }
    if (!areTeamsEven(lobbyData)) {
        throw new https_1.HttpsError('failed-precondition', 'Teams must be even to start the game');
    }
    const teamAssignments = {};
    for (const playerId of lobbyData.players) {
        const team = lobbyData.teams[playerId];
        if (team === null) {
            throw new https_1.HttpsError('failed-precondition', 'All players must be assigned to a team');
        }
        teamAssignments[playerId] = team;
    }
    const gameDocId = await (0, game_1.createGame)(lobbyId, lobbyData.players, teamAssignments, lobbyData.uuid || lobbyId, lobbyData.challengeMode || false);
    await lobbyRef.update({
        status: 'playing',
        onGoingGame: gameDocId,
        historicalScores: lobbyData.historicalScores || { 0: 0, 1: 0 },
        lastActivityAt: Date.now(),
        stale: false
    });
    return { success: true, gameDocId };
});
exports.returnToLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { lobbyId } = request.data;
    if (!lobbyId || typeof lobbyId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'lobbyId is required');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'lobby:returnToLobby');
    const lobbyRef = db.collection('lobbies').doc(lobbyId);
    const gameDocId = await db.runTransaction(async (transaction) => {
        const lobbySnap = await transaction.get(lobbyRef);
        if (!lobbySnap.exists) {
            throw new https_1.HttpsError('not-found', 'Lobby not found');
        }
        const lobbyData = lobbySnap.data();
        // Only allow players in the lobby or the host to return
        if (!lobbyData.players.includes(userId)) {
            throw new https_1.HttpsError('permission-denied', 'You are not in this lobby');
        }
        const onGoingGame = lobbyData.onGoingGame;
        transaction.update(lobbyRef, {
            status: 'waiting',
            onGoingGame: null,
            lastActivityAt: Date.now(),
            stale: false
        });
        return onGoingGame;
    });
    // Archive the completed game if one exists
    if (gameDocId) {
        await (0, game_1.archiveCompletedGameFromLobby)(gameDocId);
    }
    return { success: true };
});
// Scheduled function to check for stale lobbies
// Runs every 15 minutes to mark lobbies as stale if inactive for 30 minutes
const LOBBY_STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
exports.checkInactiveLobbies = (0, scheduler_1.onSchedule)('every 15 minutes', async () => {
    const now = Date.now();
    const staleThreshold = now - LOBBY_STALE_THRESHOLD_MS;
    // Find waiting lobbies that are inactive for 30+ minutes (filter at DB level)
    const lobbiesSnapshot = await db.collection('lobbies')
        .where('status', '==', 'waiting')
        .where('stale', '!=', true)
        .where('lastActivityAt', '<', staleThreshold)
        .get();
    for (const lobbyDoc of lobbiesSnapshot.docs) {
        await lobbyDoc.ref.update({ stale: true });
        console.log(`Lobby ${lobbyDoc.id} marked as stale`);
    }
});
//# sourceMappingURL=lobby.js.map