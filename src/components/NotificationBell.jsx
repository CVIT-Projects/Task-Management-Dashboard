import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import socket from '../utils/socket';
import './Navbar.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FALLBACK_POLL_INTERVAL = 120000; // 2 min — only used if socket disconnects

function NotificationBell({ onNavigateToTask }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchNotifications();

    const handleNew = (notification) => {
      setNotifications(prev => {
        const id = notification.id || notification._id;
        if (prev.some(n => (n.id || n._id) === id)) return prev;
        return [notification, ...prev].slice(0, 50);
      });
      if (!notification.read) setUnreadCount(c => c + 1);
    };
    socket.on('notification:new', handleNew);

    // Fallback poll only when the socket is disconnected — recovers anything missed.
    const interval = setInterval(() => {
      if (!socket.connected) fetchNotifications();
    }, FALLBACK_POLL_INTERVAL);

    return () => {
      socket.off('notification:new', handleNew);
      clearInterval(interval);
    };
  }, [fetchNotifications, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  const handleMarkAsRead = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await axios.patch(`${API_BASE}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Mark as read error:', err);
      // Rollback on error
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await axios.patch(`${API_BASE}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Mark all as read error:', err);
      // Rollback on error
      fetchNotifications();
    }
  };

  const handleNotificationClick = (taskId) => {
    setShowDropdown(false);
    if (onNavigateToTask) {
      onNavigateToTask(taskId);
    } else {
      // If we are on another page (Timesheet, etc.), redirect to Dashboard with taskId
      navigate(`/?taskId=${taskId}`);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="bell-btn" onClick={toggleDropdown} title="Notifications">
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>
      
      {showDropdown && (
        <NotificationDropdown 
          notifications={notifications} 
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationClick}
          onClose={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

export default NotificationBell;
