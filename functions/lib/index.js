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
exports.checkInactiveGames = exports.forfeitGame = exports.returnToGame = exports.leaveGame = exports.voteForReplay = exports.finishDeclaration = exports.selectDeclarationTeam = exports.selectDeclarationHalfSuit = exports.abortDeclaration = exports.startDeclaration = exports.passTurnToTeammate = exports.askForCard = exports.checkInactiveLobbies = exports.returnToLobby = exports.startLobby = exports.randomizeTeams = exports.swapPlayerTeam = exports.leaveTeam = exports.joinTeam = exports.deleteLobby = exports.leaveLobby = exports.joinLobby = exports.createLobby = exports.updateUserCurrentLobby = exports.updateUserLastOnline = exports.updateUsername = exports.createOrUpdateUser = exports.submitFeedback = exports.sendMessage = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export all handlers
var chat_1 = require("./handlers/chat");
Object.defineProperty(exports, "sendMessage", { enumerable: true, get: function () { return chat_1.sendMessage; } });
var feedback_1 = require("./handlers/feedback");
Object.defineProperty(exports, "submitFeedback", { enumerable: true, get: function () { return feedback_1.submitFeedback; } });
var user_1 = require("./handlers/user");
Object.defineProperty(exports, "createOrUpdateUser", { enumerable: true, get: function () { return user_1.createOrUpdateUser; } });
Object.defineProperty(exports, "updateUsername", { enumerable: true, get: function () { return user_1.updateUsername; } });
Object.defineProperty(exports, "updateUserLastOnline", { enumerable: true, get: function () { return user_1.updateUserLastOnline; } });
Object.defineProperty(exports, "updateUserCurrentLobby", { enumerable: true, get: function () { return user_1.updateUserCurrentLobby; } });
var lobby_1 = require("./handlers/lobby");
Object.defineProperty(exports, "createLobby", { enumerable: true, get: function () { return lobby_1.createLobby; } });
Object.defineProperty(exports, "joinLobby", { enumerable: true, get: function () { return lobby_1.joinLobby; } });
Object.defineProperty(exports, "leaveLobby", { enumerable: true, get: function () { return lobby_1.leaveLobby; } });
Object.defineProperty(exports, "deleteLobby", { enumerable: true, get: function () { return lobby_1.deleteLobby; } });
Object.defineProperty(exports, "joinTeam", { enumerable: true, get: function () { return lobby_1.joinTeam; } });
Object.defineProperty(exports, "leaveTeam", { enumerable: true, get: function () { return lobby_1.leaveTeam; } });
Object.defineProperty(exports, "swapPlayerTeam", { enumerable: true, get: function () { return lobby_1.swapPlayerTeam; } });
Object.defineProperty(exports, "randomizeTeams", { enumerable: true, get: function () { return lobby_1.randomizeTeams; } });
Object.defineProperty(exports, "startLobby", { enumerable: true, get: function () { return lobby_1.startLobby; } });
Object.defineProperty(exports, "returnToLobby", { enumerable: true, get: function () { return lobby_1.returnToLobby; } });
Object.defineProperty(exports, "checkInactiveLobbies", { enumerable: true, get: function () { return lobby_1.checkInactiveLobbies; } });
var game_1 = require("./handlers/game");
Object.defineProperty(exports, "askForCard", { enumerable: true, get: function () { return game_1.askForCard; } });
Object.defineProperty(exports, "passTurnToTeammate", { enumerable: true, get: function () { return game_1.passTurnToTeammate; } });
Object.defineProperty(exports, "startDeclaration", { enumerable: true, get: function () { return game_1.startDeclaration; } });
Object.defineProperty(exports, "abortDeclaration", { enumerable: true, get: function () { return game_1.abortDeclaration; } });
Object.defineProperty(exports, "selectDeclarationHalfSuit", { enumerable: true, get: function () { return game_1.selectDeclarationHalfSuit; } });
Object.defineProperty(exports, "selectDeclarationTeam", { enumerable: true, get: function () { return game_1.selectDeclarationTeam; } });
Object.defineProperty(exports, "finishDeclaration", { enumerable: true, get: function () { return game_1.finishDeclaration; } });
Object.defineProperty(exports, "voteForReplay", { enumerable: true, get: function () { return game_1.voteForReplay; } });
Object.defineProperty(exports, "leaveGame", { enumerable: true, get: function () { return game_1.leaveGame; } });
Object.defineProperty(exports, "returnToGame", { enumerable: true, get: function () { return game_1.returnToGame; } });
Object.defineProperty(exports, "forfeitGame", { enumerable: true, get: function () { return game_1.forfeitGame; } });
Object.defineProperty(exports, "checkInactiveGames", { enumerable: true, get: function () { return game_1.checkInactiveGames; } });
//# sourceMappingURL=index.js.map