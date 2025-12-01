import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTTSResult {
  isPlaying: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

/**
 * Hook to handle Text-to-Speech functionality using Web Speech API
 * Falls back to browser's built-in speech synthesis
 */
export function useTTS(): UseTTSResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('speechSynthesis' in window) {
      setIsSupported(true);
    } else {
      setError('浏览器不支持语音合成');
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setError(null);

      if (!isSupported) {
        throw new Error('浏览器不支持语音合成');
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure voice settings
      utterance.lang = 'zh-CN'; // Chinese
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume

      // Try to use a Chinese voice if available
      const voices = window.speechSynthesis.getVoices();
      const chineseVoice = voices.find(voice => 
        voice.lang.startsWith('zh') || voice.lang.startsWith('cmn')
      );
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }

      // Set up event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setError(`语音播放失败: ${event.error}`);
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : '语音合成失败');
      setIsPlaying(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    utteranceRef.current = null;
  }, []);

  return {
    isPlaying,
    speak,
    stop,
    error,
  };
}
