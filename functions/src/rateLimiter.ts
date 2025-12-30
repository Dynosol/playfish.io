import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
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

export async function checkRateLimit(
  userId: string,
  action: string
): Promise<void> {
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
    let timestamps: number[] = [];

    if (doc.exists) {
      const data = doc.data();
      timestamps = (data?.timestamps || [])
        .filter((ts: number) => ts > windowStart);
    }

    if (timestamps.length >= config.maxRequests) {
      const oldestTimestamp = Math.min(...timestamps);
      const retryAfterMs = oldestTimestamp + config.windowMs - now;

      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000} seconds. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`
      );
    }

    timestamps.push(now);
    transaction.set(docRef, {
      userId,
      action,
      timestamps,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
}
