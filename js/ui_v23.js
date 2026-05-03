console.log("UI Module Loaded: v18 (Discovery Mode)");
import { DataStore } from './datastore.js?v=36';


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
    console.log("UI: openDrawer triggered for ID:", id);
    const leads = DataStore.getLeads();
    const lead = leads.find(l => l.id === id);
    
    if (!lead) {
        console.error("UI: Lead not found in local DataStore for ID:", id, "Total leads in store:", leads.length);
        showToast("Error: Lead data not found. Try refreshing.", "error");
        return;
    }
    
    currentLeadId = id;
    window.currentLeadId = id; 

    document.getElementById('drawer-name').innerText = lead.name;
    document.getElementById('drawer-phone').innerText = lead.phone;
    document.getElementById('drawer-area').innerText = lead.area || 'Not specified';
    const statusEl = document.getElementById('drawer-status');
    const nicheEl = document.getElementById('drawer-niche');
    const followEl = document.getElementById('drawer-follow-date');

    if (statusEl) statusEl.value = lead.status;
    if (nicheEl) nicheEl.value = lead.niche || 'Clinics';
    if (followEl) followEl.value = lead.follow_up_date || '';
    
    renderComments(lead);

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
    
    // Update URL hash for shareable link
    history.replaceState(null, '', `#lead=${id}`);
}

export function checkHashAndOpenDrawer() {
    const hash = window.location.hash;
    if (hash.startsWith('#lead=')) {
        const leadId = hash.replace('#lead=', '');
        if (leadId) openDrawer(leadId);
    }
}

export function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    currentLeadId = null;
    window.currentLeadId = null;
    history.replaceState(null, '', window.location.pathname);
}

export function addComment() {
    if(!currentLeadId) return;
    const input = document.getElementById('drawer-new-comment');
    const text = input.value.trim();
    if(!text) return;

    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    if(!lead.comments) lead.comments = [];
    
    const currentUser = document.getElementById('user-display-email')?.innerText || 'User';

    lead.comments.push({
        author: currentUser,
        text: text,
        timestamp: new Date().toISOString()
    });

    DataStore.saveLead(lead);
    input.value = '';
    
    renderComments(lead);
}

export function renderComments(lead) {
    const list = document.getElementById('drawer-comments-list');
    if (!list) {
        console.warn("Comment UI not found. Please hard refresh.");
        return;
    }

    if(!lead.comments || lead.comments.length === 0) {
        list.innerHTML = '<div class="text-secondary text-sm" style="text-align:center; padding: 16px 0;">No notes yet.</div>';
        return;
    }

    list.innerHTML = lead.comments.map((c, index) => {
        const authorName = c.author ? c.author.split('@')[0] : 'Unknown';
        return `
        <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--apple-border); border-radius: 10px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--apple-blue);">${authorName}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; color: var(--apple-secondary);">${getTimeAgo(c.timestamp)}</span>
                    <button onclick="deleteComment(${index})" style="background: none; border: none; color: var(--apple-red, #ff453a); font-size: 11px; cursor: pointer; padding: 0; opacity: 0.7;">✕</button>
                </div>
            </div>
            <div style="font-size: 13px; line-height: 1.4; color: white; white-space: pre-wrap;">${c.text}</div>
        </div>
        `;
    }).join('');
    
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
}

export function deleteComment(index) {
    if(!currentLeadId) return;
    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    if(!lead || !lead.comments || !lead.comments[index]) return;
    
    lead.comments.splice(index, 1);
    DataStore.saveLead(lead);
    renderComments(lead);
    showToast("Note deleted");
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
    const el = document.getElementById('drawer-status');
    if (!el) return;
    const newStatus = el.value;
    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    if(lead.status === newStatus) return;
    addActivity(lead, `Status changed from ${lead.status} to ${newStatus}`);
    lead.status = newStatus;
    DataStore.saveLead(lead);
    if (typeof window.refreshUI === 'function') window.refreshUI();
    showToast("Status updated");
}

export function updateLeadNiche() {
    if(!currentLeadId) return;
    const el = document.getElementById('drawer-niche');
    if (!el) return;
    const newNiche = el.value;
    const lead = DataStore.getLeads().find(l => l.id === currentLeadId);
    if(lead.niche === newNiche) return;
    addActivity(lead, `Niche changed from ${lead.niche || 'Clinics'} to ${newNiche}`);
    lead.niche = newNiche;
    DataStore.saveLead(lead);
    if (typeof window.refreshUI === 'function') window.refreshUI();
    showToast("Niche updated");
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
    const groqEl = document.getElementById('set-groq');
    const agencyEl = document.getElementById('set-agency');
    const nicheEl = document.getElementById('set-niche');
    const realNicheEl = document.getElementById('real-niche');

    if (geminiEl) geminiEl.value = s.geminiKey || '';
    if (webhookEl) webhookEl.value = s.webhookUrl || '';
    if (groqEl) groqEl.value = s.groqKey || '';
    if (agencyEl) agencyEl.value = s.agency || '';
    if (nicheEl) nicheEl.value = s.niche || '';
    if (realNicheEl && s.niche) realNicheEl.value = s.niche;

    // Active Niche Switcher (Now in Table Toolbar)
    const nicheSwitcher = document.getElementById('filter-niche');
    if (nicheSwitcher) nicheSwitcher.value = s.activeNiche || 'All';

    // Also sync the Engine Import category
    const engineNicheSwitcher = document.getElementById('engine-niche-select');
    if (engineNicheSwitcher && s.activeNiche && s.activeNiche !== 'All') {
        engineNicheSwitcher.value = s.activeNiche;
    }

    // Render Offer Types in Settings
    renderOfferTypes();
    // Update Engine Offer dropdown
    updateEngineOfferDropdown();
}

export function renderOfferTypes() {
    const s = DataStore.getSettings();
    const container = document.getElementById('offer-types-list');
    if (!container) return;
    
    container.innerHTML = (s.offerTypes || []).map(offer => `
        <div style="background: rgba(255,255,255,0.08); border: 1px solid var(--apple-border); border-radius: 8px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-size: 13px;">
            <span>${offer}</span>
            <button onclick="deleteOfferType('${offer}')" style="background: none; border: none; color: var(--apple-red); cursor: pointer; padding: 0 2px; font-weight: 700;">✕</button>
        </div>
    `).join('');
}

export function updateEngineOfferDropdown() {
    const s = DataStore.getSettings();
    const dropdown = document.getElementById('real-offer');
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = (s.offerTypes || []).map(offer => `
        <option value="${offer}">${offer}</option>
    `).join('');
    if (s.offerTypes && s.offerTypes.includes(currentVal)) dropdown.value = currentVal;
}

export async function addOfferType() {
    const input = document.getElementById('new-offer-type');
    const val = input.value.trim();
    if (!val) return;
    
    const s = DataStore.getSettings();
    if (!s.offerTypes) s.offerTypes = [];
    if (s.offerTypes.includes(val)) return showToast("Offer type already exists", "warning");
    
    s.offerTypes.push(val);
    await DataStore.saveSettings(s);
    input.value = '';
    renderOfferTypes();
    updateEngineOfferDropdown();
    showToast("Offer type added");
}

export async function deleteOfferType(offer) {
    const s = DataStore.getSettings();
    s.offerTypes = (s.offerTypes || []).filter(o => o !== offer);
    await DataStore.saveSettings(s);
    renderOfferTypes();
    updateEngineOfferDropdown();
}

export async function updateActiveNiche(niche) {
    console.log("UI: Updating active niche context to:", niche);
    const s = DataStore.getSettings();
    s.activeNiche = niche;
    await DataStore.saveSettings(s);
    showToast(`Context switched to ${niche}`);
    
    // Refresh table and pipeline to filter by niche (if we implement niche filtering)
    if (typeof window.refreshUI === 'function') window.refreshUI();
}

export async function saveSettings() {
    console.log("UI: saveSettings triggered");
    const s = {
        ...DataStore.getSettings(),
        geminiKey: document.getElementById('set-gemini').value.trim(),
        groqKey: document.getElementById('set-groq').value.trim(),
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
    const inputKey = document.getElementById('set-gemini').value.trim();
    const masterKey = "AIzaSyA6k8BCdBp8M3wx5nF9AatNH47sWMmgc6g";
    const resEl = document.getElementById('test-gemini-res');
    
    const keyToTry = inputKey || masterKey;
    if(!keyToTry) return resEl.innerHTML = '<span class="text-red">Missing Key</span>';
    
    resEl.innerText = "Testing...";
    console.log("UI: Testing key ending in:", keyToTry.slice(-4));
    
    let lastError = "All models failed";
    const tryModel = async (model, version='v1') => {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${keyToTry}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            });
            if (res.ok) return true;
            if (res.status === 429) { 
                lastError = "API is busy. Please wait 1 minute and click test again."; 
                return "429"; 
            }
            const errData = await res.json();
            lastError = errData.error?.message || `HTTP ${res.status}`;
            return false;
        } catch(e) { 
            lastError = e.message;
            return false; 
        }
    };

    const modelsToTry = [
        {m:'gemini-2.5-flash', v:'v1beta'}
    ];

    for (const item of modelsToTry) {
        const result = await tryModel(item.m, item.v);
        if (result === true) {
            const source = (keyToTry === masterKey) ? " (Master Key)" : "";
            resEl.innerHTML = `<span class="text-accent">✓ Success: ${item.m}${source}</span>`;
            return;
        } else if (result === "429") {
            break;
        }
    }
    
    resEl.innerHTML = `<span class="text-red">✗ Failed: ${lastError}</span>`;
}

export async function testGroq() {
    const key = document.getElementById('set-groq').value.trim();
    const resEl = document.getElementById('test-groq-res');
    if(!resEl) return;
    if(!key) return resEl.innerHTML = '<span class="text-red">Missing Key</span>';
    resEl.innerText = "Testing...";
    try {
        const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 1
            })
        });
        if (res.ok) {
            resEl.innerHTML = '<span class="text-accent">✓ Success</span>';
        } else {
            const err = await res.json();
            resEl.innerHTML = `<span class="text-red">✗ Failed</span>`;
            console.error("Groq Test Failed:", err);
        }
    } catch(e) {
        resEl.innerHTML = `<span class="text-red">✗ Error</span>`;
        console.error(e);
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
// --- Mass Selection Logic ---
export function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.lead-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

export function updateSelectedCount() {
    const selected = document.querySelectorAll('.lead-checkbox:checked');
    const count = selected.length;
    const toolbar = document.getElementById('mass-action-toolbar');
    const countEl = document.getElementById('selected-count');
    
    if (count > 0) {
        countEl.textContent = count;
        toolbar.classList.remove('hidden');
        // Force reflow for animation
        setTimeout(() => {
            toolbar.style.opacity = '1';
            toolbar.style.pointerEvents = 'all';
            toolbar.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
    } else {
        toolbar.style.opacity = '0';
        toolbar.style.pointerEvents = 'none';
        toolbar.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toolbar.classList.add('hidden'), 300);
    }
}

export function clearSelection() {
    const selectAll = document.getElementById('select-all-leads');
    if (selectAll) selectAll.checked = false;
    toggleSelectAll(false);
}

export async function applyMassNiche() {
    const targetNiche = document.getElementById('mass-niche-select').value;
    const selectedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');
    const ids = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    
    if (ids.length === 0) return;
    
    const ok = await showModal("Mass Update", `Move ${ids.length} leads to ${targetNiche}?`, { type: 'confirm' });
    if (!ok) return;
    
    showToast(`Updating ${ids.length} leads...`);
    
    const leads = DataStore.getLeads();
    for (const id of ids) {
        const lead = leads.find(l => l.id === id);
        if (lead) {
            lead.niche = targetNiche;
            await DataStore.saveLead(lead);
        }
    }
    
    clearSelection();
    showToast(`Moved to ${targetNiche}`);
    if (typeof window.refreshUI === 'function') window.refreshUI();
}
