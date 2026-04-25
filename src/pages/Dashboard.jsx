import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskTable from '../components/TaskTable';
import KanbanBoard from '../components/KanbanBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const ONBOARDING_KEY = 'onboarding_dismissed';

function AdminOnboarding({ projects, tasks }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === 'true'
  );

  if (dismissed || (projects.length > 0 && tasks.length > 0)) return null;

  const steps = [
    {
      done: projects.length > 0,
      icon: '📁',
      label: 'Create a Project',
      desc: 'Group tasks under a project with a colour.',
      link: '/admin/projects.html',
      cta: 'Create Project',
    },
    {
      done: false,
      icon: '👥',
      label: 'Register Team Members',
      desc: 'Ask teammates to sign up at /register.',
      link: '/register',
      cta: 'Register Page',
    },
    {
      done: tasks.length > 0,
      icon: '✅',
      label: 'Create Your First Task',
      desc: 'Assign a task to a team member with a deadline.',
      link: '/admin/',
      cta: 'Create Task',
    },
  ];

  return (
    <div className="onboarding-banner">
      <div className="onboarding-header">
        <div>
          <h3>👋 Welcome! Let's get set up.</h3>
          <p>Follow these steps to start managing your team's tasks.</p>
        </div>
        <button className="onboarding-dismiss" onClick={() => {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setDismissed(true);
        }}>✕ Dismiss</button>
      </div>
      <div className="onboarding-steps">
        {steps.map((step, i) => (
          <div key={i} className={`onboarding-step ${step.done ? 'done' : ''}`}>
            <div className="onboarding-step-icon">{step.done ? '✅' : step.icon}</div>
            <div className="onboarding-step-body">
              <div className="onboarding-step-label">{step.label}</div>
              <div className="onboarding-step-desc">{step.desc}</div>
            </div>
            {!step.done && (
              <a href={step.link} className="onboarding-step-btn">{step.cta} →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || '';
const TASKS_API = `${API_BASE}/api/tasks`;
const POLL_INTERVAL = 10000; // 10 seconds

const PRIORITY_ORDER = { High: 1, Medium: 2, Low: 3 };

function UserWelcomeTip() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('user_welcome_dismissed') === 'true'
  );
  if (dismissed) return null;
  return (
    <div className="onboarding-banner">
      <div className="onboarding-header">
        <div>
          <h3>👋 Welcome to Task Dashboard!</h3>
          <p>Here's how to get started with your tasks.</p>
        </div>
        <button className="onboarding-dismiss" onClick={() => {
          localStorage.setItem('user_welcome_dismissed', 'true');
          setDismissed(true);
        }}>✕ Dismiss</button>
      </div>
      <div className="onboarding-steps">
        {[
          { icon: '📋', label: 'Your Tasks', desc: 'Tasks assigned to you appear here. Use Priority and Tag filters to find what you need.' },
          { icon: '▶️', label: 'Track Time', desc: 'Click "Start Timer" on any task to log time. Only one timer runs at a time.' },
          { icon: '🔄', label: 'Update Status', desc: 'Click the status chip on a task to change it from Not Started → In Progress → Completed.' },
          { icon: '📤', label: 'Submit Timesheet', desc: 'At the end of each week, go to Timesheet and click "Submit for Approval" for your manager to review.' },
        ].map((tip, i) => (
          <div key={i} className="onboarding-step">
            <div className="onboarding-step-icon">{tip.icon}</div>
            <div className="onboarding-step-body">
              <div className="onboarding-step-label">{tip.label}</div>
              <div className="onboarding-step-desc">{tip.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [viewType, setViewType] = useState(() => localStorage.getItem('dashboard_view') || 'table');
  const [toast, setToast] = useState(null);
  const { token, user, logout } = useAuth();

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProjects = useCallback(async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Fetch projects error:', err);
    }
  }, [token]);

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let url = TASKS_API;
      if (projectFilter !== 'all') {
        url += `?project=${projectFilter}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logout();
        return;
      }
      setError('Unable to load tasks. Please check your connection or contact your administrator.');
      console.error('Fetch error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [token, projectFilter, logout]);

  useEffect(() => {
    fetchProjects();
    fetchTasks(true);
    const interval = setInterval(() => {
      fetchProjects();
      fetchTasks(false);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    localStorage.setItem('dashboard_view', viewType);
  }, [viewType]);

  const processedTasks = tasks
    .filter((task) => {
      const term = searchTerm.toLowerCase();
      const assignedName = task.assignedTo?.name ?? '';
      const matchesSearch =
        task.taskName.toLowerCase().includes(term) ||
        assignedName.toLowerCase().includes(term);
      const matchesPriority =
        priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesTag =
        tagFilter === 'all' || (task.tags && task.tags.includes(tagFilter));
      return matchesSearch && matchesPriority && matchesTag;
    })
    .sort((a, b) => {
      const deadlineDiff = new Date(a.deadline) - new Date(b.deadline);
      if (deadlineDiff !== 0) return deadlineDiff;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

  const handleNavigateToTask = useCallback((taskId) => {
    const task = tasks.find(t => String(t.id || t._id) === String(taskId));
    
    if (!task) {
      showToast('⚠️ Task not found or deleted');
      return;
    }

    // Clear filters if the task is hidden
    const isVisible = processedTasks.some(t => String(t.id || t._id) === String(taskId));
    if (!isVisible) {
      setSearchTerm('');
      setPriorityFilter('All');
      setTagFilter('all');
      setProjectFilter('all');
    }

    // Wait for state updates/DOM re-render
    setTimeout(() => {
      const element = document.getElementById(`task-${taskId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-glow');
        setTimeout(() => element.classList.remove('highlight-glow'), 2500);
      } else {
        showToast('⚠️ Task component not found on page');
      }
    }, 100);
  }, [tasks, processedTasks]);

  return (
    <div className="app-wrapper">
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        lastUpdated={lastUpdated}
        taskCount={processedTasks.length}
        onNavigateToTask={handleNavigateToTask}
      />
      <main className="main-content">
        {!loading && !error && user?.role === 'admin' && (
          <AdminOnboarding projects={projects} tasks={tasks} />
        )}
        {!loading && !error && user?.role !== 'admin' && tasks.length === 0 && (
          <UserWelcomeTip />
        )}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="project-filter-container" style={{ padding: '0 20px 10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="all">All Tags</option>
                {[...new Set(tasks.flatMap(t => t.tags || []))].sort().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="view-toggle" style={{ display: 'flex', background: 'var(--bg-card)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button 
                  onClick={() => setViewType('table')}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '0.8rem', 
                    borderRadius: '6px', 
                    background: viewType === 'table' ? 'var(--accent)' : 'transparent',
                    color: viewType === 'table' ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  📋 List
                </button>
                <button 
                  onClick={() => setViewType('kanban')}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '0.8rem', 
                    borderRadius: '6px', 
                    background: viewType === 'kanban' ? 'var(--accent)' : 'transparent',
                    color: viewType === 'kanban' ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🧱 Kanban
                </button>
              </div>
            </div>
            {viewType === 'table' ? (
              <TaskTable tasks={processedTasks} user={user} />
            ) : (
              <KanbanBoard tasks={processedTasks} onRefresh={() => fetchTasks(false)} />
            )}
          </>
        )}
      </main>
      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
}

export default Dashboard;
