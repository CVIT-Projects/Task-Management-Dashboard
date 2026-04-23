const token = localStorage.getItem('authToken');
if (!token) window.location.href = '/login';

const userRaw = localStorage.getItem('authUser');
const currentUser = userRaw ? JSON.parse(userRaw) : null;

// Enforce admin-only access on the frontend
if (!currentUser || currentUser.role !== 'admin') {
  window.location.href = '/';
}

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
  await fetchProjects();
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

async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/api/projects`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const projects = await res.json();
    const select = document.getElementById('project');
    select.innerHTML = '<option value="">-- No Project --</option>';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id || p._id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  } catch (e) {
    console.warn('Could not load projects for dropdown:', e.message);
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
    updateBlockedByDropdown();
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }
}

function updateBlockedByDropdown() {
  const select = document.getElementById('blockedBy');
  const currentTaskId = document.getElementById('taskId').value;
  
  // Save current selections
  const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
  
  select.innerHTML = '';
  // Fill with all tasks except the one being edited
  allTasks.forEach(t => {
    if (String(t.id) === String(currentTaskId)) return;
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.taskName} (#${t.id})`;
    if (selectedValues.includes(String(t.id))) opt.selected = true;
    select.appendChild(opt);
  });
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
    project: document.getElementById('project').value || null,
    startDateTime: document.getElementById('startDateTime').value,
    deadline: document.getElementById('deadline').value,
    estimatedHours: document.getElementById('estimatedHours').value ? Number(document.getElementById('estimatedHours').value) : null,
    endTime: document.getElementById('endTime').value || null,
    priority: document.getElementById('priority').value,
    isBillable: document.getElementById('isBillable').checked,
    tags: document.getElementById('tags').value
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean),
    blockedBy: Array.from(document.getElementById('blockedBy').selectedOptions).map(opt => opt.value),
    recurring: {
      enabled: document.getElementById('recurringEnabled').checked,
      frequency: document.getElementById('frequency').value
    }
  };

  const initialActivityComment = document.getElementById('adminActivityComment').value.trim();

  // Only include notes if both fields are filled — never send null
  if (fileName && downloadUrl) {
    data.notes = { fileName, downloadUrl };
  }

  try {
    let result;
    if (id) {
      result = await updateTask(id, data);
      showToast('✅ Task updated successfully!', 'success');
    } else {
      result = await createTask(data);
      showToast('✅ Task added successfully!', 'success');
    }

    // If there's an initial activity comment, post it
    if (initialActivityComment) {
      const taskId = id || result.id || result._id;
      await fetch(`${API_BASE}/api/comments/${taskId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: initialActivityComment })
      });
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

  const projectId = task.project?._id || task.project?.id || task.project || '';
  document.getElementById('project').value = projectId;

  document.getElementById('startDateTime').value = toDatetimeLocal(task.startDateTime);
  document.getElementById('deadline').value = toDatetimeLocal(task.deadline);
  document.getElementById('estimatedHours').value = task.estimatedHours || '';
  document.getElementById('endTime').value = task.endTime ? toDatetimeLocal(task.endTime) : '';
  document.getElementById('priority').value = task.priority;
  document.getElementById('isBillable').checked = !!task.isBillable;
  document.getElementById('fileName').value = task.notes?.fileName || '';
  document.getElementById('downloadUrl').value = task.notes?.downloadUrl || '';
  document.getElementById('tags').value = (task.tags || []).join(', ');
  
  const isRecurring = !!task.recurring?.enabled;
  document.getElementById('recurringEnabled').checked = isRecurring;
  document.getElementById('frequency').value = task.recurring?.frequency || 'daily';
  toggleFrequency(isRecurring);

  // Update blockedBy dropdown and set selections
  updateBlockedByDropdown();
  const blockedBySelect = document.getElementById('blockedBy');
  const blockedIds = (task.blockedBy || []).map(b => b.id || b._id || b);
  Array.from(blockedBySelect.options).forEach(opt => {
    opt.selected = blockedIds.includes(opt.value);
  });

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
  // Clear the activity comment as well
  const commentField = document.getElementById('adminActivityComment');
  if (commentField) commentField.value = '';
  document.getElementById('frequencyGroup').classList.add('hidden');
  updateBlockedByDropdown();
}

function toggleFrequency(enabled) {
  const group = document.getElementById('frequencyGroup');
  if (enabled) group.classList.remove('hidden');
  else group.classList.add('hidden');
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

  const attachmentHTML = task.notes && isSafeUrl(task.notes.downloadUrl)
    ? `<a href="${escapeHtml(task.notes.downloadUrl)}" target="_blank" rel="noopener noreferrer" class="attachment-chip">⬇ ${escapeHtml(task.notes.fileName)}</a>`
    : `<span class="no-file">No file</span>`;

  return `
    <div class="task-card ${priorityClass} ${overdueClass}">
      <div class="task-card-header">
        <div class="task-card-title-row">
          <span class="task-id-badge">#${task.id}</span>
          <h3 class="task-card-name">${escapeHtml(task.taskName)}</h3>
          ${overdue ? '<span class="overdue-tag">OVERDUE</span>' : ''}
          ${task.blockedBy && task.blockedBy.length > 0 ? `<span class="blocked-badge" title="Blocked by: ${task.blockedBy.map(b => b.taskName).join(', ')}">🚫 Blocked</span>` : ''}
        </div>
        <div class="task-card-actions">
          <button class="edit-btn" data-task-id="${task.id}" title="Edit task">✏️ Edit</button>
          <button class="delete-btn" data-task-id="${task.id}" data-task-name="${escapeHtml(task.taskName)}" title="Delete task">🗑️ Delete</button>
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
          ${task.isBillable ? '<span class="priority-badge" style="background:#10b981; color:#fff">💰 Billable</span>' : ''}
          <button class="admin-activity-btn" data-task-id="${task.id}">💬 Activity</button>
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
        ${task.tags && task.tags.length > 0 ? `
        <div class="meta-item" style="grid-column: 1/-1;">
          <span class="meta-label">Tags</span>
          <span class="tags-row">${task.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}</span>
        </div>` : ''}
      </div>
      <div id="activity-panel-${task.id}" class="admin-activity-panel hidden">
        <div class="activity-loading">Loading activity...</div>
      </div>
    </div>`;
}

// Look up task by ID from allTasks and open edit form
// ─── Activity Feed Logic (Admin) ───────────────────────────────────────────

async function toggleAdminActivity(taskId) {
  const panel = document.getElementById(`activity-panel-${taskId}`);
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  await refreshAdminActivity(taskId);
}

async function refreshAdminActivity(taskId) {
  const panel = document.getElementById(`activity-panel-${taskId}`);
  panel.innerHTML = '<div class="activity-loading">Loading activity...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/comments/${taskId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch activity');
    const activities = await res.json();
    renderAdminActivity(taskId, activities);
  } catch (err) {
    panel.innerHTML = `<div class="activity-error">Error: ${err.message}</div>`;
  }
}

function renderAdminActivity(taskId, activities) {
  const panel = document.getElementById(`activity-panel-${taskId}`);
  
  let html = `
    <div class="admin-activity-feed">
      ${activities.length === 0 ? '<p class="empty-feed">No activity yet.</p>' : 
        activities.map(act => `
          <div class="admin-activity-item ${act.type}">
            <div class="act-avatar">${act.user?.name?.charAt(0).toUpperCase() || '?'}</div>
            <div class="act-content">
              <div class="act-meta">
                <strong>${escapeHtml(act.user?.name || 'User')}</strong>
                <span>${new Date(act.createdAt).toLocaleString()}</span>
              </div>
              <p class="act-text">${escapeHtml(act.text)}</p>
            </div>
          </div>
        `).join('')
      }
    </div>
    <div class="admin-comment-form">
      <input type="text" id="comment-input-${taskId}" placeholder="Add a comment..." class="admin-comment-input">
      <button class="admin-post-comment-btn" data-task-id="${taskId}">Post</button>
    </div>
  `;
  panel.innerHTML = html;
}

async function postAdminComment(taskId) {
  const input = document.getElementById(`comment-input-${taskId}`);
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API_BASE}/api/comments/${taskId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Failed to post comment');
    input.value = '';
    await refreshAdminActivity(taskId);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ─── Utility & Modal Functions (Restored) ───────────────────────────────────

function startEdit(id) {
  const task = allTasks.find(t => String(t.id) === String(id));
  if (task) populateEditForm(task);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function isSafeUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function openDeleteModal(id, name) {
  deleteTargetId = id;
  const msg = document.getElementById('modalMessage');
  if (msg) msg.textContent = `Delete "${name}"? This cannot be undone.`;
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeModal() {
  deleteTargetId = null;
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await deleteTask(deleteTargetId);
    showToast('🗑️ Task deleted.', 'success');
    await fetchTasks();
    if (document.getElementById('taskId').value == deleteTargetId) resetForm();
  } catch (e) {
    showToast('❌ Could not delete task.', 'error');
  } finally {
    closeModal();
  }
}

function setStatus(online) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (dot) dot.className = 'status-dot ' + (online ? 'online' : 'offline');
  if (txt) txt.textContent = online ? 'API Connected' : 'API Unreachable';
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  if (toastMsg) toastMsg.textContent = msg;
  if (toast) {
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }
}

// Event Delegation for Task Actions
const listEl = document.getElementById('taskList');
if (listEl) {
  listEl.addEventListener('click', function(e) {
    const target = e.target;
    const taskId = target.getAttribute('data-task-id');

    if (target.classList.contains('edit-btn')) {
      startEdit(taskId);
    } else if (target.classList.contains('delete-btn')) {
      const taskName = target.getAttribute('data-task-name');
      openDeleteModal(taskId, taskName);
    } else if (target.classList.contains('admin-activity-btn')) {
      toggleAdminActivity(taskId);
    } else if (target.classList.contains('admin-post-comment-btn')) {
      postAdminComment(taskId);
    }
  });
}

// Expose functions to window for onclick handlers that are still in HTML (like modals/header)
window.logout = logout;
window.closeModal = closeModal;
window.cancelEdit = cancelEdit;
window.confirmDelete = confirmDelete;
window.toggleFrequency = toggleFrequency;

init();
