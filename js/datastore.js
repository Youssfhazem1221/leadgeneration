import { database, ref, set, get, onValue, remove, child } from './firebase-config.js?v=36';

let localLeads = [];
let localSettings = {geminiKey:"AIzaSyA6k8BCdBp8M3wx5nF9AatNH47sWMmgc6g", placesKey:"", webhookUrl:"", agency:"", niche:"", groqKey:""};

let localUsers = [];
let onDataChangeCallback = null;

// Helper to sanitize email for RTDB keys (replaces . with ,)
const sanitizeEmail = (email) => email ? email.replace(/\./g, ',') : '';

export const DataStore = {
    // Synchronous reads (from memory cache, updated via RTDB listeners)
    getLeads: () => localLeads,
    getSettings: () => localSettings,
    getUsers: () => localUsers,

    // Asynchronous writes (to RTDB)
    saveLead: async (lead) => {
        lead.updated_at = new Date().toISOString();
        try {
            await set(ref(database, `leads/${lead.id}`), lead);
        } catch (e) {
            console.error("Error saving lead: ", e);
            throw e;
        }
    },
    
    deleteLead: async (id) => {
        try {
            await remove(ref(database, `leads/${id}`));
        } catch (e) {
            console.error("Error deleting lead: ", e);
            throw e;
        }
    },

    clearLeads: async () => {
        try {
            await remove(ref(database, 'leads'));
        } catch (e) {
            console.error("Error clearing leads: ", e);
            throw e;
        }
    },
    
    saveSettings: async (settings) => {
        console.log("DataStore: Saving settings...", settings);
        try {
            await set(ref(database, 'settings/global'), settings);
            console.log("DataStore: Settings saved successfully to Firebase.");
            // Optimistic & Local update
            localSettings = { ...localSettings, ...settings };
            localStorage.setItem('crm_settings', JSON.stringify(localSettings));
        } catch (e) {
            console.error("DataStore: Error saving settings: ", e);
            // Even if Firebase fails, save locally
            localSettings = { ...localSettings, ...settings };
            localStorage.setItem('crm_settings', JSON.stringify(localSettings));
            throw e;
        }
    },

    saveUser: async (email, role) => {
        const sanitized = sanitizeEmail(email);
        try {
            await set(ref(database, `users/${sanitized}`), {
                email: email,
                role: role,
                added_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error saving user: ", e);
            throw e;
        }
    },

    deleteUser: async (email) => {
        const sanitized = sanitizeEmail(email);
        try {
            await remove(ref(database, `users/${sanitized}`));
        } catch (e) {
            console.error("Error deleting user: ", e);
        }
    },

    // One-off read for Auth check
    getUserRole: async (email) => {
        const sanitized = sanitizeEmail(email);
        try {
            const snapshot = await get(ref(database, `users/${sanitized}`));
            if (snapshot.exists()) {
                return snapshot.val().role;
            }
            return null;
        } catch (e) {
            console.error("Error fetching user role: ", e);
            return null;
        }
    },

    // Initialize listeners
    init: (callback) => {
        onDataChangeCallback = callback;
        
        // Listen to Leads in real-time
        onValue(ref(database, 'leads'), (snapshot) => {
            const data = snapshot.val();
            localLeads = data ? Object.values(data) : [];
            if (onDataChangeCallback) onDataChangeCallback();
        });

        // Listen to Settings
        onValue(ref(database, 'settings/global'), (snapshot) => {
            if (snapshot.exists()) {
                localSettings = snapshot.val();
                localStorage.setItem('crm_settings', JSON.stringify(localSettings));
                if (onDataChangeCallback) onDataChangeCallback();
            } else {
                // Fallback to localStorage if Firebase is empty
                const cached = localStorage.getItem('crm_settings');
                if (cached) {
                    localSettings = JSON.parse(cached);
                    if (onDataChangeCallback) onDataChangeCallback();
                }
            }
        });

        // Listen to Users
        onValue(ref(database, 'users'), (snapshot) => {
            const data = snapshot.val();
            localUsers = data ? Object.values(data) : [];
            if (onDataChangeCallback) onDataChangeCallback();
        });
    }
};
