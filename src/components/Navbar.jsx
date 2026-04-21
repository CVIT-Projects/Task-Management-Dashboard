import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

function Navbar({ searchTerm, onSearchChange, priorityFilter, onPriorityChange, lastUpdated, taskCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Fetching...';

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">📋</div>
        <div className="brand-text">
          <h1>Task Dashboard</h1>
          <span className="brand-subtitle">{user?.role === 'admin' ? 'Admin View' : 'My Tasks'}</span>
        </div>
      </div>

      <div className="navbar-controls">
        {onSearchChange && user?.role !== 'admin' && (
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by task or person..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => onSearchChange('')}>✕</button>
            )}
          </div>
        )}

        {onPriorityChange && (
          <div className="filter-wrapper">
            <label htmlFor="priority-filter" className="filter-label">Priority</label>
            <select
              id="priority-filter"
              className="priority-select"
              value={priorityFilter}
              onChange={(e) => onPriorityChange(e.target.value)}
            >
              <option value="All">All</option>
              <option value="High">🔴 High</option>
              <option value="Medium">🟠 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>
        )}
      </div>

      <div className="navbar-meta">
        {taskCount !== undefined && (
          <div className="task-count">
            <span className="count-badge">{taskCount}</span>
            <span>tasks</span>
          </div>
        )}
        {taskCount !== undefined && (
          <div className="refresh-info">
            <span className="pulse-dot" style={{ display: lastUpdated ? 'inline-block' : 'none' }}></span>
            <span>{lastUpdated ? `Updated ${formattedTime}` : 'Not Polling'}</span>
          </div>
        )}

        <button className="admin-link-btn" onClick={() => navigate('/')}>📊 Dashboard</button>
        <button className="admin-link-btn" onClick={() => navigate('/timesheet')}>🕒 Timesheet</button>
        <button className="admin-link-btn" onClick={() => navigate('/analytics')}>📈 Reports</button>
        <button className="admin-link-btn" onClick={() => navigate('/help')}>❓ Help</button>

        {user?.role === 'admin' && (
          <a href="/admin/" className="admin-link-btn">⚙️ Admin Panel</a>
        )}
        <NotificationBell />
        <div className="user-section">
          <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <span className="user-name">{user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
