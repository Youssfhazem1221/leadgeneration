import { DataStore } from './datastore.js?v=12';
import { showToast, switchView } from './ui_v22.js';
import { normalizePhone } from './table.js?v=12';

let tempEngineResults = [];

export async function findRealLeads() {
    let settings = DataStore.getSettings();
    const masterKey = "AIzaSyBb2p9SQM_J50_qrrh4bPl7CQh5zuFm1v8";
    
    // Priority: 1. Input field (active typing), 2. Cloud settings, 3. Master key
    const inputKey = document.getElementById('set-gemini')?.value.trim();
    let apiKey = inputKey || settings.geminiKey || masterKey;
    
    console.log("Engine: Attempting with key ending in:", apiKey.slice(-4));
    
    if(!apiKey) return showToast("No Gemini API Key set. Please add it in Settings.", "error");

    const niche = document.getElementById('real-niche').value || 'clinic';
    const area = document.getElementById('real-area').value || 'Cairo';
    const offer = document.getElementById('real-offer').value;
    
    const btn = document.getElementById('btn-find-real');
    btn.innerHTML = '<span class="spinner"></span> Searching Web & Generating...';
    btn.disabled = true;

    try {
        const prompt = `
You are an expert lead researcher and outreach copywriter for an AI automation agency in Egypt.
Use Google Search to find exactly 10 REAL businesses matching the niche: "${niche}" in the area: "${area}, Egypt".
For each business you find, you MUST extract their REAL phone number from the search results. If you cannot find a phone number, skip that business and find another one.

For each of the 10 real businesses, generate a personalized Hormozi-style outreach message pitching: "${offer}".
Line 1: Specific observation about their likely problem (reference their niche/location)
Line 2: What we do (done-for-you AI automation)
Line 3: A concrete result (number-based)
Line 4: One soft yes/no question

Return ONLY a valid JSON array. Do not include any conversational text, introductions, or explanations. Start the response with '[' and end with ']'.
Schema:
[{
  "id": "generate_a_unique_id",
  "name": "Exact Business Name from Google Search",
  "phone": "Real extracted phone number",
  "address": "Extracted address or neighborhood",
  "niche": "${niche}",
  "pain": "One specific pain point for this business type",
  "channel": "WhatsApp OR LinkedIn OR Instagram",
  "en_message": "4-line English message",
  "ar_message": "4-line Egyptian Arabic (عامية) message"
}]
`;

        const geminiBody = {
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.7 }
        };
        
        let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        });
        
        // Fallback 1: Try gemini-2.0-flash
        if (res.status === 404) {
            console.warn("Gemini 2.5 not found, trying 2.0");
            res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiBody)
            });
        }

        // Fallback 2: Try gemini-pro (legacy)
        if (res.status === 404) {
            res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiBody)
            });
        }
        
        if (res.status === 429) {
            throw new Error("API is busy. Please wait 1 minute and click Find again.");
        }
        
        const data = await res.json();
        console.log("Engine: Raw API Data:", data);
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates || !data.candidates[0]) {
            throw new Error("Gemini returned no results. Check your niche/area.");
        }

        const rawText = data.candidates[0].content.parts[0].text;
        console.log("Engine: Raw Content Text:", rawText);
        let parsedLeads = [];
        try {
            const startIdx = rawText.indexOf('[');
            const endIdx = rawText.lastIndexOf(']');
            if (startIdx === -1 || endIdx === -1) throw new Error("No JSON array found in response");
            
            const cleanJson = rawText.substring(startIdx, endIdx + 1);
            parsedLeads = JSON.parse(cleanJson);
        } catch(e) {
            console.error("Gemini Raw Response:", rawText);
            throw new Error("Failed to parse leads. Gemini returned a conversational response instead of data.");
        }

        if (parsedLeads.length === 0) {
            throw new Error("Gemini could not find any real businesses with phone numbers in that area.");
        }

        tempEngineResults = parsedLeads.map((b, i) => ({
            ...b,
            id: 'temp_' + i,
            rating: null,
            place_id: null,
            source: 'places'
        }));

        renderEngineResults('real');

    } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to fetch real leads via Gemini Search", "error");
    } finally {
        btn.innerHTML = 'Find Real Leads (Limit: 10)';
        btn.disabled = false;
    }
}

export function renderEngineResults(type) {
    const containerId = 'real-results';
    const btnId = 'btn-import-real';
    const container = document.getElementById(containerId);
    const btn = document.getElementById(btnId);
    if (!container || !btn) return;
    
    container.innerHTML = tempEngineResults.map((l, i) => `
        <div class="result-card">
            <input type="checkbox" class="result-checkbox" data-idx="${i}" checked>
            <div class="result-content">
                <div class="font-semibold">${l.name} <span class="pill-source ${l.source==='places'?'source-real':'source-ai'}">${l.source==='places'?'Real 🟢':'AI ⚪'}</span></div>
                <div class="text-xs text-muted mt-2">
                    ${l.phone} • ${l.address || l.area} 
                    ${l.rating ? `• ★ ${l.rating}` : ''}
                </div>
                <div class="message-preview truncate">${l.en_message.split('\n')[0]}</div>
            </div>
        </div>
    `).join('');
    
    container.classList.remove('hidden');
    btn.classList.remove('hidden');
    if(type === 'real') btn.innerText = `Import Selected (${tempEngineResults.length})`;
    
    document.querySelectorAll(`#${containerId} .result-checkbox`).forEach(cb => {
        cb.addEventListener('change', () => {
            if(type === 'real') {
                const checked = document.querySelectorAll(`#${containerId} .result-checkbox:checked`).length;
                btn.innerText = `Import Selected (${checked})`;
            }
        });
    });
}

export function importRealLeads() {
    const checkboxes = document.querySelectorAll('#real-results .result-checkbox');
    let imported = 0;
    let skipped = 0;
    checkboxes.forEach(cb => {
        if(cb.checked) {
            const l = tempEngineResults[cb.getAttribute('data-idx')];
            const success = saveNewLead(l);
            if (success) imported++;
            else skipped++;
        }
    });
    document.getElementById('real-results').innerHTML = '';
    document.getElementById('real-results').classList.add('hidden');
    document.getElementById('btn-import-real').classList.add('hidden');
    
    if (skipped > 0) {
        showToast(`Imported ${imported} leads. Skipped ${skipped} duplicates.`, "warning");
    } else {
        showToast(`Imported ${imported} real leads`);
    }
    switchView('pipeline');
}

export function saveNewLead(l) {
    const leads = DataStore.getLeads();
    const normalizedPhone = normalizePhone(l.phone);
    const exists = leads.find(existing => normalizePhone(existing.phone) === normalizedPhone);
    if (exists) {
        console.warn(`Duplicate found: ${l.name} (${l.phone})`);
        return false; 
    }

    const lead = {
        id: crypto.randomUUID(),
        name: l.name,
        phone: l.phone,
        area: l.area || l.address,
        pain: l.pain,
        channel: l.channel,
        en_message: l.en_message,
        ar_message: l.ar_message,
        status: 'New',
        notes: '',
        follow_up_date: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: l.source,
        place_id: l.place_id || null,
        rating: l.rating || null,
        activity_log: [{ action: "Imported to CRM", timestamp: new Date().toISOString() }]
    };
    DataStore.saveLead(lead);
    if (typeof window.syncToSheets === 'function') window.syncToSheets(lead);
    return true;
}
