import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase-config.js?v=35';
import { DataStore } from './datastore.js?v=35';
import { showModal } from './ui_v23.js?v=35';

// The Root Admin is guaranteed access and will be automatically created in the database
const AUTHORIZED_ADMINS = ["youssf.hazem1221@gmail.com", "youssfhazem1221@gmail.com", "mohamedelhawary8@gmail.com"];

let currentUserRole = null;

async function handleAuthStatus(user, requireLogin = false) {
    if (user) {
        let role = await DataStore.getUserRole(user.email);
        
        // Auto-provision users if they don't exist yet
        if (!role) {
            const isRootAdmin = AUTHORIZED_ADMINS.some(email => email.toLowerCase() === user.email.toLowerCase());
            const initialRole = isRootAdmin ? 'admin' : 'viewer';
            await DataStore.saveUser(user.email, initialRole);
            role = initialRole;
            console.log(`${initialRole} provisioned automatically for ${user.email}`);
        }

        if (!role) {
            await showModal("Access Denied", `Your email (${user.email}) is not authorized. Ask an Admin to invite you.`);
            logout();
            return;
        }
        
        currentUserRole = role;
        console.log(`Logged in as ${user.email} (Role: ${role})`);
        
        // If on landing page, redirect to app
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('Leadgen/')) {
            window.location.href = 'app.html';
        }
        
        // If in app, apply role restrictions
        if (window.location.pathname.endsWith('app.html')) {
            applyRoleRestrictions(role);
        }
        
    } else {
        // Not logged in
        if (requireLogin && window.location.pathname.endsWith('app.html')) {
            window.location.href = 'index.html';
        }
    }
}

function applyRoleRestrictions(role) {
    if (role === 'viewer') {
        // Prevent drag-and-drop
        document.querySelectorAll('.lead-card').forEach(c => c.removeAttribute('draggable'));
        
        // Hide delete buttons, settings, engine
        const adminElements = document.querySelectorAll('button[onclick*="delete"], .delete-btn, .delete-card-btn, #nav-engine, #nav-settings, #btn-find-real, .admin-only');
        adminElements.forEach(el => el.classList.add('hidden'));
        
        // Disable inputs in drawer
        const drawerInputs = document.querySelectorAll('#drawer input, #drawer select, #drawer textarea, #drawer button');
        drawerInputs.forEach(el => {
            if(!el.classList.contains('drawer-close') && !el.classList.contains('btn-copy') && !el.classList.contains('drawer-tab')) {
                el.disabled = true;
                el.style.opacity = '0.5';
            }
        });
    } else if (role === 'admin') {
        // Ensure everything is visible and enabled for admin
        const adminElements = document.querySelectorAll('button[onclick*="delete"], #nav-engine, #nav-settings, #btn-find-real, .admin-only');
        adminElements.forEach(el => el.classList.remove('hidden'));
        
        const drawerInputs = document.querySelectorAll('#drawer input, #drawer select, #drawer textarea, #drawer button');
        drawerInputs.forEach(el => {
            el.disabled = false;
            el.style.opacity = '1';
        });
        
        document.querySelectorAll('.lead-card').forEach(c => c.setAttribute('draggable', 'true'));
    }
}

async function login() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error signing in", error);
        await showModal("Sign In Failed", error.message);
    }
}

function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
}

function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

function signupWithEmail(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

// Initialize listener
export function initAuth(requireLogin) {
    onAuthStateChanged(auth, (user) => handleAuthStatus(user, requireLogin));
}

export { login, logout, loginWithEmail, signupWithEmail, currentUserRole };
