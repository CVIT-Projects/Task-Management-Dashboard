import { 
  Inbox, 
  Settings, 
  ArrowUp,
  FolderOpen
} from 'lucide-react';
import TaskCard from './TaskCard';
import './TaskTable.css';

function TaskTable({ tasks, user, highlightedTaskId, density, onTaskClick }) {
  if (tasks.length === 0) {
    if (user?.role === 'admin') {
      return (
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <FolderOpen size={48} strokeWidth={1} />
          </div>
          <h2>No Tasks Found</h2>
          <p>No tasks match your filters or none have been created yet.</p>
          <a href="/admin/" className="empty-cta-btn">
            <Settings size={14} /> Go to Admin Panel
          </a>
        </div>
      );
    }
    return (
      <div className="empty-state">
        <div className="empty-icon-wrapper">
          <Inbox size={48} strokeWidth={1} />
        </div>
        <h2>All Caught Up!</h2>
        <p>You have no tasks assigned to you right now. Great job!</p>
      </div>
    );
  }

  return (
    <div className={`task-table-container density-${density}`}>
      <div className="table-header">
        <div className="col-id">ID</div>
        <div className="col-name">Task Details</div>
        <div className="col-assigned">Assignee</div>
        <div className="col-deadline">
          Deadline <ArrowUp size={12} className="sort-icon-active" />
        </div>
        <div className="col-priority">Priority</div>
        <div className="col-status">Status</div>
        <div className="col-notes">Files</div>
      </div>
      <div className="table-body">
        {tasks.map((task, index) => (
          <div key={task.id} style={{ animationDelay: `${index * 0.05}s` }}>
            <TaskCard 
              task={task} 
              highlighted={String(task.id) === String(highlightedTaskId)} 
              density={density}
              onClick={() => onTaskClick(task)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskTable;

