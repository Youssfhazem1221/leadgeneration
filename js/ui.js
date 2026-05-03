import { DataStore } from './datastore.js?v=12';

export async function deleteLead(id) {
    const ok = await showModal("Delete Lead", "Are you sure you want to delete this lead? This action cannot be undone.", { type: 'confirm', danger: true });
    if(ok) {
        await DataStore.deleteLead(id);
        showToast("Lead deleted");
        // refreshUI is global
        if (typeof window.refreshUI === 'function') window.refreshUI();
    }
}

export function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const VIEW_META = {
    pipeline: { title: 'Pipeline',    subtitle: 'Drag cards to update lead status' },
    table:    { title: 'Leads Table', subtitle: 'Search, filter, and manage all leads' },
    engine:   { title: 'Lead Engine', subtitle: 'Find and import real leads with AI' },
    settings: { title: 'Settings',   subtitle: 'Configure your agency and integrations' },
};

export function switchView(view) {
    closeDrawer();
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${view}`);
    if (navEl) navEl.classList.add('active');
    
    ['pipeline', 'table', 'engine', 'settings'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) { el.classList.add('hidden'); el.classList.remove('view-pane'); }
    });
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) {
        viewEl.classList.remove('hidden');
        // Restart animation
        void viewEl.offsetWidth;
        viewEl.classList.add('view-pane');
    }

    const meta = VIEW_META[view] || {};
    const titleEl = document.getElementById('header-page-title');
    const subtitleEl = document.getElementById('header-page-subtitle');
    if (titleEl) titleEl.textContent = meta.title || '';
    if (subtitleEl) subtitleEl.textContent = meta.subtitle || '';
    
    if (view === 'pipeline' && typeof window.renderPipeline === 'function') window.renderPipeline();
    if (view === 'table' && typeof window.renderTable === 'function') window.renderTable();
}

export function setUserInfo(email) {
    const emailEl = document.getElementById('user-display-email');
    const avatarEl = document.getElementById('user-avatar-initials');
    if (emailEl) emailEl.textContent = email || '';
    if (avatarEl && email) {
        const parts = email.split('@')[0].split(/[\.\-\_]/);
        const initials = parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : email.slice(0, 2).toUpperCase();
        avatarEl.textContent = initials;
    }
}

export function getTimeAgo(dateStr) {
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
}

export function copyText(txt) {
    navigator.clipboard.writeText(txt).then(() => showToast("Copied to clipboard"));
}

// --- Drawer ---
let currentLeadId = null;

export function openDrawer(id) {
    const lead = DataStore.getLeads().find(l => l.id === id);
    if (!lead) return;
    currentLeadId = id;
    window.currentLeadId = id; // Sync with global if needed

    document.getElementById('drawer-name').innerText = lead.name;
    document.getElementById('drawer-phone').innerText = lead.phone;
    document.getElementById('drawer-area').innerText = lead.area || 'Not specified';
    document.getElementById('drawer-status').value = lead.status;
    document.getElementById('drawer-notes').value = lead.notes || '';
    document.getElementById('drawer-follow-date').value = lead.follow_up_date || '';
    
    const isReal = lead.source === 'places';
    const isCSV = lead.source === 'csv_import';
    const sourcePill = document.getElementById('drawer-source-pill');
    sourcePill.innerText = isReal ? 'Real' : (isCSV ? 'CSV' : 'AI');
    sourcePill.className = `pill-source ${isReal ? 'source-real' : (isCSV ? 'source-csv' : 'source-ai')}`;
    
    document.getElementById('drawer-channel-text').innerText = lead.channel || 'WhatsApp';

    if(isReal && lead.rating) {
        document.getElementById('drawer-rating-row').classList.remove('hidden');
        document.getElementById('drawer-rating').innerText = `★ ${lead.rating}`;
        document.getElementById('drawer-maps-link').href = lead.maps_url || '#';
    } else {
        document.getElementById('drawer-rating-row').classList.add('hidden');
    }

    const messages = lead.ai_messages || { en: 'Generating...', ar: 'جاري الإنشاء...' };
    document.getElementById('drawer-msg-text-en').innerText = messages.en;
    document.getElementById('drawer-msg-text-ar').innerText = messages.ar;

    const logContainer = document.getElementById('drawer-activity');
    logContainer.innerHTML = (lead.activity_log || []).slice().reverse().map(log => `
        <div class="flex-col gap-1 mb-4" style="border-left: 2px solid var(--apple-blue); padding-left: 12px; position: relative;">
            <div class="text-sm font-semibold">${log.action}</div>
            <div class="text-xs text-secondary">${new Date(log.timestamp).toLocaleString()}</div>
        </div>
    `).join('');

    document.getElementById('drawer').classList.add('open');
    switchMessageTab('en');
}

export function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    currentLeadId = null;
    window.currentLeadId = null;
}

export async function handleDeleteFromDrawer() {
    if (!currentLeadId) return;
    await deleteLead(currentLeadId);
    // Wait a bit for the removal to reflect and close drawer if lead is gone
    setTimeout(() => {
        const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
        if (!lead) closeDrawer();
    }, 300);
}

export function switchMessageTab(lang) {
    document.getElementById('drawer-tab-en').classList.toggle('active', lang === 'en');
    document.getElementById('drawer-tab-ar').classList.toggle('active', lang === 'ar');
    document.getElementById('drawer-message-en').classList.toggle('hidden', lang !== 'en');
    document.getElementById('drawer-message-ar').classList.toggle('hidden', lang !== 'ar');
}

export function updateLeadStatus() {
    if(!currentLeadId) return;
    const newStatus = document.getElementById('drawer-status').value;
    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    if(lead && lead.status !== newStatus) {
        const old = lead.status;
        lead.status = newStatus;
        addActivity(lead, `Status changed from ${old} to ${newStatus}`);
        DataStore.saveLead(lead);
        if (typeof window.syncToSheets === 'function') window.syncToSheets(lead);
        openDrawer(lead.id); 
    }
}

export function saveFollowUp() {
    if(!currentLeadId) return;
    const date = document.getElementById('drawer-follow-date').value;
    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    lead.follow_up_date = date;
    addActivity(lead, `Set follow-up date to ${date || 'none'}`);
    DataStore.saveLead(lead);
    openDrawer(lead.id);
    showToast("Follow-up saved");
}

export function addActivity(lead, action) {
    if(!lead.activity_log) lead.activity_log = [];
    lead.activity_log.unshift({ action, timestamp: new Date().toISOString() });
}

export function loadSettingsToUI() {
    const s = DataStore.getSettings();
    console.log("UI: Loading settings to fields...", s);
    const geminiEl = document.getElementById('set-gemini');
    const webhookEl = document.getElementById('set-webhook');
    const agencyEl = document.getElementById('set-agency');
    const nicheEl = document.getElementById('set-niche');
    const realNicheEl = document.getElementById('real-niche');

    if (geminiEl) geminiEl.value = s.geminiKey || '';
    if (webhookEl) webhookEl.value = s.webhookUrl || '';
    if (agencyEl) agencyEl.value = s.agency || '';
    if (nicheEl) nicheEl.value = s.niche || '';
    if (realNicheEl && s.niche) realNicheEl.value = s.niche;
}

export async function saveSettings() {
    console.log("UI: saveSettings triggered");
    const s = {
        geminiKey: document.getElementById('set-gemini').value.trim(),
        webhookUrl: document.getElementById('set-webhook').value.trim(),
        agency: document.getElementById('set-agency').value.trim(),
        niche: document.getElementById('set-niche').value.trim()
    };
    
    try {
        await DataStore.saveSettings(s);
        showToast("Settings saved to cloud");
        console.log("UI: saveSettings complete");
    } catch (e) {
        console.error("UI: Failed to save settings", e);
        showToast("Error: Cloud sync failed", "error");
    }
}

export function toggleVisibility(id) {
    const el = document.getElementById(id);
    if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

export async function testGemini() {
    const key = document.getElementById('set-gemini').value.trim();
    const resEl = document.getElementById('test-gemini-res');
    if(!key) return resEl.innerHTML = '<span class="text-red">Missing Key</span>';
    resEl.innerText = "Testing...";
    
    let lastError = "All models failed";
    const tryModel = async (model, version='v1') => {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            });
            if (res.ok) return true;
            const errData = await res.json();
            lastError = errData.error?.message || `HTTP ${res.status}`;
            console.error(`Gemini Test (${model}):`, lastError);
            return false;
        } catch(e) { 
            lastError = e.message;
            return false; 
        }
    };

    if (await tryModel('gemini-1.5-flash', 'v1')) {
        resEl.innerHTML = '<span class="text-accent">✓ Success (1.5 Flash)</span>';
    } else if (await tryModel('gemini-1.5-flash', 'v1beta')) {
        resEl.innerHTML = '<span class="text-accent">✓ Success (1.5 Beta)</span>';
    } else if (await tryModel('gemini-pro', 'v1')) {
        resEl.innerHTML = '<span class="text-accent">✓ Success (Gemini Pro)</span>';
    } else if (await tryModel('gemini-1.0-pro', 'v1')) {
        resEl.innerHTML = '<span class="text-accent">✓ Success (1.0 Pro)</span>';
    } else {
        resEl.innerHTML = `<span class="text-red">✗ Failed: ${lastError}</span>`;
    }
}

export async function testWebhook() {
    const url = document.getElementById('set-webhook').value;
    const resEl = document.getElementById('test-webhook-res');
    if(!url) return resEl.innerHTML = '<span class="text-red">Missing URL</span>';
    resEl.innerText = "Testing...";
    try {
        await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({action:'test'})});
        resEl.innerHTML = '<span class="text-accent">✓ Sent</span>';
    } catch(e) { resEl.innerHTML = '<span class="text-red">✗ Failed</span>'; }
}

// --- Team Management ---
export function renderTeamTable() {
    const users = DataStore.getUsers();
    const tbody = document.getElementById('team-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.email}</td>
            <td><span class="pill-source ${u.role === 'admin' ? 'source-real' : 'source-ai'}">${u.role}</span></td>
            <td>
                <button style="padding:4px 8px; font-size:11px; color:var(--red); background:none; border:none;" 
                        onclick="removeUserAccess('${u.email}')">Revoke</button>
            </td>
        </tr>
    `).join('');
}

export async function inviteUser() {
    const email = document.getElementById('invite-email').value.trim();
    const role = document.getElementById('invite-role').value;
    if(!email || !email.includes('@')) return showToast("Enter a valid email", "error");
    
    await DataStore.saveUser(email, role);
    document.getElementById('invite-email').value = '';
    showToast(`Added ${email} as ${role}`);
}

export async function removeUserAccess(email) {
    const ok = await showModal("Revoke Access", `Revoke access for ${email}? They will be immediately locked out.`, { type: 'confirm', danger: true });
    if(ok) {
        await DataStore.deleteUser(email);
        showToast("User access revoked");
    }
}

// --- Apple Modal System ---
export function showModal(title, message, options = {}) {
    const { type = 'alert', confirmText = 'OK', cancelText = 'Cancel', danger = false } = options;
    
    return new Promise((resolve) => {
        const modalId = 'apple-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-backdrop hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-window">
                <div class="modal-content">
                    <h2 class="modal-title">${title}</h2>
                    <p class="modal-message">${message}</p>
                </div>
                <div class="modal-actions">
                    ${type === 'confirm' ? `<button class="btn-modal-cancel">${cancelText}</button>` : ''}
                    <button class="btn-modal-confirm ${danger ? 'danger' : ''}">${confirmText}</button>
                </div>
            </div>
        `;

        const confirmBtn = modal.querySelector('.btn-modal-confirm');
        const cancelBtn = modal.querySelector('.btn-modal-cancel');

        const close = (val) => {
            modal.classList.add('hidden');
            resolve(val);
        };

        confirmBtn.onclick = () => close(true);
        if (cancelBtn) cancelBtn.onclick = () => close(false);

        modal.classList.remove('hidden');
    });
}
