const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/';

const userRaw = localStorage.getItem('authUser');
const currentUser = userRaw ? JSON.parse(userRaw) : null;

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
    window.location.href = '/';
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = '/';
}

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/tasks`;
let allTasks = [];
let deleteTargetId = null;

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
  if (currentUser) {
    document.getElementById('adminUserName').textContent = currentUser.name;
  }
  await fetchUsers();
  await fetchTasks();
  setInterval(fetchTasks, 10000);
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/users`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const users = await res.json();
    const select = document.getElementById('assignedTo');
    select.innerHTML = '<option value="">-- Select Assignee --</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id || u._id;   // id is set by toJSON transform
      opt.textContent = `${u.name} (${u.email})`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.warn('Could not load users for dropdown:', e.message);
  }
}

async function fetchTasks() {
  try {
    const res = await fetch(API_URL, { headers: getAuthHeaders() });
    if (!res.ok) {
      if (handleUnauthorized(res.status)) return;
      throw new Error('Server error');
    }
    allTasks = await res.json();
    renderTasks();
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }
}

async function createTask(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (handleUnauthorized(res.status)) return;
    throw new Error('Failed to create task');
  }
  return res.json();
}

async function updateTask(id, data) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (handleUnauthorized(res.status)) return;
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Server error ${res.status}`);
  }
  return res.json();
}

async function deleteTask(id) {
  const res = await fetch(`${API_URL}/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    if (handleUnauthorized(res.status)) return;
    throw new Error('Failed to delete task');
  }
}

// ─── Form Handling ───────────────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-inline"></span> Saving...';

  const id = document.getElementById('taskId').value;
  const fileName = document.getElementById('fileName').value.trim();
  const downloadUrl = document.getElementById('downloadUrl').value.trim();

  const data = {
    taskName: document.getElementById('taskName').value.trim(),
    assignedTo: document.getElementById('assignedTo').value || null,
    startDateTime: document.getElementById('startDateTime').value,
    deadline: document.getElementById('deadline').value,
    estimatedHours: document.getElementById('estimatedHours').value ? Number(document.getElementById('estimatedHours').value) : null,
    endTime: document.getElementById('endTime').value || null,
    priority: document.getElementById('priority').value,
  };

  // Only include notes if both fields are filled — never send null
  if (fileName && downloadUrl) {
    data.notes = { fileName, downloadUrl };
  }

  try {
    if (id) {
      await updateTask(id, data);
      showToast('✅ Task updated successfully!', 'success');
    } else {
      await createTask(data);
      showToast('✅ Task added successfully!', 'success');
    }
    resetForm();
    await fetchTasks();
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = id ? '<span>💾 Update Task</span>' : '<span>➕ Add Task</span>';
  }
}

function populateEditForm(task) {
  document.getElementById('formTitle').textContent = '✏️ Edit Task';
  document.getElementById('submitBtn').innerHTML = '<span>💾 Update Task</span>';
  document.getElementById('cancelEditBtn').classList.remove('hidden');

  document.getElementById('taskId').value = task.id;
  document.getElementById('taskName').value = task.taskName;
  // Pre-select the correct user in the dropdown
  const assignedId = task.assignedTo?._id || task.assignedTo?.id || task.assignedTo || '';
  document.getElementById('assignedTo').value = assignedId;
  document.getElementById('startDateTime').value = toDatetimeLocal(task.startDateTime);
  document.getElementById('deadline').value = toDatetimeLocal(task.deadline);
  document.getElementById('estimatedHours').value = task.estimatedHours || '';
  document.getElementById('endTime').value = task.endTime ? toDatetimeLocal(task.endTime) : '';
  document.getElementById('priority').value = task.priority;
  document.getElementById('fileName').value = task.notes?.fileName || '';
  document.getElementById('downloadUrl').value = task.notes?.downloadUrl || '';

  document.getElementById('taskForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  resetForm();
}

function resetForm() {
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';
  document.getElementById('formTitle').textContent = '➕ Add New Task';
  document.getElementById('submitBtn').innerHTML = '<span>➕ Add Task</span>';
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

function toDatetimeLocal(str) {
  if (!str) return '';
  const d = new Date(str);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Task Rendering ──────────────────────────────────────────────────────────

function renderTasks() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filterP = document.getElementById('filterPriority').value;

  let tasks = allTasks.filter(t => {
    const assignedName = t.assignedTo?.name ?? '';
    const matchSearch = t.taskName.toLowerCase().includes(search) ||
                        assignedName.toLowerCase().includes(search);
    const matchPriority = filterP === 'All' || t.priority === filterP;
    return matchSearch && matchPriority;
  });

  // Sort: deadline asc, then priority
  const pOrder = { High: 1, Medium: 2, Low: 3 };
  tasks.sort((a, b) => {
    const diff = new Date(a.deadline) - new Date(b.deadline);
    return diff !== 0 ? diff : pOrder[a.priority] - pOrder[b.priority];
  });

  document.getElementById('taskCount').textContent = tasks.length;

  const list = document.getElementById('taskList');
  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🗂️</div><p>No tasks match your filter.</p></div>`;
    return;
  }

  list.innerHTML = tasks.map(task => buildTaskCard(task)).join('');
}

function buildTaskCard(task) {
  const priorityClass = {
    High: 'priority-high',
    Medium: 'priority-medium',
    Low: 'priority-low',
  }[task.priority] || '';

  const priorityIcon = { High: '🔴', Medium: '🟠', Low: '🟢' }[task.priority];
  const overdue = new Date(task.deadline) < new Date();
  const overdueClass = overdue ? 'overdue' : '';

  const formatDT = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const attachmentHTML = task.notes
    ? `<a href="${task.notes.downloadUrl}" target="_blank" class="attachment-chip">⬇ ${task.notes.fileName}</a>`
    : `<span class="no-file">No file</span>`;

  return `
    <div class="task-card ${priorityClass} ${overdueClass}">
      <div class="task-card-header">
        <div class="task-card-title-row">
          <span class="task-id-badge">#${task.id}</span>
          <h3 class="task-card-name">${escapeHtml(task.taskName)}</h3>
          ${overdue ? '<span class="overdue-tag">OVERDUE</span>' : ''}
        </div>
        <div class="task-card-actions">
          <button class="edit-btn" onclick="startEdit('${task.id}')" title="Edit task">✏️ Edit</button>
          <button class="delete-btn" onclick="openDeleteModal('${task.id}', '${escapeHtml(task.taskName)}')" title="Delete task">🗑️ Delete</button>
        </div>
      </div>
      <div class="task-card-meta">
        <div class="meta-item">
          <span class="meta-label">Assigned</span>
          <span class="meta-value avatar-row"><span class="avatar-sm">${task.assignedTo?.name?.charAt(0) ?? '?'}</span>${escapeHtml(task.assignedTo?.name ?? 'Unassigned')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Priority</span>
          <span class="priority-badge ${priorityClass}">${priorityIcon} ${task.priority}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Start</span>
          <span class="meta-value">${formatDT(task.startDateTime)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Deadline</span>
          <span class="meta-value ${overdue ? 'overdue-date' : ''}">${formatDT(task.deadline)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">End Time</span>
          <span class="meta-value">${formatDT(task.endTime)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">File</span>
          ${attachmentHTML}
        </div>
      </div>
    </div>`;
}

// Look up task by ID from allTasks and open edit form
function startEdit(id) {
  console.log('startEdit called with id:', id);
  const task = allTasks.find(t => String(t.id) === String(id));
  console.log('task found:', task);
  if (task) populateEditForm(task);
  else console.warn('Task not found in allTasks for id:', id);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Delete Modal ───────────────────────────────────────────────────────────

function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('modalMessage').textContent = `Delete "${name}"? This cannot be undone.`;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  deleteTargetId = null;
  document.getElementById('modalOverlay').classList.add('hidden');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await deleteTask(deleteTargetId);
    showToast('🗑️ Task deleted.', 'success');
    await fetchTasks();
    // if currently editing this task, reset
    if (document.getElementById('taskId').value == deleteTargetId) resetForm();
  } catch (e) {
    showToast('❌ Could not delete task.', 'error');
  } finally {
    closeModal();
  }
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function setStatus(online) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot ' + (online ? 'online' : 'offline');
  txt.textContent = online ? 'API Connected' : 'API Unreachable';
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ─── Close modal on overlay click ───────────────────────────────────────────
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

init();
