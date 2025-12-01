import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderResult {
  isRecording: boolean;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('无法访问麦克风，请检查权限设置');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - startTimeRef.current;
        
        // Check minimum recording duration (at least 0.5 seconds)
        if (duration < 500) {
          setError('录音时间太短,请至少录制0.5秒');
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          resolve(null);
          return;
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Check blob size
        if (audioBlob.size === 0) {
          setError('录音数据为空,请重试');
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          resolve(null);
          return;
        }
        
        // Convert to base64 for upload
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(',')[1];
          
          // Upload to server storage
          try {
            const response = await fetch('/api/upload-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Data }),
            });
            
            if (response.ok) {
              const { url } = await response.json();
              setAudioUrl(url);
              resolve(url);
            } else {
              setError('音频上传失败');
              resolve(null);
            }
          } catch (err) {
            console.error('Error uploading audio:', err);
            setError('音频上传失败');
            resolve(null);
          }
        };
        
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  }, []);

  return {
    isRecording,
    audioUrl,
    startRecording,
    stopRecording,
    error,
  };
}
