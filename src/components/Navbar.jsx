import { useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  ClipboardCheck,
  Search,
  Clock,
  BarChart3,
  HelpCircle,
  Settings,
  Sun,
  Moon,
  LogOut,
  X,
  ChevronDown,
  ListChecks
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

function Navbar({ searchTerm, onSearchChange, onNavigateToTask }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { to: '/', label: 'My Tasks', icon: ListChecks, end: true },
    { to: '/timesheet', label: 'Timesheet', icon: Clock },
    { to: '/analytics', label: 'Insights', icon: BarChart3 },
    { to: '/help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <ClipboardCheck size={20} color="var(--accent)" strokeWidth={2} />
        </div>
        <div className="brand-text">
          <h1>Taskflow</h1>
          <span className="brand-subtitle">{user?.role === 'admin' ? 'Admin' : 'Workspace'}</span>
        </div>
      </div>

      <nav className="navbar-tabs" aria-label="Primary navigation">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {onSearchChange && user?.role !== 'admin' ? (
        <div className="search-wrapper-v2 navbar-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input-v2"
            placeholder="Search tasks, projects, people..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm ? (
            <button className="clear-btn" onClick={() => onSearchChange('')}>
              <X size={12} />
            </button>
          ) : (
            <kbd className="search-hint">⌘K</kbd>
          )}
        </div>
      ) : (
        <div className="navbar-search-spacer" />
      )}

      <div className="navbar-meta">
        <button
          className="bell-btn"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationBell onNavigateToTask={onNavigateToTask} />
        {user?.role === 'admin' && (
          <a href="/admin/" className="bell-btn" title="Admin Settings">
            <Settings size={18} />
          </a>
        )}

        <div className="user-section" ref={menuRef}>
          <button
            className="user-trigger"
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <span className="user-name">{user?.name}</span>
            <ChevronDown size={14} className={`user-chevron ${menuOpen ? 'open' : ''}`} />
          </button>
          {menuOpen && (
            <div className="user-menu" role="menu">
              <div className="user-menu-header">
                <div className="user-menu-name">{user?.name}</div>
                <div className="user-menu-role">{user?.role === 'admin' ? 'Administrator' : 'Member'}</div>
              </div>
              <button className="user-menu-item" onClick={handleLogout}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
