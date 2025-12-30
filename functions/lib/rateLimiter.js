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
exports.checkRateLimit = checkRateLimit;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const RATE_LIMITS = {
    // Chat
    'chat:sendMessage': { maxRequests: 50, windowMs: 60000 },
    // Game actions
    'game:askForCard': { maxRequests: 30, windowMs: 60000 },
    'game:startDeclaration': { maxRequests: 10, windowMs: 60000 },
    'game:finishDeclaration': { maxRequests: 10, windowMs: 60000 },
    'game:voteForReplay': { maxRequests: 5, windowMs: 60000 },
    'game:leaveGame': { maxRequests: 5, windowMs: 60000 },
    'game:returnToGame': { maxRequests: 5, windowMs: 60000 },
    'game:forfeitGame': { maxRequests: 3, windowMs: 60000 },
    // Lobby actions
    'lobby:createLobby': { maxRequests: 5, windowMs: 60000 },
    'lobby:joinLobby': { maxRequests: 10, windowMs: 60000 },
    'lobby:leaveLobby': { maxRequests: 10, windowMs: 60000 },
    'lobby:deleteLobby': { maxRequests: 5, windowMs: 60000 },
    'lobby:joinTeam': { maxRequests: 20, windowMs: 60000 },
    'lobby:swapPlayerTeam': { maxRequests: 20, windowMs: 60000 },
    'lobby:randomizeTeams': { maxRequests: 10, windowMs: 60000 },
    'lobby:startLobby': { maxRequests: 5, windowMs: 60000 },
    'lobby:returnToLobby': { maxRequests: 5, windowMs: 60000 },
    // User actions
    'user:updateUsername': { maxRequests: 5, windowMs: 60000 },
    'user:createOrUpdateUser': { maxRequests: 10, windowMs: 60000 },
    'user:updateUserLastOnline': { maxRequests: 60, windowMs: 60000 },
};
async function checkRateLimit(userId, action) {
    const config = RATE_LIMITS[action];
    if (!config) {
        console.warn(`Unknown rate limit action: ${action}`);
        return; // Allow unknown actions (safer default during migration)
    }
    const db = admin.firestore();
    const docId = `${userId}_${action.replace(':', '_')}`;
    const docRef = db.collection('rateLimits').doc(docId);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        let timestamps = [];
        if (doc.exists) {
            const data = doc.data();
            timestamps = (data?.timestamps || [])
                .filter((ts) => ts > windowStart);
        }
        if (timestamps.length >= config.maxRequests) {
            const oldestTimestamp = Math.min(...timestamps);
            const retryAfterMs = oldestTimestamp + config.windowMs - now;
            throw new https_1.HttpsError('resource-exhausted', `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000} seconds. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`);
        }
        timestamps.push(now);
        transaction.set(docRef, {
            userId,
            action,
            timestamps,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
    });
}
//# sourceMappingURL=rateLimiter.js.map