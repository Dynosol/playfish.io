import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage, subscribeToMessages, type ChatMessage } from '../firebase/chatService';

interface ChatBoxProps {
  gameId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ gameId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const userName = user.displayName || `User ${user.uid.slice(0, 8)}`;
      await sendMessage(gameId, user.uid, userName, inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div>
        Chat
      </div>
      <div>
        {messages.length === 0 ? (
          <div>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.userId === user?.uid;
            return (
              <div key={msg.id}>
                <div>
                  {isCurrentUser ? 'You' : msg.userName} -- {msg.message} -- {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending || !user}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || sending || !user}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;

