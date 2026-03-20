import './TaskCard.css';

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

function TaskCard({ task }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;
  const overdue = isOverdue(task.deadline);

  return (
    <div className={`task-row ${priority.className} ${overdue ? 'overdue' : ''}`}>
      <div className="col-id">
        <span className="task-id">#{task.id}</span>
      </div>

      <div className="col-name">
        <span className="task-name">{task.taskName}</span>
        {overdue && <span className="overdue-badge">Overdue</span>}
        {task.status && (
          <span className={`status-chip ${STATUS_CONFIG[task.status]?.className}`}>
            {STATUS_CONFIG[task.status]?.icon} {task.status}
          </span>
        )}
      </div>

      <div className="col-assigned">
        <div className="avatar">{task.assignedTo.charAt(0)}</div>
        <span>{task.assignedTo}</span>
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
