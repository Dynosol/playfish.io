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
exports.sendMessage = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const rateLimiter_1 = require("../rateLimiter");
const db = admin.firestore();
const corsOrigins = ['https://playfish.io', 'http://localhost:5173', 'http://localhost:3000'];
exports.sendMessage = (0, https_1.onCall)({ cors: corsOrigins, invoker: 'public' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const userId = request.auth.uid;
    const { chatId, message } = request.data;
    // Validate input
    if (!chatId || typeof chatId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'chatId is required');
    }
    if (!message || typeof message !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'message is required');
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'message cannot be empty');
    }
    if (trimmedMessage.length > 500) {
        throw new https_1.HttpsError('invalid-argument', 'message is too long (max 500 characters)');
    }
    // Check rate limit
    await (0, rateLimiter_1.checkRateLimit)(userId, 'chat:sendMessage');
    // Get user's display name
    const userDoc = await db.collection('users').doc(userId).get();
    const userName = userDoc.exists
        ? (userDoc.data()?.username || `User ${userId.slice(0, 16)}`)
        : `User ${userId.slice(0, 16)}`;
    // Add message
    const messagesRef = db.collection('chats').doc(chatId).collection('messages');
    await messagesRef.add({
        userId,
        userName,
        message: trimmedMessage,
        timestamp: firestore_1.FieldValue.serverTimestamp()
    });
    return { success: true };
});
//# sourceMappingURL=chat.js.map