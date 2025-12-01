import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarDisplayProps {
  isListening: boolean;
  isAwake: boolean;
  isSpeaking: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

function useRecordingTimer(isRecording: boolean) {
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    if (!isRecording) {
      setDuration(0);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRecording]);
  
  return duration;
}

export default function AvatarDisplay({
  isListening,
  isAwake,
  isSpeaking,
  onStartListening,
  onStopListening,
}: AvatarDisplayProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const recordingDuration = useRecordingTimer(isListening);

  useEffect(() => {
    if (isSpeaking) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [isSpeaking]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
      {/* Avatar Circle */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isAwake
              ? "bg-gradient-to-br from-blue-500 to-purple-500 blur-2xl opacity-50"
              : "bg-gradient-to-br from-gray-400 to-gray-600 blur-xl opacity-30"
          )}
        />
        
        {/* Main avatar circle */}
        <div
          className={cn(
            "relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500",
            "bg-gradient-to-br shadow-2xl",
            isAwake
              ? "from-blue-400 to-purple-600 scale-100"
              : "from-gray-300 to-gray-500 scale-95",
            pulseAnimation && "animate-pulse"
          )}
        >
          {/* Avatar text/icon */}
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-2">小卫</div>
            <div className="text-sm opacity-80">
              {isListening
                ? `正在聆听... ${recordingDuration}s`
                : isSpeaking
                ? "正在回答..."
                : isAwake
                ? "已唤醒"
                : "待机中"}
            </div>
          </div>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Volume2 className="w-6 h-6 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Listening indicator rings */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-75" style={{ animationDelay: '300ms' }} />
          </>
        )}
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isAwake ? "虚拟人已激活" : "点击按钮开始对话"}
        </h2>
        <p className="text-muted-foreground">
          {isAwake
            ? "说出\"小卫小卫\"可以唤醒我"
            : "按住麦克风按钮说话"}
        </p>
      </div>

      {/* Microphone button */}
      <div className="flex gap-4">
        <Button
          size="lg"
          variant={isListening ? "destructive" : "default"}
          className={cn(
            "w-16 h-16 rounded-full transition-all",
            isListening && "animate-pulse"
          )}
          onMouseDown={onStartListening}
          onMouseUp={onStopListening}
          onTouchStart={onStartListening}
          onTouchEnd={onStopListening}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        按住麦克风按钮说话,松开结束录音
      </p>
    </div>
  );
}
