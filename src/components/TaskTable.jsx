import TaskCard from './TaskCard';
import './TaskTable.css';

function TaskTable({ tasks, user }) {
  if (tasks.length === 0) {
    if (user?.role === 'admin') {
      return (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          <h2>No Tasks Found</h2>
          <p>No tasks match your filter criteria, or none have been created yet.</p>
          <a href="/admin/" className="empty-cta-btn">⚙️ Go to Admin Panel to create tasks</a>
        </div>
      );
    }
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h2>No Tasks Assigned</h2>
        <p>You have no tasks assigned to you yet. Contact your admin to get started.</p>
      </div>
    );
  }

  return (
    <div className="task-table-container">
      <div className="table-header">
        <div className="col-id">ID</div>
        <div className="col-name">Task Name</div>
        <div className="col-assigned">Assigned To</div>
        <div className="col-start">Start Date</div>
        <div className="col-deadline">
          Deadline <span className="sort-indicator">↑</span>
        </div>
        <div className="col-end">End Time</div>
        <div className="col-priority">Priority</div>
        <div className="col-notes">Attachment</div>
      </div>
      <div className="table-body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default TaskTable;
