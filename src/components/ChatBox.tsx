import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage, subscribeToMessages, GLOBAL_CHAT_ID, type ChatMessage } from '../firebase/chatService';
import { useUsername, useUsers } from '../hooks/useUsername';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getUserColorHex } from '../utils/userColors';

interface ChatBoxProps {
  chatId: string;
  className?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ chatId, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const { user } = useAuth();
  const username = useUsername(user?.uid);

  const isGlobalChat = chatId === GLOBAL_CHAT_ID;

  // Get unique user IDs from messages to fetch their colors
  const messageUserIds = useMemo(() =>
    [...new Set(messages.map(m => m.userId))],
    [messages]
  );
  const usersData = useUsers(messageUserIds);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll within the chat container only, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    const locale = navigator.language || 'en-US';
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString(locale, timeOptions);
    } else {
      return messageDate.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        ...timeOptions
      });
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
    <Card className={cn("w-72 flex flex-col bg-transparent border border-gray-300 rounded-lg", className)}>
      <CardHeader className="p-3 flex flex-row items-center space-y-0 shrink-0 border-b border-gray-200">
        <CardTitle className="text-sm font-medium">
          {isGlobalChat ? 'Global Chat' : 'Chat'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col">
        <div
          ref={messagesContainerRef}
          className="h-80 overflow-y-auto p-3"
          onMouseDown={(e) => {
            // Prevent clicks on messages area from stealing focus from input
            e.preventDefault();
          }}
        >
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground mt-4">
                No messages yet.
              </div>
            ) : (
              messages.map((msg, index) => {
                const isCurrentUser = msg.userId === user?.uid;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showName = !prevMsg || prevMsg.userId !== msg.userId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] text-sm",
                      isCurrentUser ? "ml-auto items-end" : "mr-auto items-start",
                      !showName && "mt-[-12px]"
                    )}
                  >
                    {showName && (
                      <span
                        className="text-xs mb-0.5 font-semibold"
                        style={{ color: getUserColorHex(usersData.get(msg.userId)?.color || 'slate') }}
                      >
                        {isCurrentUser ? 'You' : msg.userName}
                      </span>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="py-1">
                        {msg.message}
                      </div>
                      <span className="text-xs text-muted-foreground opacity-70 shrink-0">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="p-3">
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
  );
};

export default ChatBox;
