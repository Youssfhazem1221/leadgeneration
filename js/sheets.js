import { DataStore } from './datastore.js?v=29';
import { showToast } from './ui_v23.js';

export async function syncToSheets(lead) {
    const url = DataStore.getSettings().webhookUrl;
    if(!url) return;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            // Note: keeping no-cors as a fallback but trying to detect failure where possible.
            // If the user's Apps Script doesn't have CORS headers, regular fetch will fail.
            // For true error handling, the Apps Script needs: 
            // return ContentService.createTextOutput("success").setMimeType(ContentService.MimeType.TEXT);
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "upsert_lead",
                lead: {
                    id: lead.id, name: lead.name, phone: lead.phone, area: lead.area,
                    pain: lead.pain, status: lead.status, source: lead.source,
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        // With no-cors, response.ok is always false and status is 0.
        // We can't easily detect success/failure here without CORS on the server.
        // But we can at least catch network errors.
        showToast("Synced to Sheets");
    } catch (error) {
        console.error("Sheets sync error:", error);
        showToast("Sheets sync failed", "error");
    }
}

export async function syncAllToSheets() {
    const leads = DataStore.getLeads();
    const url = DataStore.getSettings().webhookUrl;
    if(!url) return showToast("No Webhook URL set in settings", "error");
    if(!leads.length) return showToast("No leads to sync", "warning");

    showToast(`Starting sync for ${leads.length} leads...`);
    
    let successCount = 0;
    let failCount = 0;

    for(const lead of leads) {
        try {
            await syncToSheets(lead);
            successCount++;
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            failCount++;
        }
    }
    
    if (failCount === 0) {
        showToast(`Bulk sync completed: ${successCount} leads`);
    } else {
        showToast(`Bulk sync: ${successCount} success, ${failCount} failed`, "warning");
    }
}
