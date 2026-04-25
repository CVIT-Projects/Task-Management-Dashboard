import { useState, useEffect } from 'react';
import './Navbar.css';

function getTimeRemaining(deadline) {
  const total = Date.parse(deadline) - Date.parse(new Date());
  if (total <= 0) return null;
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  return { total, hours, minutes };
}

function LiveTimer({ deadline }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(deadline);
      setTimeLeft(remaining);
      if (!remaining) clearInterval(interval);
    }, 60000); // Update every 1 minute
    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft) return <span className="timer-expired">Expired</span>;
  return (
    <span className="live-timer">
      ⏳ {timeLeft.hours}h {timeLeft.minutes}m left
    </span>
  );
}

function NotificationDropdown({ notifications, onMarkAsRead, onNotificationClick, onClose }) {
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

  const handleItemClick = (notification) => {
    if (notification.taskId) {
      const taskId = typeof notification.taskId === 'object' ? (notification.taskId.id || notification.taskId._id) : notification.taskId;
      if (taskId) onNotificationClick(taskId);
    }
    if (!notification.read) {
      onMarkAsRead(notification.id);
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
            <div 
              key={notification.id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`} 
              onClick={() => handleItemClick(notification)}
            >
              <div className="notification-icon">{getIcon(notification.type)}</div>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                {notification.type === 'deadline_approaching' && notification.taskId?.deadline && (
                  <div className="notification-timer">
                    <LiveTimer deadline={notification.taskId.deadline} />
                  </div>
                )}
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
