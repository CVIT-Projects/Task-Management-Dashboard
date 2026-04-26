import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, 
  Square, 
  Clock, 
  Download, 
  MessageSquare, 
  AlertCircle,
  CheckCircle2,
  Circle,
  Lock,
  Calendar,
  User,
  MoreVertical,
  History,
  Send,
  Ban,
  Paperclip
} from 'lucide-react';
import './TaskCard.css';
import { useTimer } from '../contexts/TimerContext';
import { useAuth } from '../contexts/AuthContext';
import Badge from './Badge';

const PRIORITY_CONFIG = {
  High: { label: 'High', color: 'high', icon: AlertCircle },
  Medium: { label: 'Medium', color: 'medium', icon: Circle },
  Low: { label: 'Low', color: 'low', icon: CheckCircle2 },
};

const STATUS_CONFIG = {
  'Not Started': { color: 'muted', icon: Circle },
  'In Progress': { color: 'primary', icon: History },
  'Completed':   { color: 'low', icon: CheckCircle2 },
  'Blocked':     { color: 'high', icon: Ban },
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

function getDeadlineDisplay(deadlineStr, status) {
  if (!deadlineStr) return { color: 'muted', label: '—' };
  const due = new Date(deadlineStr);
  const now = new Date();
  const diffMs = due - now;
  const diffDays = diffMs / 86400000;
  const formatted = due.toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (status === 'Completed') return { color: 'muted', label: formatted };
  if (diffMs < 0) return { color: 'high', label: formatted };
  if (diffDays < 1) return { color: 'medium', label: 'Due Soon' };
  if (diffDays < 7) return { color: 'muted', label: formatted };
  return { color: 'muted', label: 'Upcoming' };
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

function TaskCard({ task, highlighted, density, onClick }) {
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
  
  const activeTaskId = typeof activeEntry?.task === 'object' ? activeEntry.task?.id : activeEntry?.task;
  const isRunning = activeTaskId === String(task.id);
  
  const assignedUserId = typeof task.assignedTo === 'object' && task.assignedTo !== null 
    ? task.assignedTo.id || task.assignedTo._id 
    : task.assignedTo;
  const isOwner = assignedUserId && user && String(assignedUserId) === String(user.id);
  
  useEffect(() => {
    if (isRunning && localStatus === 'Not Started') {
      setLocalStatus('In Progress');
    }
  }, [isRunning, localStatus]);

  const isEffectivelyOverdue = overdue && localStatus !== 'Completed';
  const isDueSoon = timeRemaining && timeRemaining.total < 86400000; // 24 hours

  useEffect(() => {
    if (isEffectivelyOverdue && isRunning) {
      stopTimer();
    }
  }, [isEffectivelyOverdue, isRunning, stopTimer]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const oldStatus = localStatus;
    setLocalStatus(newStatus);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      await axios.patch(
        `${API_BASE}/api/tasks/${task.id}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (newStatus === 'Completed' && isRunning) {
         stopTimer();
      }

      if (showActivities) {
        loadActivities();
      }
    } catch (err) {
      console.error(err);
      setLocalStatus(oldStatus);
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
    <div 
      id={`task-${task.id}`}
      className={`task-row density-${density} priority-border-${task.priority.toLowerCase()} ${overdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''} ${highlighted ? 'highlight-glow' : ''}`}
    >
      <div className="col-id">
        <span className="task-id">#{String(task.id).slice(-4)}</span>
      </div>

      <div className="col-name">
        <div className="task-header-row">
          {task.project && (
            <Badge color="muted" tone="soft" size="sm">
              {task.project.name}
            </Badge>
          )}
          <span 
            className="task-name-text clickable-detail"
            onClick={onClick}
          >
            {task.taskName}
          </span>
          {density === 'comfortable' && task.recurring && task.recurring.enabled && (
            <Badge color="primary" tone="soft" size="sm" icon={History} title={`Frequency: ${task.recurring.frequency}`} />
          )}
        </div>
        
        {density === 'comfortable' && (
          <div className="task-meta-badges">
            {task.isBillable && (
              <Badge color="low" tone="soft" size="sm">
                <span style={{ fontWeight: 'bold', marginRight: '2px' }}>$</span> Billable
              </Badge>
            )}
            {task.tags?.map(tag => (
              <Badge key={tag} color="primary" tone="outline" size="sm">{tag}</Badge>
            ))}
            {isBlocked && (
              <Badge color="high" tone="soft" size="sm" icon={Ban}>
                Blocked by: {incompleteBlockers.length}
              </Badge>
            )}
            {overdue && localStatus !== 'Completed' && <Badge color="high" tone="solid" size="sm">Overdue</Badge>}
            {isDueSoon && localStatus !== 'Completed' && (
              <Badge color="warning" tone="soft" size="sm" className="pulse">
                {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}{timeRemaining.hours}h {timeRemaining.minutes}m
              </Badge>
            )}
          </div>
        )}

        {density === 'comfortable' && task.estimatedHours && (
          <div className="estimate-container">
            <div className="estimate-bar">
              <div 
                className="estimate-progress" 
                style={{ 
                  width: `${Math.min(100, ((task.trackedSeconds || 0) / 3600 / task.estimatedHours) * 100)}%`,
                  background: ((task.trackedSeconds || 0) / 3600) > task.estimatedHours ? 'var(--high-color)' : 'var(--low-color)'
                }}
              />
            </div>
            <span className="estimate-text">
              {((task.trackedSeconds || 0) / 3600).toFixed(1)}h / {task.estimatedHours}h
            </span>
          </div>
        )}

        <div className="task-row-actions">
          {isOwner && (
            localStatus === 'Completed' ? (
              <Badge color="low" tone="soft" size="sm" icon={CheckCircle2}>Completed</Badge>
            ) : isEffectivelyOverdue ? (
              <Badge color="high" tone="soft" size="sm" icon={Lock}>Deadline Passed</Badge>
            ) : isBlocked ? (
              <Badge color="muted" tone="soft" size="sm" icon={Ban}>Blocked</Badge>
            ) : (
              <button 
                className={`timer-action-btn ${isRunning ? 'running' : 'stopped'}`}
                onClick={() => {
                  const actionPromise = isRunning ? stopTimer() : startTimer(task.id);
                  actionPromise.then(() => {
                    if (showActivities) setTimeout(loadActivities, 500);
                  });
                }}
              >
                {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                {isRunning ? `Stop ${formatDuration(elapsed)}` : 'Start Timer'}
              </button>
            )
          )}
          
          {(isOwner || user?.role === 'admin') && (
            <button 
              className={`activity-toggle-btn ${showActivities ? 'active' : ''}`}
              onClick={toggleActivities}
            >
              <MessageSquare size={12} />
              {activities.length > 0 ? activities.length : 'Activity'}
            </button>
          )}
        </div>
      </div>

      <div className="col-assigned">
        <div className="assigned-pill">
          <div className="user-avatar-circle" title={task.assignedTo?.name}>
            {task.assignedTo?.name?.charAt(0) ?? '?'}
          </div>
          <span className="user-name-label">{task.assignedTo?.name?.split(' ')[0] ?? 'Unassigned'}</span>
        </div>
      </div>

      <div className="col-deadline">
        {(() => {
          const dl = getDeadlineDisplay(task.deadline, localStatus);
          return <Badge color={dl.color} tone="soft" size="sm">{dl.label}</Badge>;
        })()}
      </div>

      <div className="col-priority">
        <div className={`priority-marker color-${priority.color}`}>
          <span className="priority-bar" aria-hidden="true" />
          <span className="priority-label">{priority.label}</span>
        </div>
      </div>

      <div className="col-status">
        <div className="status-select-wrapper">
          <select
            className={`status-v2-select color-${STATUS_CONFIG[localStatus]?.color}`}
            value={localStatus}
            onChange={handleStatusChange}
            disabled={isEffectivelyOverdue}
          >
            {Object.keys(STATUS_CONFIG).map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="status-v2-indicator">
            {(() => {
              const StatusIcon = STATUS_CONFIG[localStatus]?.icon || Circle;
              return <StatusIcon size={10} />;
            })()}
          </div>
        </div>
      </div>

      <div className="col-notes">
        {task.notes ? (
          <a
            href={task.notes.downloadUrl}
            download={task.notes.fileName}
            className={`file-v2-mini-btn ${isEffectivelyOverdue ? 'locked' : ''}`}
            title={task.notes.fileName}
            onClick={(e) => isEffectivelyOverdue && e.preventDefault()}
          >
            <Paperclip size={14} />
          </a>
        ) : (
          <span className="file-empty-dash">-</span>
        )}
      </div>

      {showActivities && (
        <div className="expanded-activity-row">
          <div className="activity-list-container">
            {loadingActivities ? (
              <div className="activity-placeholder">Loading...</div>
            ) : activities.length === 0 ? (
              <div className="activity-placeholder">No activity yet.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className={`activity-row-item ${act.type}`}>
                  <div className="act-user-avatar">
                    {act.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="act-content-block">
                    <div className="act-header">
                      <span className="act-user">{act.user?.name}</span>
                      <span className="act-time">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="act-text-body">{act.text}</div>
                  </div>
                </div>
              ))
            )}
            <form className="mini-comment-form" onSubmit={handleAddComment}>
              <input 
                type="text" 
                placeholder="Write a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" disabled={!newComment.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
