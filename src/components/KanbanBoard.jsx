import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './KanbanBoard.css';

const STATUS_COLUMNS = ['Not Started', 'In Progress', 'Completed', 'Blocked'];

const STATUS_CONFIG = {
  'Not Started': { icon: '⚪', className: 'not-started' },
  'In Progress': { icon: '🔵', className: 'in-progress' },
  'Completed':   { icon: '🟢', className: 'completed' },
  'Blocked':     { icon: '🔴', className: 'blocked' },
};

const PRIORITY_CONFIG = {
  High: { className: 'priority-high', icon: '🔴' },
  Medium: { className: 'priority-medium', icon: '🟠' },
  Low: { className: 'priority-low', icon: '🟢' },
};

function KanbanCard({ task, onStatusChange }) {
  const { token } = useAuth();
  const [localStatus, setLocalStatus] = useState(task.status);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Low;

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
      onStatusChange(); // Full refresh to move cards between columns
    } catch (err) {
      console.error(err);
      setLocalStatus(oldStatus);
      alert('Failed to update status');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: '2-digit' });
  };

  return (
    <div className={`kanban-card ${priority.className}`}>
      <div className="kanban-card-header">
        {task.project && (
          <span className="kanban-project-badge" style={{ background: task.project.color }}>
            {task.project.name}
          </span>
        )}
        <span className={`kanban-priority-badge ${priority.className}`}>
          {priority.icon} {task.priority}
        </span>
      </div>
      
      <h4 className="kanban-task-name">{task.taskName}</h4>
      
      <div className="kanban-card-footer">
        <div className="kanban-assignee">
          <div className="kanban-avatar" title={task.assignedTo?.name}>
            {task.assignedTo?.name?.charAt(0) || '?'}
          </div>
          <span className="kanban-assignee-name">{task.assignedTo?.name || 'Unassigned'}</span>
        </div>
        <div className="kanban-deadline" title="Deadline">
          📅 {formatDate(task.deadline)}
        </div>
      </div>

      <div className="kanban-card-actions">
        <select 
          className={`kanban-status-select ${STATUS_CONFIG[localStatus]?.className}`}
          value={localStatus}
          onChange={handleStatusChange}
        >
          {STATUS_COLUMNS.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].icon} {s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, onRefresh }) {
  const tasksByStatus = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {});

  return (
    <div className="kanban-container">
      <div className="kanban-board">
        {STATUS_COLUMNS.map(status => (
          <div key={status} className="kanban-column">
            <div className="kanban-column-header">
              <span className="column-icon">{STATUS_CONFIG[status].icon}</span>
              <h3>{status}</h3>
              <span className="task-count-badge">{tasksByStatus[status].length}</span>
            </div>
            <div className="kanban-column-content">
              {tasksByStatus[status].length === 0 ? (
                <div className="kanban-empty-column">No tasks</div>
              ) : (
                tasksByStatus[status].map(task => (
                  <KanbanCard key={task.id} task={task} onStatusChange={onRefresh} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;
