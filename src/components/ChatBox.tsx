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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: '1px solid #ccc',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #ccc',
        backgroundColor: '#fff',
        borderRadius: '8px 8px 0 0',
        fontWeight: 'bold'
      }}>
        Chat
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            color: '#999',
            textAlign: 'center',
            padding: '20px'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.userId === user?.uid;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '4px',
                  paddingLeft: isCurrentUser ? '0' : '4px',
                  paddingRight: isCurrentUser ? '4px' : '0'
                }}>
                  {isCurrentUser ? 'You' : msg.userName}
                </div>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: isCurrentUser ? '#007bff' : '#fff',
                  color: isCurrentUser ? '#fff' : '#000',
                  border: isCurrentUser ? 'none' : '1px solid #ddd',
                  wordWrap: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {msg.message}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#999',
                  marginTop: '2px',
                  paddingLeft: isCurrentUser ? '0' : '4px',
                  paddingRight: isCurrentUser ? '4px' : '0'
                }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{
        padding: '12px',
        borderTop: '1px solid #ccc',
        backgroundColor: '#fff',
        borderRadius: '0 0 8px 8px',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending || !user}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '20px',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || sending || !user}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            cursor: sending || !user ? 'not-allowed' : 'pointer',
            opacity: sending || !user ? 0.5 : 1,
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;

