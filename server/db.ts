import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  documents, InsertDocument,
  models, InsertModel,
  avatarConfig, InsertAvatarConfig,
  conversations, InsertConversation,
  documentChunks, InsertDocumentChunk
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Document queries
export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  return result;
}

export async function getDocuments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Model queries
export async function createModel(model: InsertModel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(models).values(model);
}

export async function getActiveModels() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(models).where(eq(models.isActive, 1));
}

// Avatar config queries
export async function getActiveAvatarConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(avatarConfig).where(eq(avatarConfig.isActive, 1)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAvatarConfig(config: InsertAvatarConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(avatarConfig).values(config);
}

// Conversation queries
export async function createConversation(conv: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(conversations).values(conv);
}

export async function getUserConversations(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.createdAt))
    .limit(limit);
}

// Document chunks queries
export async function createDocumentChunk(chunk: InsertDocumentChunk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(documentChunks).values(chunk);
}

export async function getDocumentChunks(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
}
