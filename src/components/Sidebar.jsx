import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Inbox,
  Clock as DueSoonIcon,
  Flame,
  CheckCircle2,
  Settings,
  HelpCircle,
  PlusCircle,
  Hash
} from 'lucide-react';
import './Sidebar.css';

const VIEWS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'due-soon', label: 'Due Soon', icon: DueSoonIcon },
  { id: 'high-priority', label: 'High Priority', icon: Flame },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function Sidebar({ projects, onProjectSelect, currentProject, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'inbox';
  const onDashboard = location.pathname === '/';

  const setView = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'inbox') next.delete('view'); else next.set('view', id);
    if (!onDashboard) {
      navigate(`/?${next.toString()}`);
    } else {
      setSearchParams(next, { replace: false });
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Views</div>
        {VIEWS.map(v => (
          <div
            key={v.id}
            className={`sidebar-item ${onDashboard && currentView === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >
            <v.icon size={16} />
            <span>{v.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label-row">
          <div className="sidebar-label">Projects</div>
          <PlusCircle size={14} className="add-icon" />
        </div>
        <div
          className={`sidebar-item ${currentProject === 'all' ? 'active' : ''}`}
          onClick={() => onProjectSelect('all')}
        >
          <Hash size={16} />
          <span>All Projects</span>
        </div>
        {projects.map(p => (
          <div
            key={p.id}
            className={`sidebar-item ${currentProject === p.id ? 'active' : ''}`}
            onClick={() => onProjectSelect(p.id)}
          >
            <div className="project-dot" style={{ backgroundColor: p.color || 'var(--accent)' }} />
            <span>{p.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-item" onClick={() => navigate('/help')}>
          <HelpCircle size={16} />
          <span>Help & Feedback</span>
        </div>
        {user?.role === 'admin' && (
          <a href="/admin/" className="sidebar-item">
            <Settings size={16} />
            <span>Admin Settings</span>
          </a>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
