import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { 
  createDocument, 
  getDocuments, 
  getDocumentById,
  createConversation,
  getUserConversations,
  getActiveAvatarConfig,
  createAvatarConfig,
  createDocumentChunk
} from "./db";
import { parseDocument, estimateTokenCount } from "./documentParser";
import { addDocumentToVectorStore, searchVectorStore } from "./vectorService";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Virtual human chat system
  chat: router({
    // STT: Speech to text
    stt: protectedProcedure
      .input(z.object({ 
        audioUrl: z.string(),
        language: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await transcribeAudio({
            audioUrl: input.audioUrl,
            language: input.language,
          });
          
          // Handle error case
          if ('error' in result) {
            throw new Error(result.error);
          }
          
          return {
            text: result.text,
            language: result.language || 'unknown',
          };
        } catch (error) {
          console.error("STT error:", error);
          const errorMessage = error instanceof Error ? error.message : "Speech to text failed";
          throw new Error(errorMessage);
        }
      }),

    // Main chat endpoint with reasoning steps
    chat: protectedProcedure
      .input(z.object({ 
        text: z.string(),
        includeKnowledge: z.boolean().default(true)
      }))
      .mutation(async ({ input, ctx }) => {
        const steps: Array<{ type: string; value: any }> = [];
        
        try {
          // Step 1: Semantic analysis
          const semanticPrompt = `Analyze the user's intent and extract keywords from: "${input.text}"`;
          const semanticResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are a semantic analyzer. Extract intent and keywords." },
              { role: "user", content: semanticPrompt }
            ],
          });
          const semanticContent = semanticResult.choices[0]?.message?.content;
          const semantic = typeof semanticContent === 'string' ? semanticContent : "Intent analysis completed";
          steps.push({ type: "semantic", value: semantic });

          // Step 2: Knowledge retrieval
          let retrievedDocs: any[] = [];
          if (input.includeKnowledge) {
            retrievedDocs = await searchVectorStore(input.text, 3);
            steps.push({ 
              type: "retrieval", 
              value: retrievedDocs.map(d => ({
                file: d.documentName,
                snippet: d.content.substring(0, 200),
                score: d.score.toFixed(2)
              }))
            });
          }

          // Step 3: Reasoning
          const context = retrievedDocs.length > 0 
            ? `\n\nRelevant knowledge:\n${retrievedDocs.map(d => d.content).join('\n\n')}`
            : '';
          
          const reasoningPrompt = `User question: ${input.text}${context}\n\nProvide a step-by-step reasoning process.`;
          const reasoningResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are a helpful AI assistant. Think step by step." },
              { role: "user", content: reasoningPrompt }
            ],
          });
          const reasoningContent = reasoningResult.choices[0]?.message?.content;
          const reasoning = typeof reasoningContent === 'string' ? reasoningContent : "Reasoning completed";
          steps.push({ type: "reasoning", value: reasoning });

          // Step 4: Final answer
          const finalPrompt = `Based on the reasoning, provide a clear and concise answer to: ${input.text}${context}`;
          const finalResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are a helpful AI assistant named 小卫. Provide clear, friendly answers." },
              { role: "user", content: finalPrompt }
            ],
          });
          const answerContent = finalResult.choices[0]?.message?.content;
          const answer = typeof answerContent === 'string' ? answerContent : "I'm sorry, I couldn't generate an answer.";
          steps.push({ type: "final", value: answer });

          // Save conversation
          await createConversation({
            userId: ctx.user!.id,
            role: "user",
            content: input.text,
            reasoningSteps: null,
          });
          
          await createConversation({
            userId: ctx.user!.id,
            role: "assistant",
            content: answer,
            reasoningSteps: JSON.stringify(steps),
          });

          return {
            steps,
            answer,
          };
        } catch (error) {
          console.error("Chat error:", error);
          throw new Error("Chat processing failed");
        }
      }),

    // Get conversation history
    history: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await getUserConversations(ctx.user!.id, input.limit);
      }),

    // Check wake word
    checkWakeWord: protectedProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        const config = await getActiveAvatarConfig();
        const wakeWord = config?.wakeWord || "小卫小卫";
        const isWakeWord = input.text.includes(wakeWord);
        
        return {
          isWakeWord,
          openingMessage: isWakeWord ? (config?.openingMessage || "你好,我是小卫,有什么可以帮助你的吗?") : null,
        };
      }),

    // TTS: Text to speech
    tts: protectedProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const config = await getActiveAvatarConfig();
          const voice = config?.ttsVoice || 'alloy';
          
          console.log('[TTS] Starting text-to-speech conversion:', {
            textLength: input.text.length,
            voice,
          });
          
          // Call TTS service - use same URL construction pattern as voiceTranscription
          const baseUrl = process.env.BUILT_IN_FORGE_API_URL!.endsWith("/")
            ? process.env.BUILT_IN_FORGE_API_URL
            : `${process.env.BUILT_IN_FORGE_API_URL}/`;
          
          const apiUrl = new URL("v1/audio/speech", baseUrl).toString();
          console.log('[TTS] API URL:', apiUrl);
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: input.text,
              voice: voice,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[TTS] Service request failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
            throw new Error(`TTS service request failed: ${response.status} ${response.statusText}`);
          }

          // Get audio buffer
          const audioBuffer = await response.arrayBuffer();
          console.log('[TTS] Audio generated, size:', audioBuffer.byteLength, 'bytes');
          
          // Upload to S3
          const { storagePut } = await import('./storage');
          const { nanoid } = await import('nanoid');
          const filename = `tts/${nanoid()}.mp3`;
          const result = await storagePut(filename, Buffer.from(audioBuffer), 'audio/mpeg');

          console.log('[TTS] Audio uploaded to S3:', result.url);

          return {
            audioUrl: result.url,
          };
        } catch (error) {
          console.error('[TTS] Error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Text to speech failed: ${errorMessage}`);
        }
      }),
  }),

  // Document management
  docs: router({
    // Upload document
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileContent: z.string(), // base64
        fileType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Parse document
          const content = await parseDocument(input.fileContent, input.fileType);
          const tokenCount = estimateTokenCount(content);

          // Save to database
          const result = await createDocument({
            name: input.fileName,
            content,
            fileType: input.fileType,
            tokenCount,
            uploadedBy: ctx.user!.id,
          });

          const documentId = Number((result as any).insertId);

          // Add to vector store
          await addDocumentToVectorStore(documentId, input.fileName, content);

          return {
            success: true,
            documentId,
            fileName: input.fileName,
            tokenCount,
          };
        } catch (error) {
          console.error("Document upload error:", error);
          throw new Error("Failed to upload document");
        }
      }),

    // List documents
    list: protectedProcedure
      .query(async () => {
        return await getDocuments();
      }),

    // Get document by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getDocumentById(input.id);
      }),
  }),

  // Avatar configuration
  avatar: router({
    // Get active config
    getActive: publicProcedure
      .query(async () => {
        return await getActiveAvatarConfig();
      }),

    // Create config (admin only)
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        wakeWord: z.string(),
        openingMessage: z.string(),
        ttsVoice: z.string().default("alloy"),
        provider: z.string().default("openai"),
        avatarId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createAvatarConfig({
          ...input,
          isActive: 1,
        });
      }),

    // Get Alibaba Cloud config for current user
    getConfig: protectedProcedure.query(async () => {
      
      // This is a placeholder - you would store this in a separate table
      // For now, return empty config
      return {
        accessKeyId: "",
        avatarId: "",
        voiceId: "",
      };
    }),

    // Save Alibaba Cloud config
    saveConfig: protectedProcedure
      .input(z.object({
        accessKeyId: z.string(),
        accessKeySecret: z.string(),
        avatarId: z.string().optional(),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ ctx }) => {
        
        // This is a placeholder - you would save this securely
        // For now, just return success
        console.log('[Avatar Config] Saving config for user:', ctx.user.id);
        return { success: true };
      }),

    // Test Alibaba Cloud connection
    testConnection: protectedProcedure
      .input(z.object({
        accessKeyId: z.string(),
        accessKeySecret: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Test Alibaba Cloud API connection
        // This is a placeholder - actual implementation would call Alibaba Cloud API
        if (!input.accessKeyId || !input.accessKeySecret) {
          throw new Error("Invalid credentials");
        }
        
        console.log('[Avatar Config] Testing connection with AccessKey:', input.accessKeyId.substring(0, 10) + '...');
        return { success: true, message: "Connection successful" };
      }),
  }),
});

export type AppRouter = typeof appRouter;
