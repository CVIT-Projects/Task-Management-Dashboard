import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import socket, { connectSocket, disconnectSocket, joinUserRoom, joinAdminRoom } from '../utils/socket';
import Navbar from '../components/Navbar';
import TaskTable from '../components/TaskTable';
import KanbanBoard from '../components/KanbanBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import TaskModal from '../components/TaskModal';
import Sidebar from '../components/Sidebar';
import { Tag, FolderOpen, LayoutList, Columns, SearchX, MoreHorizontal, Plus, RefreshCw, Download } from 'lucide-react';
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
const FALLBACK_POLL_INTERVAL = 60000; // 60 seconds backup

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
  const [density, setDensity] = useState(() => localStorage.getItem('dashboard_density') || 'comfortable');
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
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
    if (!token) return;

    fetchProjects();
    fetchTasks(true);

    // WebSocket Setup
    connectSocket(token);
    if (user?.id) joinUserRoom(user.id);
    if (user?.role === 'admin') joinAdminRoom();

    socket.on('task:created', () => {
      console.log('Socket: task:created received');
      fetchTasks(false);
    });
    socket.on('task:updated', () => {
      console.log('Socket: task:updated received');
      fetchTasks(false);
    });
    socket.on('task:deleted', () => {
      console.log('Socket: task:deleted received');
      fetchTasks(false);
    });
    socket.on('tasks:bulk_updated', () => {
      console.log('Socket: tasks:bulk_updated received');
      fetchTasks(false);
    });

    // Fallback polling (much slower)
    const interval = setInterval(() => {
      if (!socket.connected) {
        console.log('WS disconnected, using fallback poll...');
        fetchProjects();
        fetchTasks(false);
      }
    }, FALLBACK_POLL_INTERVAL);

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('tasks:bulk_updated');
      clearInterval(interval);
    };
  }, [fetchTasks, fetchProjects, token, user?.id, user?.role]);

  useEffect(() => {
    localStorage.setItem('dashboard_view', viewType);
  }, [viewType]);

  useEffect(() => {
    localStorage.setItem('dashboard_density', density);
  }, [density]);

  const handleNavigateToTask = useCallback((taskId) => {
    if (!taskId) return;
    
    // 1. Check if task exists in our loaded set
    const task = tasks.find(t => String(t.id || t._id) === String(taskId));
    
    if (!task) {
      showToast("⚠️ Task not found or deleted");
      return;
    }

    // 2. Scroll to the task element
    setTimeout(() => {
      let element = document.getElementById(`task-${taskId}`);
      
      if (!element) {
        // Task exists but is filtered out. Clear filters!
        setSearchTerm('');
        setPriorityFilter('All');
        setTagFilter('all');
        setProjectFilter('all');
        
        // Try scrolling again after filters are cleared and React re-renders
        setTimeout(() => {
          element = document.getElementById(`task-${taskId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedTaskId(taskId);
            setTimeout(() => setHighlightedTaskId(null), 3000);
          } else {
            showToast("⚠️ Task hidden by current view filters");
          }
        }, 200);
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 3. Apply highlight via state
        setHighlightedTaskId(taskId);
        setTimeout(() => setHighlightedTaskId(null), 3000);
      }
    }, 100);
  }, [tasks]);

  // Handle taskId from URL query param (e.g. after redirect from another page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (taskId && !loading && tasks.length > 0) {
      handleNavigateToTask(taskId);
      // Clean up the URL without refreshing the page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loading, tasks.length, handleNavigateToTask]);
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
      const matchesProject =
        projectFilter === 'all' || String(task.project?._id || task.project?.id || task.projectId) === String(projectFilter);
      return matchesSearch && matchesPriority && matchesTag && matchesProject;
    })
    .sort((a, b) => {
      const deadlineDiff = new Date(a.deadline) - new Date(b.deadline);
      if (deadlineDiff !== 0) return deadlineDiff;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

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
        density={density}
        onDensityChange={setDensity}
      />
      <div className="dashboard-layout-container">
        <Sidebar 
          projects={projects} 
          onProjectSelect={setProjectFilter} 
          currentProject={projectFilter} 
          user={user}
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
              <header className="page-header">
                <div className="page-header-left">
                  <h1 className="page-title">{user?.role === 'admin' ? 'All Tasks' : 'My Tasks'}</h1>
                  <span className="page-task-count">{processedTasks.length} tasks</span>
                </div>
                <div className="page-header-right">
                  <button
                    className="page-icon-btn"
                    title="Refresh"
                    onClick={() => fetchTasks(false)}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className="page-icon-btn"
                    title="More options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {user?.role === 'admin' ? (
                    <a href="/admin/" className="btn-new-task">
                      <Plus size={14} /> New Task
                    </a>
                  ) : (
                    <button className="btn-new-task" disabled title="Only admins can create tasks">
                      <Plus size={14} /> New Task
                    </button>
                  )}
                </div>
              </header>

              <div className="dashboard-actions-row">
                <div className="filter-group-v2">
                  <div className="filter-select-wrapper">
                    <Tag size={14} />
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                    >
                      <option value="all">All Tags</option>
                      {[...new Set(tasks.flatMap(t => t.tags || []))].sort().map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="view-mode-group">
                  <div className="toggle-pill-v2">
                    <button 
                      className={viewType === 'table' ? 'active' : ''} 
                      onClick={() => setViewType('table')}
                    >
                      <LayoutList size={14} /> List
                    </button>
                    <button 
                      className={viewType === 'kanban' ? 'active' : ''} 
                      onClick={() => setViewType('kanban')}
                    >
                      <Columns size={14} /> Kanban
                    </button>
                  </div>
                </div>
              </div>

            {processedTasks.length > 0 ? (
              viewType === 'table' ? (
                <TaskTable 
                  tasks={processedTasks} 
                  user={user} 
                  highlightedTaskId={highlightedTaskId} 
                  density={density} 
                  onTaskClick={setSelectedTask}
                />
              ) : (
                <KanbanBoard tasks={processedTasks} onRefresh={() => fetchTasks(false)} highlightedTaskId={highlightedTaskId} />
              )
            ) : (
              <div className="empty-search-state">
                <div className="empty-search-icon"><SearchX size={36} strokeWidth={1.25} /></div>
                <h3>No tasks match your filters</h3>
                <p>Try adjusting your search terms or filters to find what you're looking for.</p>
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setPriorityFilter('All');
                    setTagFilter('all');
                    setProjectFilter('all');
                  }}
                >
                  Clear all filters
                </button>
              </div>
            )}

            {selectedTask && (
              <TaskModal 
                task={selectedTask} 
                onClose={() => setSelectedTask(null)} 
              />
            )}
          </>
        )}
        </main>
      </div>
      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
}

export default Dashboard;
