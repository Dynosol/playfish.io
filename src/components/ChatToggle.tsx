import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileDrawer } from './layout/MobileDrawer';
import ChatBox from './ChatBox';
import { subscribeToMessages, type ChatMessage } from '../firebase/chatService';

interface ChatToggleProps {
  chatId: string;
  title?: string;
  className?: string;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ chatId, title, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number>(Date.now());

  // Track unread messages when drawer is closed
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, (messages: ChatMessage[]) => {
      if (!isOpen) {
        // Count messages newer than last seen
        const newMessages = messages.filter(
          msg => msg.timestamp.getTime() > lastSeenTimestamp
        );
        setUnreadCount(newMessages.length);
      }
    });

    return () => unsubscribe();
  }, [chatId, isOpen, lastSeenTimestamp]);

  // Reset unread count when opening drawer
  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
    setLastSeenTimestamp(Date.now());
  };

  const handleClose = () => {
    setIsOpen(false);
    setLastSeenTimestamp(Date.now());
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex items-center justify-center',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 active:scale-95',
          'transition-all duration-200',
          className
        )}
        aria-label={`Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <MessageCircle className="h-6 w-6" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Drawer */}
      <MobileDrawer
        isOpen={isOpen}
        onClose={handleClose}
        position="right"
        title={title || 'Chat'}
      >
        <ChatBox
          chatId={chatId}
          title={title}
          className="w-full h-full border-0 rounded-none"
        />
      </MobileDrawer>
    </>
  );
};

export default ChatToggle;
