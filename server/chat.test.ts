import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createAvatarConfig } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Virtual Human Chat System", () => {
  beforeAll(async () => {
    // Initialize avatar config for testing
    try {
      await createAvatarConfig({
        name: "小卫",
        wakeWord: "小卫小卫",
        openingMessage: "你好,我是小卫,有什么可以帮助你的吗?",
        ttsVoice: "alloy",
        provider: "openai",
        isActive: 1,
      });
    } catch (error) {
      // Config might already exist
    }
  });

  it("should check wake word correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.checkWakeWord({ text: "小卫小卫" });

    expect(result.isWakeWord).toBe(true);
    expect(result.openingMessage).toBeTruthy();
  });

  it("should not trigger wake word for normal text", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.checkWakeWord({ text: "今天天气怎么样" });

    expect(result.isWakeWord).toBe(false);
    expect(result.openingMessage).toBeNull();
  });

  it("should process chat with reasoning steps", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.chat({
      text: "你好",
      includeKnowledge: false,
    });

    expect(result.answer).toBeTruthy();
    expect(result.steps).toBeInstanceOf(Array);
    expect(result.steps.length).toBeGreaterThan(0);
    
    // Check for expected step types
    const stepTypes = result.steps.map(s => s.type);
    expect(stepTypes).toContain("semantic");
    expect(stepTypes).toContain("reasoning");
    expect(stepTypes).toContain("final");
  }, 30000);

  it("should retrieve conversation history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a conversation
    await caller.chat.chat({
      text: "测试消息",
      includeKnowledge: false,
    });

    // Then retrieve history
    const history = await caller.chat.history({ limit: 10 });

    expect(history).toBeInstanceOf(Array);
    expect(history.length).toBeGreaterThan(0);
  }, 30000);
});

describe("Document Management", () => {
  it("should list documents", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.docs.list();

    expect(documents).toBeInstanceOf(Array);
  });

  it("should upload a text document", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testContent = "这是一个测试文档的内容。";
    const base64Content = Buffer.from(testContent).toString("base64");

    const result = await caller.docs.upload({
      fileName: "test.txt",
      fileContent: base64Content,
      fileType: "text/plain",
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toBe("test.txt");
    expect(result.tokenCount).toBeGreaterThan(0);
  });
});

describe("Avatar Configuration", () => {
  it("should get active avatar config", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const config = await caller.avatar.getActive();

    expect(config).toBeTruthy();
    if (config) {
      expect(config.name).toBe("小卫");
      expect(config.wakeWord).toBe("小卫小卫");
    }
  });
});
