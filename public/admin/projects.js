const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/login';

const _projectsUser = (() => { try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; } })();
if (!_projectsUser || _projectsUser.role !== 'admin') window.location.href = '/';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function handleUnauthorized(status) {
  if (status === 401 || status === 403) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/login';
    return true;
  }
  return false;
}

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/projects`;
let allProjects = [];

async function init() {
  await fetchProjects();
}

async function fetchProjects() {
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (!res.ok) {
      if (handleUnauthorized(res.status)) return;
      throw new Error('Failed to fetch');
    }
    allProjects = await res.json();
    renderProjects();
  } catch (e) {
    showToast('Error loading projects', 'error');
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;

  const id = document.getElementById('projectId').value;
  const data = {
    name: document.getElementById('name').value.trim(),
    color: document.getElementById('color').value,
    status: document.getElementById('status').value,
    description: document.getElementById('description').value.trim(),
    budgetHours: Number(document.getElementById('budgetHours').value) || 0,
    budgetAmount: Number(document.getElementById('budgetAmount').value) || 0
  };

  try {
    if (id) {
      await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) });
      showToast('Project updated!', 'success');
    } else {
      await fetch(API_URL, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) });
      showToast('Project created!', 'success');
    }
    resetForm();
    await fetchProjects();
  } catch (err) {
    showToast('Error saving project', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

function renderProjects() {
  const list = document.getElementById('projectList');
  document.getElementById('projectCount').textContent = allProjects.length;

  if (allProjects.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon-wrapper"><i data-lucide="folder-plus"></i></div>
      <h3>No projects yet</h3>
      <p>Use the form on the left to create your first project.</p>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.innerHTML = allProjects.map(p => `
    <div class="task-card">
      <div class="task-card-header">
        <h3 style="display:flex; align-items:center; margin: 0; font-size: 1.1rem; color: #fff;">
          <span class="color-preview" style="background:${p.color}"></span> 
          ${escapeHtml(p.name)}
        </h3>
        <div>
          <button class="edit-btn" onclick="startEdit('${p.id || p._id}')"><i data-lucide="edit-2"></i> Edit</button>
          <button class="delete-btn" onclick="deleteProj('${p.id || p._id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div style="margin-top:10px; color:#c9d1d9; font-size:0.9rem">${escapeHtml(p.description) || '<i>No description provided.</i>'}</div>
      
      ${renderBudgetBars(p)}
      
      <div style="margin-top:10px; font-size:0.8rem; display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.1);">Status: ${p.status}</div>
    </div>
  `).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderBudgetBars(p) {
  if (!p.budgetHours && !p.budgetAmount) return '';
  
  let html = '<div style="margin-top:15px; border-top: 1px solid var(--border); padding-top: 12px;">';
  
  if (p.budgetHours > 0) {
    const percent = Math.min(100, (p.actualHours / p.budgetHours) * 100);
    const color = percent >= 100 ? 'var(--error)' : percent >= 80 ? 'var(--warning)' : 'var(--accent)';
    html += `
      <div style="margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
          <span>Hours: ${p.actualHours.toFixed(1)} / ${p.budgetHours}h</span>
          <span style="color:${color}">${percent.toFixed(0)}%</span>
        </div>
        <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${percent}%; background:${color}; border-radius:3px;"></div>
        </div>
      </div>
    `;
  }
  
  if (p.budgetAmount > 0) {
    const percent = Math.min(100, (p.actualAmount / p.budgetAmount) * 100);
    const color = percent >= 100 ? 'var(--error)' : percent >= 80 ? 'var(--warning)' : 'var(--accent)';
    html += `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
          <span>Budget: $${(p.actualAmount || 0).toLocaleString()} / $${p.budgetAmount.toLocaleString()}</span>
          <span style="color:${color}">${percent.toFixed(0)}%</span>
        </div>
        <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${percent}%; background:${color}; border-radius:3px;"></div>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

function startEdit(id) {
  const p = allProjects.find(x => String(x.id || x._id) === String(id));
  if (!p) return;
  
  document.getElementById('formTitle').textContent = '✏️ Edit Project';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('submitBtn').innerHTML = '<span>💾 Update</span>';
  
  document.getElementById('projectId').value = p.id || p._id;
  document.getElementById('name').value = p.name;
  document.getElementById('color').value = p.color;
  document.getElementById('status').value = p.status;
  document.getElementById('description').value = p.description;
  document.getElementById('budgetHours').value = p.budgetHours || '';
  document.getElementById('budgetAmount').value = p.budgetAmount || '';
}

function cancelEdit() { resetForm(); }

function resetForm() {
  document.getElementById('projectForm').reset();
  document.getElementById('projectId').value = '';
  document.getElementById('formTitle').textContent = '➕ Add New Project';
  document.getElementById('cancelEditBtn').classList.add('hidden');
  document.getElementById('submitBtn').innerHTML = '<span>➕ Add Project</span>';
  document.getElementById('color').value = '#6366f1';
}

async function deleteProj(id) {
  if (!confirm('Delete this project? Warning: Tasks assigned to this project will lose their project association.')) return;
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    showToast('Deleted', 'success');
    await fetchProjects();
  } catch (e) {
    showToast('Error', 'error');
  }
}

function showToast(msg, type) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

init();
