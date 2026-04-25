const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/login';

const _auditUser = (() => { try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; } })();
if (!_auditUser || _auditUser.role !== 'admin') window.location.href = '/';

let currentPage = 1;
const API_URL = `${window.location.origin}/api/audit`;

async function fetchLogs(page = 1) {
    currentPage = page;
    const action = document.getElementById('filterAction').value;
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;

    let url = `${API_URL}?page=${page}&limit=20`;
    if (action) url += `&action=${action}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch logs');

        const data = await res.json();
        renderLogs(data.logs);
        updatePagination(data.page, data.pages, data.total);
    } catch (err) {
        console.error(err);
        showToast('Error loading audit logs', 'error');
    }
}

function renderLogs(logs) {
    const list = document.getElementById('auditList');
    if (logs.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">No logs found matching filters.</td></tr>`;
        return;
    }

    list.innerHTML = logs.map(log => {
        const date = new Date(log.createdAt).toLocaleString();
        const actionClass = log.action.includes('CREATE') ? 'badge-create' : 
                            log.action.includes('DELETE') ? 'badge-delete' : 
                            log.action.includes('UPDATE') ? 'badge-update' : 'badge-audit';
        
        return `
            <tr>
                <td style="white-space: nowrap;">${date}</td>
                <td>
                    <div style="font-weight:600;">${log.adminId?.name || 'Unknown'}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${log.adminId?.email || 'N/A'}</div>
                </td>
                <td><span class="action-badge ${actionClass}">${log.action}</span></td>
                <td><span style="color:var(--text-muted); font-size:0.8rem;">${log.targetModel}</span></td>
                <td>
                    <code class="details-json">${JSON.stringify(log.details, null, 2)}</code>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePagination(current, totalPages, totalCount) {
    document.getElementById('pageInfo').textContent = `Page ${current} of ${totalPages || 1} (${totalCount} total)`;
    document.getElementById('prevBtn').disabled = current <= 1;
    document.getElementById('nextBtn').disabled = current >= totalPages;
}

function changePage(delta) {
    fetchLogs(currentPage + delta);
}

function clearFilters() {
    document.getElementById('filterAction').value = '';
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    fetchLogs(1);
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
}

// Initial fetch
fetchLogs(1);
