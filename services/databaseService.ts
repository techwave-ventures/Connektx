// services/databaseService.ts

import * as SQLite from 'expo-sqlite';

// --- Type Definitions (No Changes) ---
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
    sender: string;
    type?: 'normal' | 'system' | 'announcement';
    sharedPostId?: string;
    sharedNewsId?: string;
    sharedShowcaseId?: string;
    sharedUserId?: string;
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

        // **FIX**: Call methods directly on the database object inside the transaction.
        // The `withTransactionAsync` callback does NOT receive a 'tx' argument.
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
        return results.map(m => ({
            ...m,
            sender: JSON.parse(m.sender as string),
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
         // **FIX**: Use the database object directly.
        await currentDb.withTransactionAsync(async () => {
            for (const msg of messages) {
                await currentDb.runAsync(
                    `INSERT OR REPLACE INTO messages (id, conversationId, content, createdAt, sender, type, sharedPostId, sharedNewsId, sharedShowcaseId, sharedUserId)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        msg.id,
                        conversationId,
                        msg.content,
                        msg.createdAt,
                        JSON.stringify(msg.sender),
                        msg.type || 'normal',
                        msg.sharedPostId,
                        msg.sharedNewsId,
                        msg.sharedShowcaseId,
                        msg.sharedUserId,
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
