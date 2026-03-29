import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskTable from '../components/TaskTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TASKS_API = `${API_BASE}/api/tasks`;
const POLL_INTERVAL = 10000; // 10 seconds

const PRIORITY_ORDER = { High: 1, Medium: 2, Low: 3 };

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
  const { token, user, logout } = useAuth();

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

  return (
    <div className="app-wrapper">
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        lastUpdated={lastUpdated}
        taskCount={processedTasks.length}
      />
      <main className="main-content">
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
            </div>
            <TaskTable tasks={processedTasks} user={user} />
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
