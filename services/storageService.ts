import { UserProfile, JobApplication, User, FocusReport, VoiceConversation } from '../types';

const DB_NAME = 'VigyanAIDB';
// FIX: Incremented DB version to add new voice conversation store
const DB_VERSION = 4;
const PROFILE_STORE_NAME = 'userProfile';
const APPLICATIONS_STORE_NAME = 'applications';
const USERS_STORE_NAME = 'users';
const REPORTS_STORE_NAME = 'focusReports';
// FIX: Added store name for voice conversations
const VOICE_CONVERSATIONS_STORE_NAME = 'voiceConversations';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(USERS_STORE_NAME)) {
                db.createObjectStore(USERS_STORE_NAME, { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
                // Key will be the username
                db.createObjectStore(PROFILE_STORE_NAME);
            }
            if (!db.objectStoreNames.contains(APPLICATIONS_STORE_NAME)) {
                const appStore = db.createObjectStore(APPLICATIONS_STORE_NAME, { keyPath: 'id' });
                appStore.createIndex('by_username', 'username', { unique: false });
            }
            if (!db.objectStoreNames.contains(REPORTS_STORE_NAME)) {
                const reportStore = db.createObjectStore(REPORTS_STORE_NAME, { keyPath: 'id' });
                reportStore.createIndex('by_username', 'username', { unique: false });
            }
            // FIX: Add voice conversation store on version upgrade
            if (event.oldVersion < 4) {
                if (!db.objectStoreNames.contains(VOICE_CONVERSATIONS_STORE_NAME)) {
                    const voiceStore = db.createObjectStore(VOICE_CONVERSATIONS_STORE_NAME, { keyPath: 'id' });
                    voiceStore.createIndex('by_username', 'username', { unique: false });
                }
            }
        };
    });
};

// --- User Authentication Functions (Simulated Backend) ---
export const addUserToDB = async (user: User): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(USERS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(USERS_STORE_NAME);
    store.add(user);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getUserFromDB = async (username: string): Promise<User | null> => {
    const db = await openDB();
    const transaction = db.transaction(USERS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(USERS_STORE_NAME);
    const request = store.get(username);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};


// --- User Profile Functions ---
export const saveUserProfileToDB = async (username: string, profile: UserProfile): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(PROFILE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE_NAME);
    store.put(profile, username); // Use username as the key

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getUserProfileFromDB = async (username: string): Promise<UserProfile | null> => {
    const db = await openDB();
    const transaction = db.transaction(PROFILE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PROFILE_STORE_NAME);
    const request = store.get(username);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const deleteUserProfileFromDB = async (username: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(PROFILE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE_NAME);
    store.delete(username);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Job Application Functions ---
export const getApplicationsFromDB = async (username: string): Promise<JobApplication[]> => {
    const db = await openDB();
    const transaction = db.transaction(APPLICATIONS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(APPLICATIONS_STORE_NAME);
    const index = store.index('by_username');
    const request = index.getAll(username);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const saveApplicationToDB = async (application: JobApplication): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(APPLICATIONS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(APPLICATIONS_STORE_NAME);
    store.put(application); // `put` handles create and update

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const deleteApplicationFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(APPLICATIONS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(APPLICATIONS_STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Focus Report Functions ---
export const saveFocusReportToDB = async (report: FocusReport): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(REPORTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE_NAME);
    store.put(report);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getFocusReportsFromDB = async (username: string): Promise<FocusReport[]> => {
    const db = await openDB();
    const transaction = db.transaction(REPORTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(REPORTS_STORE_NAME);
    const index = store.index('by_username');
    const request = index.getAll(username);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve((request.result || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const clearFocusReportsFromDB = async (username: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(REPORTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE_NAME);
    const index = store.index('by_username');
    const request = index.openCursor(IDBKeyRange.only(username));
    
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
        }
    };

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// FIX: Add functions to save, get, and delete voice conversations
// --- Voice Conversation Functions ---
export const saveVoiceConversationToDB = async (conversation: VoiceConversation): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(VOICE_CONVERSATIONS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICE_CONVERSATIONS_STORE_NAME);
    store.put(conversation);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getVoiceConversationsFromDB = async (username: string): Promise<VoiceConversation[]> => {
    const db = await openDB();
    const transaction = db.transaction(VOICE_CONVERSATIONS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(VOICE_CONVERSATIONS_STORE_NAME);
    const index = store.index('by_username');
    const request = index.getAll(username);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.timestamp - a.timestamp));
        request.onerror = () => reject(request.error);
    });
};

export const deleteVoiceConversationFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(VOICE_CONVERSATIONS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VOICE_CONVERSATIONS_STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
