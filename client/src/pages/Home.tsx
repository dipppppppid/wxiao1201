import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, Menu, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import ReasoningPanel from "@/components/ReasoningPanel";
import ChatPanel from "@/components/ChatPanel";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { usePersistedMessages } from "@/hooks/usePersistedMessages";
import { useTTS } from "@/hooks/useTTS";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ReasoningStep {
  type: string;
  value: any;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { messages, addMessage } = usePersistedMessages();
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [isAwake, setIsAwake] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder();
  const { isPlaying: isTTSPlaying, speak } = useTTS();
  
  const sttMutation = trpc.chat.stt.useMutation();
  const chatMutation = trpc.chat.chat.useMutation();
  const checkWakeWordMutation = trpc.chat.checkWakeWord.useMutation();
  
  // Update speaking state based on TTS
  useEffect(() => {
    setIsSpeaking(isTTSPlaying);
  }, [isTTSPlaying]);

  // Show login prompt if not authenticated
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-6 p-8 max-w-md">
          <h1 className="text-4xl font-bold">虚拟人语音互动系统</h1>
          <p className="text-lg text-muted-foreground">请先登录以使用系统</p>
          <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  const handleStartListening = async () => {
    try {
      await startRecording();
    } catch (err) {
      toast.error("无法启动录音");
    }
  };

  const handleStopListening = async () => {
    try {
      const audioUrl = await stopRecording();
      
      if (!audioUrl) {
        toast.error("录音失败");
        return;
      }

      // Call STT
      const sttResult = await sttMutation.mutateAsync({ audioUrl });
      const userText = sttResult.text;

      // Add user message
      addMessage({
        role: "user",
        content: userText,
        timestamp: new Date(),
      });

      // Check for wake word
      const wakeWordResult = await checkWakeWordMutation.mutateAsync({ text: userText });
      
      if (wakeWordResult.isWakeWord) {
        setIsAwake(true);
        toast.success("虚拟人已唤醒!");
        
        if (wakeWordResult.openingMessage) {
          addMessage({
            role: "assistant",
            content: wakeWordResult.openingMessage!,
            timestamp: new Date(),
          });
          // Play opening message
          await speak(wakeWordResult.openingMessage!);
        }
        return;
      }

      // Process chat
      const chatResult = await chatMutation.mutateAsync({ 
        text: userText,
        includeKnowledge: true 
      });

      // Update reasoning steps
      setReasoningSteps(chatResult.steps);

      // Add assistant message
      addMessage({
        role: "assistant",
        content: chatResult.answer,
        timestamp: new Date(),
      });

      // Play answer with TTS
      await speak(chatResult.answer);

    } catch (err) {
      console.error("Error processing voice:", err);
      const errorMessage = err instanceof Error ? err.message : "处理语音时出错";
      toast.error(errorMessage);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">虚拟人语音互动系统</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/avatar-config")}>
            <Settings className="w-4 h-4 mr-2" />
            虚拟人配置
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/documents")}>
            <FileText className="w-4 h-4 mr-2" />
            知识库管理
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      {/* Main content - Three column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Reasoning Panel */}
        <ReasoningPanel steps={reasoningSteps} />

        {/* Center: Avatar Display */}
        <AvatarDisplay
          isListening={isRecording}
          isAwake={isAwake}
          isSpeaking={isSpeaking}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
        />

        {/* Right: Chat Panel */}
        <ChatPanel messages={messages} />
      </div>
    </div>
  );
}
