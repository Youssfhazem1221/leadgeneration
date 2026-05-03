import { db, collection, doc, deleteDoc, onSnapshot, setDoc, getDoc } from './firebase-config.js?v=3';

let localLeads = [];
let localSettings = {geminiKey:"", placesKey:"", webhookUrl:"", agency:"", niche:""};
let localUsers = [];
let onDataChangeCallback = null;

export const DataStore = {
    // Synchronous reads (from memory cache, updated via Firestore listeners)
    getLeads: () => localLeads,
    getSettings: () => localSettings,
    getUsers: () => localUsers,

    // Asynchronous writes (to Firestore)
    saveLead: async (lead) => {
        lead.updated_at = new Date().toISOString();
        try {
            await setDoc(doc(db, "leads", lead.id), lead);
        } catch (e) {
            console.error("Error saving lead: ", e);
            alert("Error saving data. Check console.");
        }
    },
    
    deleteLead: async (id) => {
        try {
            await deleteDoc(doc(db, "leads", id));
        } catch (e) {
            console.error("Error deleting lead: ", e);
        }
    },
    
    saveSettings: async (settings) => {
        try {
            await setDoc(doc(db, "settings", "global"), settings);
        } catch (e) {
            console.error("Error saving settings: ", e);
        }
    },

    saveUser: async (email, role) => {
        try {
            await setDoc(doc(db, "users", email), {
                email: email,
                role: role,
                added_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error saving user: ", e);
            alert("Error saving user permissions.");
        }
    },

    deleteUser: async (email) => {
        try {
            await deleteDoc(doc(db, "users", email));
        } catch (e) {
            console.error("Error deleting user: ", e);
        }
    },

    // One-off read for Auth check
    getUserRole: async (email) => {
        try {
            const userDoc = await getDoc(doc(db, "users", email));
            if (userDoc.exists()) {
                return userDoc.data().role;
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
        
        // Listen to Leads collection in real-time
        onSnapshot(collection(db, "leads"), (snapshot) => {
            localLeads = snapshot.docs.map(doc => doc.data());
            if (onDataChangeCallback) onDataChangeCallback();
        });

        // Listen to Settings document
        onSnapshot(doc(db, "settings", "global"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                localSettings = docSnapshot.data();
            }
        });

        // Listen to Users collection
        onSnapshot(collection(db, "users"), (snapshot) => {
            localUsers = snapshot.docs.map(doc => doc.data());
            if (onDataChangeCallback) onDataChangeCallback();
        });
    }
};
