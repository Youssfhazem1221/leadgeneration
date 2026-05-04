import { DataStore } from './datastore.js?v=38';
import { getTimeAgo, openDrawer, addActivity, deleteLead } from './ui_v23.js?v=38';

export function renderStats() {
    const leads = DataStore.getLeads();
    const activeNiche = DataStore.getSettings().activeNiche;
    const filteredLeads = leads.filter(l => {
        const leadNiche = l.niche || 'Clinics';
        return !activeNiche || activeNiche === 'All' || leadNiche === activeNiche;
    });

    const total = filteredLeads.length;
    const booked = filteredLeads.filter(l => l.status === 'Call Booked').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const due = filteredLeads.filter(l => l.follow_up_date && l.follow_up_date <= todayStr && !['Closed', 'Not Interested'].includes(l.status)).length;

    const container = document.getElementById('stats-summary');
    if(!container) return;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total Leads</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--apple-blue);">${due}</div>
            <div class="stat-label">Follow-ups Due</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--apple-green);">${booked}</div>
            <div class="stat-label">Booked Calls</div>
        </div>
    `;
}

export function renderPipeline() {
    const leads = DataStore.getLeads();
    const activeNiche = DataStore.getSettings().activeNiche;
    const filteredLeads = leads.filter(l => {
        const leadNiche = l.niche || 'Clinics';
        return !activeNiche || activeNiche === 'All' || leadNiche === activeNiche;
    });

    const cols = ['New', 'Contacted', 'Replied', 'Call Booked', 'Closed'];
    const board = document.getElementById('kanban-board');
    if(!board) return;
    board.innerHTML = '';
    
    const todayStr = new Date().toISOString().split('T')[0];

    cols.forEach(status => {
        const colLeads = filteredLeads.filter(l => l.status === status);
        const col = document.createElement('div');
        col.className = 'kanban-column';
        col.innerHTML = `
            <div class="column-header">
                <span class="column-title">${status}</span>
                <span class="column-count">${colLeads.length}</span>
            </div>
            <div class="cards-container" id="col-${status}">
                ${colLeads.map(l => {
                    const isReal = l.source === 'places';
                    const isCSV = l.source === 'csv_import';
                    const sourceClass = isReal ? 'source-real' : (isCSV ? 'source-csv' : 'source-ai');
                    const sourceText = isReal ? 'Real' : (isCSV ? 'CSV' : 'AI');
                    const channelClass = 'channel-' + (l.channel || 'whatsapp').toLowerCase();
                    const overdue = (l.follow_up_date && l.follow_up_date <= todayStr && !['Closed', 'Not Interested'].includes(l.status));
                    
                    return `
                    <div class="lead-card ${overdue ? 'overdue' : ''}" draggable="true" data-id="${l.id}" id="card-${l.id}">
                        <div class="flex justify-between items-start mb-2">
                            <div class="lead-name truncate" title="${l.name}">${l.name}</div>
                            <div class="flex items-center gap-2">
                                <span class="pill-source ${sourceClass}">${sourceText}</span>
                                <button class="delete-card-btn" data-id="${l.id}" title="Delete Lead" style="background:none; border:none; color:var(--apple-secondary); font-size:18px; cursor:pointer; padding:4px; line-height:1; transition: color 0.2s;">âœ•</button>
                            </div>
                        </div>
                        <div class="text-sm text-secondary truncate mb-2">${l.pain || 'No pain point recorded'}</div>
                        <div class="flex justify-between items-center text-sm">
                            <div class="flex items-center"><span class="channel-dot ${channelClass}"></span>${l.channel}</div>
                            <div class="text-secondary">${getTimeAgo(l.created_at)}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        board.appendChild(col);
    });

    // Attach event listeners for drag and drop
    attachDragEvents();
}

function attachDragEvents() {
    document.querySelectorAll('.lead-card').forEach(card => {
        card.addEventListener('dragstart', (ev) => {
            ev.dataTransfer.setData("text", card.dataset.id);
            setTimeout(() => card.classList.add('dragging'), 0);
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        
        card.addEventListener('click', (e) => {
            // Don't open drawer if delete button was clicked
            if (e.target.closest('.delete-card-btn')) return;
            openDrawer(card.dataset.id);
        });
    });

    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening drawer
            deleteLead(btn.dataset.id);
        });
    });

    document.querySelectorAll('.cards-container').forEach(container => {
        container.addEventListener('dragover', (ev) => {
            ev.preventDefault();
            container.classList.add('drag-over');
        });
        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });
        container.addEventListener('drop', (ev) => {
            ev.preventDefault();
            container.classList.remove('drag-over');
            const id = ev.dataTransfer.getData("text");
            const newStatus = container.id.replace('col-', '');
            const lead = DataStore.getLeads().find(l => l.id === id);
            if(lead && lead.status !== newStatus) {
                const oldStatus = lead.status;
                lead.status = newStatus;
                addActivity(lead, `Moved from ${oldStatus} to ${newStatus}`);
                DataStore.saveLead(lead);
                if (typeof window.syncToSheets === 'function') window.syncToSheets(lead);
                // The refreshUI in app.html will handle re-rendering
            }
        });
    });
}
