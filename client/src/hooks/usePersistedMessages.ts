import { useState, useEffect } from 'react';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = 'virtual-human-messages';
const MAX_MESSAGES = 10;

/**
 * Hook to persist chat messages in localStorage
 * Keeps only the most recent 10 messages
 */
export function usePersistedMessages() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load messages from localStorage:', error);
    }
    return [];
  });

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      // Keep only the most recent MAX_MESSAGES
      const messagesToSave = messages.slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
    }
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages(prev => {
      const updated = [...prev, message];
      // Keep only the most recent MAX_MESSAGES
      return updated.slice(-MAX_MESSAGES);
    });
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    messages,
    addMessage,
    setMessages,
    clearMessages,
  };
}
