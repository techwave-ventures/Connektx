// services/databaseService.ts

import * as SQLite from 'expo-sqlite';

// --- Type Definitions (extended to support cached shared cards) ---
interface DbConversation {
    _id: string;
    participants: string;
    lastMessage?: string;
    status: 'active' | 'pending';
    updatedAt: string;
}

interface DbMessage {
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
    sender: string; // JSON string
    type?: 'normal' | 'system' | 'announcement';
    // Legacy ID columns (may be null)
    sharedPostId?: string | null;
    sharedNewsId?: string | null;
    sharedShowcaseId?: string | null;
    sharedUserId?: string | null;
    // New cached JSON blobs for shared cards
    sharedPostJson?: string | null;
    sharedNewsJson?: string | null;
    sharedShowcaseJson?: string | null;
    sharedUserJson?: string | null;
    // Optional generic preview metadata
    cardType?: string | null;
    previewTitle?: string | null;
    previewDescription?: string | null;
    previewImageUrl?: string | null;
    cardData?: string | null; // generic JSON
}

// A global variable to hold the database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initializes the database using the new async method.
 * Creates tables if they don't exist.
 */
export const initDatabase = async () => {
    if (db) return; // Prevent re-initialization

    try {
        // Open the database asynchronously
        const internalDb = await SQLite.openDatabaseAsync('ConnektX.db');

        // Create base tables if they don't exist
        await internalDb.withTransactionAsync(async () => {
            await internalDb.execAsync(
                `CREATE TABLE IF NOT EXISTS conversations (
                    _id TEXT PRIMARY KEY NOT NULL,
                    participants TEXT NOT NULL,
                    lastMessage TEXT,
                    status TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                );`
            );
            await internalDb.execAsync(
                `CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY NOT NULL,
                    conversationId TEXT NOT NULL,
                    content TEXT,
                    createdAt TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    type TEXT DEFAULT 'normal',
                    sharedPostId TEXT,
                    sharedNewsId TEXT,
                    sharedShowcaseId TEXT,
                    sharedUserId TEXT,
                    FOREIGN KEY (conversationId) REFERENCES conversations(_id)
                );`
            );
        });

        // Ensure new message columns exist (idempotent migration)
        await ensureMessageColumns(internalDb);

        db = internalDb;
        console.log("--- DB DEBUG: Modern database initialized successfully.");
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR initializing database:", error);
    }
};

/**
 * Ensures the database is initialized before performing an operation.
 */
const getDb = async (): Promise<SQLite.SQLiteDatabase | null> => {
    if (!db) {
        await initDatabase();
    }
    return db;
};

// --- Migration helper: add columns to messages table if missing ---
const ensureMessageColumns = async (database: SQLite.SQLiteDatabase) => {
    try {
        const rows: any[] = await database.getAllAsync("PRAGMA table_info(messages);");
        const existing = new Set(rows.map(r => r.name));
        const addColumn = async (name: string, type: string) => {
            if (!existing.has(name)) {
                await database.execAsync(`ALTER TABLE messages ADD COLUMN ${name} ${type};`);
                console.log(`--- DB DEBUG: Added column messages.${name}`);
            }
        };

        // JSON blobs for shared cards
        await addColumn('sharedPostJson', 'TEXT');
        await addColumn('sharedNewsJson', 'TEXT');
        await addColumn('sharedShowcaseJson', 'TEXT');
        await addColumn('sharedUserJson', 'TEXT');
        // Generic metadata
        await addColumn('cardType', 'TEXT');
        await addColumn('previewTitle', 'TEXT');
        await addColumn('previewDescription', 'TEXT');
        await addColumn('previewImageUrl', 'TEXT');
        await addColumn('cardData', 'TEXT');
    } catch (e) {
        console.error("--- DB DEBUG: ❌ ERROR ensuring message columns:", e);
    }
};

/**
 * Fetches all conversations from the local database.
 */
export const getLocalConversations = async (): Promise<any[]> => {
    const currentDb = await getDb();
    if (!currentDb) return [];

    try {
        const results = await currentDb.getAllAsync('SELECT * FROM conversations ORDER BY updatedAt DESC;');
        return results.map(c => ({
            ...c,
            participants: JSON.parse(c.participants as string),
            lastMessage: c.lastMessage ? JSON.parse(c.lastMessage as string) : null,
        }));
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR fetching local conversations:", error);
        return [];
    }
};

/**
 * Saves multiple conversations to the database.
 */
export const saveConversations = async (conversations: any[]) => {
    const currentDb = await getDb();
    if (!currentDb) return;

    try {
        // **FIX**: Use the database object directly.
        await currentDb.withTransactionAsync(async () => {
            for (const convo of conversations) {
                await currentDb.runAsync(
                    `INSERT OR REPLACE INTO conversations (_id, participants, lastMessage, status, updatedAt) VALUES (?, ?, ?, ?, ?);`,
                    [
                        convo._id,
                        JSON.stringify(convo.participants),
                        convo.lastMessage ? JSON.stringify(convo.lastMessage) : null,
                        convo.status,
                        convo.updatedAt,
                    ]
                );
            }
        });
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR saving conversations:", error);
    }
};

/**
 * Fetches all messages for a specific conversation.
 */
export const getLocalMessages = async (conversationId: string): Promise<any[]> => {
    const currentDb = await getDb();
    if (!currentDb) return [];

    try {
        const results = await currentDb.getAllAsync('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC;', [conversationId]);
        return results.map((m: any) => ({
            id: m.id,
            content: m.content || '',
            createdAt: m.createdAt,
            sender: JSON.parse(m.sender as string),
            type: m.type || 'normal',
            // Hydrated shared cards from cached JSON
            sharedPost: m.sharedPostJson ? JSON.parse(m.sharedPostJson as string) : null,
            sharedNews: m.sharedNewsJson ? JSON.parse(m.sharedNewsJson as string) : null,
            sharedShowcase: m.sharedShowcaseJson ? JSON.parse(m.sharedShowcaseJson as string) : null,
            sharedUser: m.sharedUserJson ? JSON.parse(m.sharedUserJson as string) : null,
            // Preview metadata (in case future UI needs it)
            cardType: m.cardType || null,
            previewTitle: m.previewTitle || null,
            previewDescription: m.previewDescription || null,
            previewImageUrl: m.previewImageUrl || null,
        }));
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR fetching local messages:", error);
        return [];
    }
};

/**
 * Saves multiple messages to the database.
 */
export const saveMessages = async (conversationId: string, messages: any[]) => {
    const currentDb = await getDb();
    if (!currentDb) return;

    try {
        await currentDb.withTransactionAsync(async () => {
            for (const msg of messages) {
                // Derive preview metadata and JSON blobs from any shared card
                const sharedPost = (msg.sharedPost ?? null) as any | null;
                const sharedNews = (msg.sharedNews ?? null) as any | null;
                const sharedShowcase = (msg.sharedShowcase ?? null) as any | null;
                const sharedUser = (msg.sharedUser ?? null) as any | null;

                let cardType: string | null = null;
                let previewTitle: string | null = null;
                let previewDescription: string | null = null;
                let previewImageUrl: string | null = null;
                let cardData: any = null;

                if (sharedPost) {
                    cardType = 'post';
                    previewTitle = sharedPost?.originalPost?.author?.name || msg?.sender?.name || 'Post';
                    previewDescription = sharedPost?.isReposted ? sharedPost?.originalPost?.discription : sharedPost?.discription;
                    previewImageUrl = Array.isArray(sharedPost?.media) && sharedPost.media.length > 0 ? sharedPost.media[0] : null;
                    cardData = sharedPost;
                } else if (sharedNews) {
                    cardType = 'news';
                    previewTitle = sharedNews?.headline || 'News';
                    previewDescription = sharedNews?.source || null;
                    previewImageUrl = sharedNews?.bannerImage || null;
                    cardData = sharedNews;
                } else if (sharedShowcase) {
                    cardType = 'showcase';
                    previewTitle = sharedShowcase?.projectTitle || 'Showcase';
                    previewDescription = sharedShowcase?.tagline || null;
                    previewImageUrl = sharedShowcase?.bannerImageUrl || (Array.isArray(sharedShowcase?.images) && sharedShowcase.images.length > 0 ? sharedShowcase.images[0] : null);
                    cardData = sharedShowcase;
                } else if (sharedUser) {
                    cardType = 'user';
                    previewTitle = sharedUser?.name || 'User';
                    previewDescription = sharedUser?.headline || sharedUser?.bio || null;
                    previewImageUrl = sharedUser?.avatar || null;
                    cardData = sharedUser;
                }

                await currentDb.runAsync(
                    `INSERT OR REPLACE INTO messages (
                        id, conversationId, content, createdAt, sender, type,
                        sharedPostId, sharedNewsId, sharedShowcaseId, sharedUserId,
                        sharedPostJson, sharedNewsJson, sharedShowcaseJson, sharedUserJson,
                        cardType, previewTitle, previewDescription, previewImageUrl, cardData
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        msg.id,
                        conversationId,
                        msg.content ?? '',
                        msg.createdAt,
                        JSON.stringify(msg.sender),
                        msg.type || 'normal',
                        // legacy IDs if present
                        msg.sharedPostId ?? null,
                        msg.sharedNewsId ?? null,
                        msg.sharedShowcaseId ?? null,
                        msg.sharedUserId ?? null,
                        // cached JSON blobs
                        sharedPost ? JSON.stringify(sharedPost) : null,
                        sharedNews ? JSON.stringify(sharedNews) : null,
                        sharedShowcase ? JSON.stringify(sharedShowcase) : null,
                        sharedUser ? JSON.stringify(sharedUser) : null,
                        // preview metadata
                        cardType,
                        previewTitle,
                        previewDescription,
                        previewImageUrl,
                        cardData ? JSON.stringify(cardData) : null,
                    ]
                );
            }
        });
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR saving messages:", error);
    }
};


export const clearDatabase = async () => {
    const currentDb = await getDb();
    if (!currentDb) {
        console.error("--- DB DEBUG: ❌ Database not initialized, cannot clear.");
        return;
    }

    try {
        await currentDb.withTransactionAsync(async () => {
            // Delete all records from each table
            await currentDb.execAsync('DELETE FROM messages;');
            await currentDb.execAsync('DELETE FROM conversations;');
        });
        console.log("--- DB DEBUG: ✅ All tables have been cleared successfully.");
        Alert.alert("Database Cleared", "The local data cache has been successfully cleared.");
    } catch (error) {
        console.error("--- DB DEBUG: ❌ ERROR clearing the database:", error);
        Alert.alert("Error", "Could not clear the local database.");
    }
};
