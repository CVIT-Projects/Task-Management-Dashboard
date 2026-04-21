import './Navbar.css';

function NotificationDropdown({ notifications, onMarkAsRead, onClose }) {
  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned': return '📌';
      case 'timesheet_approved': return '✅';
      case 'timesheet_rejected': return '❌';
      case 'timesheet_submitted': return '📩';
      case 'deadline_approaching': return '⏰';
      default: return '📢';
    }
  };
  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <h3>Notifications</h3>
        <button className="close-dropdown" onClick={onClose}>✕</button>
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-notifications">No new notifications</div>
        ) : (
          notifications.map(notification => (
            <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`} onClick={() => !notification.read && onMarkAsRead(notification.id)}>
              <div className="notification-icon">{getIcon(notification.type)}</div>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">{new Date(notification.createdAt).toLocaleString()}</span>
              </div>
              {!notification.read && <div className="unread-dot"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationDropdown;
