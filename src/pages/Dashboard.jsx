import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import TaskTable from '../components/TaskTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'; 
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
  const { token, logout } = useAuth(); 

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const response = await axios.get(TASKS_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Unable to reach the task server. Please ensure the API server is running on port 3001.');
      console.error('Fetch error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks(true);
    const interval = setInterval(() => fetchTasks(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const processedTasks = tasks
    .filter((task) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        task.taskName.toLowerCase().includes(term) ||
        task.assignedTo.toLowerCase().includes(term);
      const matchesPriority =
        priorityFilter === 'All' || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
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
          <TaskTable tasks={processedTasks} />
        )}
      </main>
      
      {/* Temporary Logout Button to verify acceptance criteria */}
      <button 
        onClick={logout} 
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontWeight: 600, zIndex: 1000 }}
      >
        Sign Out
      </button>
    </div>
  );
}

export default Dashboard;
