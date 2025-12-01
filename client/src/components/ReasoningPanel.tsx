import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReasoningStep {
  type: string;
  value: any;
}

interface ReasoningPanelProps {
  steps: ReasoningStep[];
}

const stepTitles: Record<string, string> = {
  stt: "步骤1: 语音转文字",
  semantic: "步骤2: 语义解析",
  retrieval: "步骤3: 知识库检索",
  reasoning: "步骤4: 逻辑推理",
  final: "步骤5: 生成回答",
};

const stepColors: Record<string, string> = {
  stt: "bg-blue-500",
  semantic: "bg-purple-500",
  retrieval: "bg-green-500",
  reasoning: "bg-orange-500",
  final: "bg-red-500",
};

export default function ReasoningPanel({ steps }: ReasoningPanelProps) {
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show latest step
  useEffect(() => {
    if (stepsEndRef.current) {
      stepsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [steps]);

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full">
      {/* Fixed header */}
      <div className="p-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold">推理过程</h2>
        <p className="text-sm text-muted-foreground">实时展示AI思考流程</p>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {steps.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>等待对话开始...</p>
              <p className="text-xs mt-2">推理步骤将在这里显示</p>
            </div>
          ) : (
            steps.map((step, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${stepColors[step.type] || 'bg-gray-500'}`} />
                  <h3 className="font-semibold text-sm">
                    {stepTitles[step.type] || step.type}
                  </h3>
                </div>
                
                <div className="text-sm space-y-2">
                  {step.type === 'retrieval' && Array.isArray(step.value) ? (
                    <div className="space-y-2">
                      {step.value.length === 0 ? (
                        <p className="text-muted-foreground text-xs">未找到相关知识</p>
                      ) : (
                        step.value.map((doc: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary pl-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {doc.file}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                相似度: {doc.score}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {doc.snippet}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {typeof step.value === 'string' 
                        ? step.value 
                        : JSON.stringify(step.value, null, 2)}
                    </p>
                  )}
                </div>
              </Card>
            ))
          )}
          {/* Invisible element to scroll to */}
          <div ref={stepsEndRef} />
        </div>
        </ScrollArea>
      </div>
    </div>
  );
}
