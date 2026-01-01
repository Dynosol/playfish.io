import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChatContext } from '../contexts/ChatContext';
import { sendMessage, GLOBAL_CHAT_ID, type ChatMessage } from '../firebase/chatService';
import { useUsername, useUsers } from '../hooks/useUsername';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getUserColorHex } from '../utils/userColors';
import { colors } from '@/utils/colors';
import type { Turn, Declaration } from '../firebase/gameService';

const suitIcons: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

const scrollbarStyles = `
  .chat-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .chat-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .chat-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
`;

interface ChatBoxProps {
  chatId: string;
  className?: string;
  title?: string;
  gameTurns?: Turn[];
  declarations?: Declaration[];
  getUsername?: (playerId: string) => string;
  currentTurn?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatId, className, title, gameTurns, declarations, getUsername: getUsernameProp, currentTurn: _currentTurn }) => {
  const [inputMessage, setInputMessage] = useState('');
  const { user } = useAuth();
  const { getMessages, subscribe, unsubscribe } = useChatContext();
  const username = useUsername(user?.uid);

  const isGlobalChat = chatId === GLOBAL_CHAT_ID;

  // Subscribe/unsubscribe via ChatContext (reference counted - multiple instances share one subscription)
  useEffect(() => {
    if (!chatId) return;

    subscribe(chatId, isGlobalChat);

    return () => {
      unsubscribe(chatId);
    };
  }, [chatId, isGlobalChat, subscribe, unsubscribe]);

  // Get messages from context
  const messages = getMessages(chatId);

  // Get unique user IDs from messages to fetch their colors
  const messageUserIds = useMemo(() =>
    [...new Set(messages.map(m => m.userId))],
    [messages]
  );
  const usersData = useUsers(messageUserIds);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Merge messages and game events into a single timeline
  type TimelineItem =
    | { type: 'message'; data: ChatMessage }
    | { type: 'turn'; data: Turn; nextTurnPlayer: string }
    | { type: 'declaration'; data: Declaration };

  // Helper to get time from Date or Firestore Timestamp
  const getTime = (ts: Date | { toDate?: () => Date; seconds?: number }): number => {
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    return 0;
  };

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add messages
    messages.forEach(msg => {
      items.push({ type: 'message', data: msg });
    });

    // Sort messages by timestamp
    items.sort((a, b) => {
      const timeA = getTime(a.data.timestamp);
      const timeB = getTime(b.data.timestamp);
      return timeA - timeB;
    });

    // Add the latest game event (turn or declaration, whichever is more recent)
    if (getUsernameProp) {
      const lastTurn = gameTurns && gameTurns.length > 0 ? gameTurns[gameTurns.length - 1] : null;
      const lastDeclaration = declarations && declarations.length > 0 ? declarations[declarations.length - 1] : null;

      const lastTurnTime = lastTurn ? getTime(lastTurn.timestamp) : 0;
      const lastDeclarationTime = lastDeclaration ? getTime(lastDeclaration.timestamp) : 0;

      // Show whichever is more recent
      if (lastDeclarationTime > lastTurnTime && lastDeclaration) {
        items.push({ type: 'declaration', data: lastDeclaration });
      } else if (lastTurn) {
        const nextTurnPlayer = lastTurn.success
          ? lastTurn.askerId  // If successful, same player goes again
          : lastTurn.targetId; // If failed, target becomes the asker
        items.push({ type: 'turn', data: lastTurn, nextTurnPlayer });
      }
    }

    return items;
  }, [messages, gameTurns, declarations, getUsernameProp]);

  useEffect(() => {
    // Scroll within the chat container only, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [timeline]);

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    const locale = navigator.language || 'en-US';
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneName: 'short'
    };

    const timeStr = messageDate.toLocaleTimeString(locale, timeOptions);

    if (diffInHours < 24) {
      return `Today, ${timeStr}`;
    } else {
      const dateStr = messageDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      });
      return `${dateStr}, ${timeStr}`;
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputMessage.trim();
    if (!message || !user) return;

    // Clear immediately for instant feedback
    setInputMessage('');

    // Send in background
    const userName = username || `User ${user.uid.slice(0, 16)}`;
    sendMessage(chatId, user.uid, userName, message).catch((error) => {
      console.error('Failed to send message:', error);
    });
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <Card className={cn("w-full lg:w-72 flex flex-col border border-gray-300 rounded-lg", isGlobalChat ? "bg-white" : "bg-transparent", className)} style={{ height: 'calc(100vh - 12rem)' }}>
        <CardHeader className="p-3 flex flex-row items-center space-y-0 shrink-0 border-b border-gray-200 shadow">
        <CardTitle className="text-sm font-semibold">
          {title ?? (isGlobalChat ? 'Global Chat' : 'Chat')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 chat-scrollbar"
          onMouseDown={(e) => {
            // Prevent clicks on messages area from stealing focus from input
            e.preventDefault();
          }}
        >
          <TooltipProvider delayDuration={200}>
            <div className="space-y-0.5">
              {timeline.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground mt-4">
                  {isGlobalChat ? 'No messages found in the last 24 hours.\nStart the conversation!' : 'No messages yet.'}
                </div>
              ) : (
                timeline.map((item, index) => {
                  if (item.type === 'turn' && getUsernameProp) {
                    const turn = item.data;
                    const isRedSuit = turn.card.suit === 'hearts' || turn.card.suit === 'diamonds';
                    const suitColor = isRedSuit ? '#ef4444' : '#000000';
                    const askerName = getUsernameProp(turn.askerId);
                    const targetName = getUsernameProp(turn.targetId);
                    const nextPlayerName = getUsernameProp(item.nextTurnPlayer);

                    return (
                      <div key={`turn-${getTime(turn.timestamp)}-${index}`} className="text-center py-2 space-y-0.5">
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold">{askerName}</span>
                          {' asked '}
                          <span className="font-semibold">{targetName}</span>
                          {' for the '}
                          <span className="font-semibold">{turn.card.rank}</span>
                          {' of '}
                          <span style={{ color: suitColor }}>{suitIcons[turn.card.suit]}</span>
                          {', and was '}
                          <span
                            className="font-bold"
                            style={{ color: turn.success ? colors.purple : colors.red }}
                          >
                            {turn.success ? 'RIGHT' : 'WRONG'}
                          </span>
                          {'.'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {"It is now "}
                          <span className="font-semibold">{nextPlayerName}</span>
                          {"'s turn"}
                          {turn.success && ' (again)'}
                          {'.'}
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'declaration' && getUsernameProp) {
                    const declaration = item.data;
                    const declareeName = getUsernameProp(declaration.declareeId);
                    // Parse halfSuit like 'low-spades' into suit and range
                    const [range, suit] = declaration.halfSuit.split('-') as ['low' | 'high', keyof typeof suitIcons];
                    const isRedSuit = suit === 'hearts' || suit === 'diamonds';
                    const suitColor = isRedSuit ? '#ef4444' : '#000000';
                    const rangeLabel = range === 'low' ? '2-7' : '9-A';
                    const teamLabel = declaration.team === 0 ? 'Team 1' : 'Team 2';

                    return (
                      <div key={`declaration-${getTime(declaration.timestamp)}-${index}`} className="text-center py-2 space-y-0.5">
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold">{declareeName}</span>
                          {' declared '}
                          <span style={{ color: suitColor }}>{suitIcons[suit]}</span>
                          {' '}
                          <span className="font-semibold">{rangeLabel}</span>
                          {' for '}
                          <span className="font-semibold">{teamLabel}</span>
                          {', and was '}
                          <span
                            className="font-bold"
                            style={{ color: declaration.correct ? colors.green : colors.red }}
                          >
                            {declaration.correct ? 'CORRECT' : 'WRONG'}
                          </span>
                          {'!'}
                        </div>
                      </div>
                    );
                  }

                  // Regular chat message
                  const msg = item.data as ChatMessage;
                  const isCurrentUser = msg.userId === user?.uid;
                  const prevItem = index > 0 ? timeline[index - 1] : null;
                  const showName = !prevItem || prevItem.type !== 'message' || (prevItem.data as ChatMessage).userId !== msg.userId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] text-sm",
                        isCurrentUser ? "ml-auto items-end" : "mr-auto items-start",
                        !showName && "-mt-1"
                      )}
                    >
                      {showName && (
                        <span
                          className={`text-xs mb-0.5 font-semibold ${isCurrentUser ? 'italic' : ''}`}
                          style={{ color: getUserColorHex(usersData.get(msg.userId)?.color || 'slate') }}
                        >
                          {isCurrentUser ? 'You' : msg.userName}
                        </span>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="py-0.5 cursor-default">
                            {msg.message}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side={isCurrentUser ? "left" : "right"}>
                          {formatTimestamp(msg.timestamp)}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          </TooltipProvider>
        </div>
        <div className="p-3 shrink-0 border-t border-gray-100">
          <form onSubmit={handleSend}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!user}
              className="w-full h-8 px-3 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-400"
            />
          </form>
        </div>
      </CardContent>
      </Card>
    </>
  );
};

export default ChatBox;
