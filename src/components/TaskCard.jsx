import { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskCard.css';
import { useTimer } from '../contexts/TimerContext';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_CONFIG = {
  High: { label: 'High', className: 'priority-high', icon: '🔴' },
  Medium: { label: 'Medium', className: 'priority-medium', icon: '🟠' },
  Low: { label: 'Low', className: 'priority-low', icon: '🟢' },
};

const STATUS_CONFIG = {
  'Not Started': { className: 'status-not-started', icon: '⚪' },
  'In Progress': { className: 'status-in-progress',  icon: '🔵' },
  'Completed':   { className: 'status-completed',    icon: '🟢' },
  'Blocked':     { className: 'status-blocked',      icon: '🔴' },
};

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString([], {
    month: 'short', day: '2-digit',
    year: 'numeric', hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdue(deadlineStr) {
  return new Date(deadlineStr) < new Date();
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getTimeRemaining(deadlineStr) {
  const total = Date.parse(deadlineStr) - Date.parse(new Date());
  if (total <= 0) return null;
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes };
}

function TaskCard({ task }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const overdue = isOverdue(task.deadline);
  
  const { activeEntry, elapsed, startTimer, stopTimer } = useTimer();
  const { token, user } = useAuth();
  
  const [localStatus, setLocalStatus] = useState(task.status);
  const [showActivities, setShowActivities] = useState(false);
  const [activities, setActivities] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(task.deadline));
  
  const incompleteBlockers = (task.blockedBy || []).filter(b => b.status !== 'Completed');
  const isBlocked = incompleteBlockers.length > 0;
  
  // Update state immediately if deadline prop changes
  useEffect(() => {
    setTimeRemaining(getTimeRemaining(task.deadline));
  }, [task.deadline]);

  // Update countdown for tasks due within 24 hours
  useEffect(() => {
    if (overdue || localStatus === 'Completed') return;
    
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(task.deadline);
      setTimeRemaining(remaining);
      if (!remaining) clearInterval(interval);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [task.deadline, overdue, localStatus]);

  // Sync status if parent prop updates
  useEffect(() => {
    setLocalStatus(task.status);
  }, [task.status]);
  
  // Handle both populated task { id, name } and unpopulated task (string ID) from recent API response
  const activeTaskId = typeof activeEntry?.task === 'object' ? activeEntry.task?.id : activeEntry?.task;
  const isRunning = activeTaskId === String(task.id);
  
  // Ownership check: does the logged-in user own this task?
  const assignedUserId = typeof task.assignedTo === 'object' && task.assignedTo !== null 
    ? task.assignedTo.id || task.assignedTo._id 
    : task.assignedTo;
  const isOwner = assignedUserId && user && String(assignedUserId) === String(user.id);
  
  // If timer is suddenly running, auto-promote to In Progress visually
  useEffect(() => {
    if (isRunning && localStatus === 'Not Started') {
      setLocalStatus('In Progress');
    }
  }, [isRunning, localStatus]);

  const isEffectivelyOverdue = overdue && localStatus !== 'Completed';
  const isDueSoon = timeRemaining && timeRemaining.total < 86400000; // 24 hours

  // Force stop the timer immediately if the deadline crossover occurs while running
  useEffect(() => {
    if (isEffectivelyOverdue && isRunning) {
      stopTimer();
    }
  }, [isEffectivelyOverdue, isRunning, stopTimer]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const oldStatus = localStatus;
    setLocalStatus(newStatus); // Optimistic UI update
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      await axios.patch(
        `${API_BASE}/api/tasks/${task.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // If marked Completed, and timer is running, stop the timer auto!
      if (newStatus === 'Completed' && isRunning) {
         stopTimer();
      }

      // Refresh activities if panel is open
      if (showActivities) {
        loadActivities();
      }
    } catch (err) {
      console.error(err);
      setLocalStatus(oldStatus); // Revert
      alert('Failed to update status');
    }
  };

  const toggleActivities = () => {
    if (showActivities) {
      setShowActivities(false);
    } else {
      loadActivities();
      setShowActivities(true);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await axios.get(`${API_BASE}/api/comments/${task.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await axios.post(
        `${API_BASE}/api/comments/${task.id}`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivities([res.data, ...activities]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
      alert('Could not post comment');
    }
  };

  return (
    <div id={`task-${task.id}`} className={`task-row ${priority.className} ${overdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}`}>
      <div className="col-id">
        <span className="task-id">#{task.id}</span>
      </div>

      <div className="col-name">
        {task.project && (
          <span className="project-badge" style={{ background: task.project.color }}>
            {task.project.name}
          </span>
        )}
        <span className="task-name">
          {task.taskName}
          {task.recurring && task.recurring.enabled && (
            <span className="recurring-badge" title={`Recurring: ${task.recurring.frequency}`}>🔁</span>
          )}
        </span>
        
        {task.isBillable && (
          <span className="project-badge" style={{ background: '#10b981', marginLeft: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>$</span> Billable
          </span>
        )}
        
        {task.estimatedHours && (
          <div className="estimate-bar-container">
            <div 
              className="estimate-fill" 
              style={{ 
                width: `${Math.min(100, ((task.trackedSeconds || 0) / 3600 / task.estimatedHours) * 100)}%`,
                background: ((task.trackedSeconds || 0) / 3600) > task.estimatedHours ? '#ff7b72' : '#3fb950'
              }}
            />
            <span className="estimate-label">
              {((task.trackedSeconds || 0) / 3600).toFixed(1)}h / {task.estimatedHours}h
            </span>
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="task-tags">
            {task.tags.map(tag => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}

        <div className="task-badges">
          {isBlocked && (
            <span className="blocked-badge-main" title={`Blocked by: ${incompleteBlockers.map(b => b.taskName).join(', ')}`}>
              🚫 Blocked by: {incompleteBlockers.map(b => b.taskName).join(', ')}
            </span>
          )}
          {overdue && localStatus !== 'Completed' && <span className="overdue-badge">Overdue</span>}
          {isDueSoon && localStatus !== 'Completed' && (
            <span className="due-soon-badge pulse">
              Due in {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}{timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          )}
          {localStatus && (
            <select
              className={`status-chip ${STATUS_CONFIG[localStatus]?.className}`}
              value={localStatus}
              onChange={handleStatusChange}
              disabled={isEffectivelyOverdue}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.65rem',
                padding: '2px 8px',
                margin: '0',
                cursor: isEffectivelyOverdue ? 'not-allowed' : 'pointer',
                outline: 'none',
                appearance: 'none',   // Removes default dropdown arrow
                border: '1px solid transparent',
                opacity: isEffectivelyOverdue ? 0.6 : 1,
              }}
              title={isEffectivelyOverdue ? "Locked (Overdue)" : "Click to update task status"}
            >
              {Object.keys(STATUS_CONFIG).map(s => (
                <option key={s} value={s} style={{ color: '#fff', background: '#333' }}>
                  {STATUS_CONFIG[s].icon} {s}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {isOwner && (
          localStatus === 'Completed' ? (
            <button className="timer-btn stopped" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              ✔ Completed
            </button>
          ) : isEffectivelyOverdue ? (
            <button className="timer-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed', color: '#ff7b72', background: 'rgba(248, 81, 73, 0.1)', borderColor: 'rgba(248, 81, 73, 0.4)' }}>
              🔒 Deadline Passed
            </button>
          ) : isBlocked ? (
            <button className="timer-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed', color: '#8b949e', background: 'rgba(139, 148, 158, 0.1)', borderColor: 'rgba(139, 148, 158, 0.4)' }}>
              🚫 Blocked
            </button>
          ) : (
            <button 
              className={`timer-btn ${isRunning ? 'running' : 'stopped'}`}
              onClick={() => {
                const actionPromise = isRunning ? stopTimer() : startTimer(task.id);
                actionPromise.then(() => {
                  if (showActivities) setTimeout(loadActivities, 500); // Small delay to allow DB consistency
                });
              }}
            >
              {isRunning ? `⏹ Stop ${formatDuration(elapsed)}` : '▶ Start Timer'}
            </button>
          )
        )}
        
        {(isOwner || user?.role === 'admin') && (
          <button 
            className="activity-toggle-btn"
            onClick={toggleActivities}
            title="View comments and activity log"
          >
            💬 Activity
          </button>
        )}
      </div>

      <div className="col-assigned">
        <div className="avatar">{task.assignedTo?.name?.charAt(0) ?? '?'}</div>
        <span>{task.assignedTo?.name ?? 'Unassigned'}</span>
      </div>

      <div className="col-start">
        <span className="date-text">{formatDateTime(task.startDateTime)}</span>
      </div>

      <div className="col-deadline">
        <span className={`date-text ${overdue ? 'overdue-date' : ''} ${isDueSoon ? 'due-soon-date' : ''}`}>
          {formatDateTime(task.deadline)}
        </span>
      </div>

      <div className="col-end">
        <span className="date-text">{formatDateTime(task.endTime)}</span>
      </div>

      <div className="col-priority">
        <span className={`priority-badge ${priority.className}`}>
          {priority.icon} {priority.label}
        </span>
      </div>

      <div className="col-notes">
        {task.notes ? (
          isEffectivelyOverdue ? (
            <span 
              className="download-btn" 
              style={{ opacity: 0.5, cursor: 'not-allowed', color: '#8b949e', borderColor: '#8b949e' }} 
              title="Attachment locked (Deadline passed)"
            >
              <span className="download-icon">🔒</span>
              <span className="file-name">{task.notes.fileName}</span>
            </span>
          ) : (
            <a
              href={task.notes.downloadUrl}
              download={task.notes.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
              title={`Download ${task.notes.fileName}`}
            >
              <span className="download-icon">⬇</span>
              <span className="file-name">{task.notes.fileName}</span>
            </a>
          )
        ) : (
          <span className="no-attachment">No file</span>
        )}
      </div>

      {showActivities && (
        <div className="activity-panel">
          <div className="activity-feed">
            {loadingActivities ? (
              <div className="activity-loading">Loading activity...</div>
            ) : activities.length === 0 ? (
              <div className="activity-empty">No activity yet.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className={`activity-item ${act.type}`}>
                  <div className="activity-user-avatar">
                    {act.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="activity-content">
                    <div className="activity-meta">
                      <span className="activity-user-name">{act.user?.name}</span>
                      <span className="activity-time">{new Date(act.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="activity-text">{act.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <form className="comment-form" onSubmit={handleAddComment}>
            <input 
              type="text" 
              placeholder="Add a comment..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="comment-submit-btn" disabled={!newComment.trim()}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
