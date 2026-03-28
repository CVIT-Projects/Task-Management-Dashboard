const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
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
    if (!res.ok) throw new Error('Failed to fetch');
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
    description: document.getElementById('description').value.trim()
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
    list.innerHTML = `<div class="empty-state"><p>No projects found. Add one on the left!</p></div>`;
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
          <button class="edit-btn" onclick="startEdit('${p.id || p._id}')">✏️ Edit</button>
          <button class="delete-btn" onclick="deleteProj('${p.id || p._id}')">🗑️</button>
        </div>
      </div>
      <div style="margin-top:10px; color:#c9d1d9; font-size:0.9rem">${escapeHtml(p.description) || '<i>No description provided.</i>'}</div>
      <div style="margin-top:10px; font-size:0.8rem; display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.1);">Status: ${p.status}</div>
    </div>
  `).join('');
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
