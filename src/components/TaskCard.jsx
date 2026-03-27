import './TaskCard.css';
import { useTimer } from '../contexts/TimerContext';

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

function TaskCard({ task }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const overdue = isOverdue(task.deadline);
  
  const { activeEntry, elapsed, startTimer, stopTimer } = useTimer();
  const isRunning = String(activeEntry?.task) === String(task.id);

  return (
    <div className={`task-row ${priority.className} ${overdue ? 'overdue' : ''}`}>
      <div className="col-id">
        <span className="task-id">#{task.id}</span>
      </div>

      <div className="col-name">
        <span className="task-name">{task.taskName}</span>
        
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

        <div className="task-badges">
          {overdue && <span className="overdue-badge">Overdue</span>}
          {task.status && (
            <span className={`status-chip ${STATUS_CONFIG[task.status]?.className}`}>
              {STATUS_CONFIG[task.status]?.icon} {task.status}
            </span>
          )}
        </div>
        <button 
          className={`timer-btn ${isRunning ? 'running' : 'stopped'}`}
          onClick={() => isRunning ? stopTimer() : startTimer(task.id)}
        >
          {isRunning ? `⏹ Stop ${formatDuration(elapsed)}` : '▶ Start Timer'}
        </button>
      </div>

      <div className="col-assigned">
        <div className="avatar">{task.assignedTo?.name?.charAt(0) ?? '?'}</div>
        <span>{task.assignedTo?.name ?? 'Unassigned'}</span>
      </div>

      <div className="col-start">
        <span className="date-text">{formatDateTime(task.startDateTime)}</span>
      </div>

      <div className="col-deadline">
        <span className={`date-text ${overdue ? 'overdue-date' : ''}`}>
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
        ) : (
          <span className="no-attachment">No file</span>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
