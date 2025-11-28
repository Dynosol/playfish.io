import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage, subscribeToMessages, type ChatMessage } from '../firebase/chatService';
import { useUsername } from '../hooks/useUsername';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Minus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ChatBoxProps {
  gameId: string;
  className?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ gameId, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadCountRef = useRef(0);
  const { user } = useAuth();
  const username = useUsername(user?.uid);

  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribeToMessages(gameId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isMinimized) {
      lastReadCountRef.current = messages.length;
      setUnreadCount(0);
    } else {
      const count = messages.length - lastReadCountRef.current;
      if (count > 0) setUnreadCount(count);
    }
  }, [messages, isMinimized]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const userName = username || `User ${user.uid.slice(0, 16)}`;
      await sendMessage(gameId, user.uid, userName, inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    lastReadCountRef.current = messages.length;
    setUnreadCount(0);
  };

  if (isMinimized) {
    return (
      <div className={cn("relative", className)}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-12 w-12"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full text-[10px] border-2 border-background pointer-events-none">
            {unreadCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-80 flex flex-col h-[400px]", className)}>
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-muted/50">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={handleMinimize}>
          <Minus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground mt-4">
                No messages yet.
              </div>
            ) : (
              messages.map((msg) => {
                const isCurrentUser = msg.userId === user?.uid;
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col max-w-[85%] text-xs",
                      isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground mb-0.5">
                      {isCurrentUser ? 'You' : msg.userName}
                      <span className="ml-1.5 opacity-70">{formatTimestamp(msg.timestamp)}</span>
                    </span>
                    <div 
                      className={cn(
                        "rounded-lg px-3 py-2",
                        isCurrentUser 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="p-3 border-t bg-background">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type..."
              disabled={sending || !user}
              className="h-8 text-xs"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!inputMessage.trim() || sending || !user}
            >
              <Send className="h-3 w-3" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBox;
