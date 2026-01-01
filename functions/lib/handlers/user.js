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
exports.updateUserCurrentLobby = exports.updateUserLastOnline = exports.updateUsername = exports.createOrUpdateUser = exports.MAX_USERNAME_LENGTH = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const rateLimiter_1 = require("../rateLimiter");
const usernameGenerator_1 = require("../utils/usernameGenerator");
const userColors_1 = require("../utils/userColors");
const profanityFilter_1 = require("../utils/profanityFilter");
const db = admin.firestore();
const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];
// Validation constants
exports.MAX_USERNAME_LENGTH = 20;
exports.createOrUpdateUser = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(uid, 'user:createOrUpdateUser');
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const data = userSnap.data();
        const updates = {
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastOnline: firestore_1.FieldValue.serverTimestamp()
        };
        // Migrate existing users without color
        if (!data?.color) {
            updates.color = (0, userColors_1.getRandomUserColor)();
        }
        await userRef.set(updates, { merge: true });
    }
    else {
        await userRef.set({
            uid,
            username: (0, usernameGenerator_1.generateUsername)(),
            color: (0, userColors_1.getRandomUserColor)(),
            currentLobbyId: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastOnline: firestore_1.FieldValue.serverTimestamp()
        });
    }
    return { success: true };
});
exports.updateUsername = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    const { username } = request.data;
    // Validate input
    if (!username || typeof username !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'username is required');
    }
    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Username cannot be empty');
    }
    if (trimmedUsername.length > exports.MAX_USERNAME_LENGTH) {
        throw new https_1.HttpsError('invalid-argument', `Username must be ${exports.MAX_USERNAME_LENGTH} characters or less`);
    }
    if ((0, profanityFilter_1.containsProfanity)(trimmedUsername)) {
        throw new https_1.HttpsError('invalid-argument', 'Username contains inappropriate language');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(uid, 'user:updateUsername');
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        username: trimmedUsername,
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
});
exports.updateUserLastOnline = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(uid, 'user:updateUserLastOnline');
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        lastOnline: firestore_1.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
});
exports.updateUserCurrentLobby = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    const { lobbyId } = request.data;
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(uid, 'user:updateUserCurrentLobby');
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        currentLobbyId: lobbyId,
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=user.js.map