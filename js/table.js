import { DataStore } from './datastore.js?v=22';
import { showToast, openDrawer, addActivity, showModal, deleteLead } from './ui_v22.js';

let currentSortCol = '';
let sortAsc = true;

export function sortTable(col) {
    if(currentSortCol === col) sortAsc = !sortAsc;
    else { currentSortCol = col; sortAsc = true; }
    renderTable();
}

export function normalizePhone(phone) {
    if (!phone) return '';
    let p = phone.toString().replace(/[\s\-\(\)]/g, '');  // Strip formatting
    if (p.startsWith('+20')) p = '0' + p.slice(3);  // +20xxx → 0xxx
    if (p.startsWith('20') && p.length === 12) p = '0' + p.slice(2);  // 20xxx → 0xxx
    return p;
}

export function renderTable() {
    let leads = DataStore.getLeads();
    
    const searchEl = document.getElementById('filter-search');
    const statusEl = document.getElementById('filter-status');
    const sourceEl = document.getElementById('filter-source');

    if (!searchEl || !statusEl || !sourceEl) return;

    const search = searchEl.value.toLowerCase();
    const status = statusEl.value;
    const source = sourceEl.value;
    
    leads = leads.filter(l => {
        const matchSearch = l.name.toLowerCase().includes(search) || l.phone.includes(search);
        const matchStatus = status === 'All' || l.status === status;
        const matchSource = source === 'All' || l.source === source;
        return matchSearch && matchStatus && matchSource;
    });

    if(currentSortCol) {
        leads.sort((a,b) => {
            let valA = a[currentSortCol] || '';
            let valB = b[currentSortCol] || '';
            if(valA < valB) return sortAsc ? -1 : 1;
            if(valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }

    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];

    leads.forEach(l => {
        const tr = document.createElement('tr');
        const overdue = (l.follow_up_date && l.follow_up_date <= todayStr && !['Closed', 'Not Interested'].includes(l.status));
        if(overdue) tr.classList.add('overdue');
        
        const isReal = l.source === 'places';
        const isCSV = l.source === 'csv_import';
        const sourceClass = isReal ? 'source-real' : (isCSV ? 'source-csv' : 'source-ai');
        const sourceText = isReal ? 'Real' : (isCSV ? 'CSV' : 'AI');
        const channelClass = 'channel-' + (l.channel || 'whatsapp').toLowerCase();
        
        // Status Badge class mapping
        const statusClassMap = {
            'New': 'status-new',
            'Contacted': 'status-contacted',
            'Replied': 'status-replied',
            'Call Booked': 'status-booked',
            'Closed': 'status-closed',
            'Not Interested': 'status-notinter'
        };
        const statusClass = statusClassMap[l.status] || 'status-new';

        tr.innerHTML = `
            <td class="font-semibold">${l.name}</td>
            <td>${l.phone}</td>
            <td>${l.area || '-'}</td>
            <td><span class="pill-source ${sourceClass}">${sourceText}</span></td>
            <td><span class="channel-dot ${channelClass}"></span>${l.channel}</td>
            <td><span class="status-badge ${statusClass}">${l.status}</span></td>
            <td class="${overdue ? 'text-red' : ''}">${l.follow_up_date || '-'}</td>
            <td>
                <div class="flex gap-2">
                    <button class="edit-btn" data-id="${l.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;">Edit</button>
                    <button class="delete-btn" data-id="${l.id}" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openDrawer(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteLead(btn.dataset.id));
    });

    const countEl = document.getElementById('table-count');
    if (countEl) countEl.innerText = `Total: ${leads.length} Leads`;
}


export function exportCSV() {
    const leads = DataStore.getLeads();
    if(!leads.length) return showToast("No leads to export", "warning");
    
    const cols = ['id', 'name', 'phone', 'area', 'source', 'channel', 'status', 'pain', 'follow_up_date', 'place_id', 'created_at'];
    let csv = cols.join(',') + '\n';
    
    leads.forEach(l => {
        csv += cols.map(c => {
            let val = l[c] || '';
            if(typeof val === 'string') val = val.replace(/"/g, '""');
            return `"${val}"`;
        }).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

export function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        processCSV(text);
    };
    reader.readAsText(file);
    event.target.value = '';
}

export async function processCSV(text) {
    const firstLine = text.split('\n')[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    const rows = parseCSV(text, separator);
    if (rows.length < 2) return showToast("CSV is empty or invalid", "error");

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);
    let importCount = 0;

    for (const row of dataRows) {
        if (row.length < 1 || (row.length === 1 && !row[0])) continue;

        const lead = {
            id: 'lead_' + Math.random().toString(36).substr(2, 9),
            name: '',
            phone: '',
            area: '',
            source: 'csv_import',
            channel: 'WhatsApp',
            status: 'New',
            pain: '',
            follow_up_date: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            activity_log: [{ action: "Imported from CSV", timestamp: new Date().toISOString() }]
        };

        headers.forEach((header, index) => {
            let value = row[index] ? row[index].trim() : '';
            if (!value) return;

            if (header.includes('name')) lead.name = value;
            else if (header.includes('phone') || header.includes('number') || header.includes('tel')) lead.phone = normalizePhone(value);
            else if (header.includes('area') || header.includes('location') || header.includes('city')) lead.area = value;
            else if (header.includes('status')) {
                const v = value.toLowerCase();
                if (v.includes('new')) lead.status = 'New';
                else if (v.includes('contact')) lead.status = 'Contacted';
                else if (v.includes('replied')) lead.status = 'Replied';
                else if (v.includes('book')) lead.status = 'Call Booked';
                else if (v.includes('close')) lead.status = 'Closed';
                else if (v.includes('not inter')) lead.status = 'Not Interested';
                else lead.status = value; 
            }
            else if (header.includes('channel')) lead.channel = value;
            else if (header.includes('pain')) lead.pain = value;
            else if (header.includes('source')) lead.source = value;
            else if (header.includes('date')) lead.follow_up_date = value;
            else if (header === 'id') lead.id = value;
        });

        if (lead.name || lead.phone) {
            try {
                await DataStore.saveLead(lead);
                importCount++;
            } catch (err) {
                console.error("Failed to import lead", lead, err);
                showToast("Error saving a lead: " + err.message, "error");
            }
        }
    }

    if (importCount > 0) {
        showToast(`Imported ${importCount} leads successfully.`);
        if (typeof window.refreshUI === 'function') window.refreshUI();
    } else {
        showToast("No leads were imported. Check CSV format.", "warning");
    }
}

function parseCSV(text, separator = ',') {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === separator) {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\r' || char === '\n') {
                currentRow.push(currentField);
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentField += char;
            }
        }
    }
    if (currentRow.length > 0 || currentField !== '') {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    return rows;
}
