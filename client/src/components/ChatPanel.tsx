import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatPanelProps {
  messages: Message[];
}

export default function ChatPanel({ messages }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col h-full">
      {/* Fixed header */}
      <div className="p-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold">对话记录</h2>
        <p className="text-sm text-muted-foreground">用户与虚拟人的交流</p>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>暂无对话记录</p>
              <p className="text-xs mt-2">开始说话与小卫互动</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={cn(
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  )}>
                    {message.role === "user" ? "我" : "卫"}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "flex-1 space-y-1",
                  message.role === "user" ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "inline-block rounded-lg px-3 py-2 max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  )}>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  {message.timestamp && (
                    <p className="text-xs text-muted-foreground px-1">
                      {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
        </ScrollArea>
      </div>
    </div>
  );
}
