const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/login';

let allUsers = [];

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
const API_URL = `${API_BASE}/api/users`;

async function init() {
  await fetchUsers();
}

async function fetchUsers() {
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (!res.ok) {
      if (handleUnauthorized(res.status)) return;
      throw new Error('Server error');
    }
    allUsers = await res.json();
    renderUsers();
  } catch (e) {
    showToast('❌ Could not load users: ' + e.message, 'error');
  }
}

async function updateUserRate(id, hourlyRate) {
  const res = await fetch(`${API_URL}/${id}/rate`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ hourlyRate }),
  });
  if (!res.ok) {
    if (handleUnauthorized(res.status)) return;
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Server error ${res.status}`);
  }
  return res.json();
}

async function handleSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-inline"></span> Saving...';

  const id = document.getElementById('userId').value;
  const rate = document.getElementById('hourlyRate').value;

  try {
    await updateUserRate(id, rate);
    showToast('✅ Hourly rate updated successfully!', 'success');
    resetForm();
    await fetchUsers();
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  } finally {
    submitBtn.innerHTML = '<span>💾 Set Rate</span>';
  }
}

function renderUsers() {
  document.getElementById('userCount').textContent = allUsers.length;
  const list = document.getElementById('userList');

  if (allUsers.length === 0) {
    list.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>No users found.</p></div>`;
    return;
  }

  list.innerHTML = allUsers.map(user => `
    <div class="task-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <h3 class="task-card-name" style="margin-bottom: 4px;">${escapeHtml(user.name)}</h3>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${escapeHtml(user.email)}</div>
        
        <div class="meta-item">
          <span class="meta-label">Role</span>
          <span class="priority-badge" style="background: var(--surface)">${user.role === 'admin' ? '🛡️ Admin' : '👤 User'}</span>
        </div>
        <div class="meta-item" style="margin-top: 8px;">
          <span class="meta-label">Hourly Rate</span>
          <span class="priority-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: bold; border: 1px solid rgba(16,185,129,0.2);">
            $ ${user.hourlyRate || 0} / hr
          </span>
        </div>
      </div>
      
      <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px;text-align: right;">
        <button class="edit-btn" onclick="startEdit('${user.id || user._id}')">✏️ Edit Rate</button>
      </div>
    </div>
  `).join('');
}

function startEdit(id) {
  const user = allUsers.find(u => String(u.id || u._id) === String(id));
  if (!user) return;
  
  document.getElementById('userId').value = user.id || user._id;
  document.getElementById('userName').value = `${user.name} (${user.email})`;
  document.getElementById('hourlyRate').value = user.hourlyRate || 0;
  
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  
  document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  document.getElementById('userForm').reset();
  document.getElementById('userId').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

init();
