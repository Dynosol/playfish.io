import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { subscribeToMessages } from '../firebase/chatService';
import type { ChatMessage } from '../firebase/chatService';

interface ChatSubscription {
  messages: ChatMessage[];
  subscriberCount: number;
  unsubscribe: (() => void) | null;
}

interface ChatContextType {
  getMessages: (chatId: string) => ChatMessage[];
  subscribe: (chatId: string, isGlobalChat: boolean) => void;
  unsubscribe: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscriptionsRef = useRef<Map<string, ChatSubscription>>(new Map());
  const [, forceUpdate] = useState({});

  const subscribe = useCallback((chatId: string, isGlobalChat: boolean) => {
    const existing = subscriptionsRef.current.get(chatId);

    if (existing) {
      existing.subscriberCount++;
      return;
    }

    const subscription: ChatSubscription = {
      messages: [],
      subscriberCount: 1,
      unsubscribe: null,
    };

    subscription.unsubscribe = subscribeToMessages(
      chatId,
      (newMessages) => {
        const sub = subscriptionsRef.current.get(chatId);
        if (sub) {
          sub.messages = newMessages;
          forceUpdate({});
        }
      },
      isGlobalChat ? { maxAgeHours: 24 } : {}
    );

    subscriptionsRef.current.set(chatId, subscription);
  }, []);

  const unsubscribe = useCallback((chatId: string) => {
    const existing = subscriptionsRef.current.get(chatId);
    if (!existing) return;

    existing.subscriberCount--;

    if (existing.subscriberCount <= 0) {
      existing.unsubscribe?.();
      subscriptionsRef.current.delete(chatId);
      forceUpdate({});
    }
  }, []);

  const getMessages = useCallback((chatId: string) => {
    return subscriptionsRef.current.get(chatId)?.messages || [];
  }, []);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((sub) => {
        sub.unsubscribe?.();
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  return (
    <ChatContext.Provider value={{ getMessages, subscribe, unsubscribe }}>
      {children}
    </ChatContext.Provider>
  );
};
