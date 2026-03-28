import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import './Timesheet.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Date manipulation helpers
const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay(), diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const getSunday = (monday) => {
  const date = new Date(monday);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatISO = (date) => date.toISOString().split('T')[0];

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Timesheet() {
  const { token, user } = useAuth();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('me');

  const monday = useMemo(() => getMonday(currentDate), [currentDate]);
  const sunday = useMemo(() => getSunday(monday), [monday]);

  useEffect(() => {
    // If admin, fetch users for the dropdown
    if (user?.role === 'admin') {
      axios.get(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUsers(res.data))
        .catch(err => console.error(err));
    }
  }, [user, token]);

  useEffect(() => {
    const fetchTimesheet = async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/time-entries?from=${formatISO(monday)}&to=${formatISO(sunday)}&user=${selectedUser}`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEntries(res.data);
      } catch (error) {
        console.error('Failed to load timesheet', error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchTimesheet();
  }, [monday, sunday, selectedUser, token]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Aggregation Engine
  // 1. Group by Task ID
  // 2. Within each task, array of 7 days
  const aggregatedData = useMemo(() => {
    const taskMap = {};
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    let grandTotal = 0;

    entries.forEach(entry => {
      if (!entry.task) return; // Skip orphaned entries completely
      const taskId = entry.task._id || entry.task;
      const taskName = entry.task.taskName || 'Unknown Task';
      
      if (!taskMap[taskId]) {
        taskMap[taskId] = { taskName, days: [0, 0, 0, 0, 0, 0, 0], totalRow: 0 };
      }

      // Determine day of week (0 = Monday, 6 = Sunday)
      const entryDate = new Date(entry.startTime);
      let dayIndex = entryDate.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Sunday is 0 in JS Date, mapped safely to 6

      // Ignore entries formally processed mathematically outside boundaries
      if (entryDate >= monday && entryDate <= sunday) {
        const dur = entry.duration || 0;
        taskMap[taskId].days[dayIndex] += dur;
        taskMap[taskId].totalRow += dur;
        dayTotals[dayIndex] += dur;
        grandTotal += dur;
      }
    });

    return {
      rows: Object.values(taskMap),
      dayTotals,
      grandTotal
    };
  }, [entries, monday, sunday]);

  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content" style={{ paddingTop: '20px' }}>
        <div className="timesheet-container">
          
          <div className="timesheet-header">
            <div className="week-nav">
              <button onClick={handlePrevWeek}>&larr; Prev Week</button>
              <span>{formatDate(monday)} &ndash; {formatDate(sunday)}</span>
              <button onClick={handleNextWeek}>Next Week &rarr;</button>
            </div>
            
            {user?.role === 'admin' && (
              <div className="user-switcher">
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                  <option value="me">My Timesheet</option>
                  <optgroup label="Team Members">
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          <div className="timesheet-table-wrapper">
            <table className="timesheet-table">
              <thead>
                <tr>
                  <th className="task-col">Task Name</th>
                  {DAYS.map(d => <th key={d}>{d}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '80px' }}>
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : aggregatedData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                      No time logged this week. Head back to the Dashboard to blast some timers!
                    </td>
                  </tr>
                ) : (
                  <>
                    {aggregatedData.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="task-col">{row.taskName}</td>
                        {row.days.map((seconds, i) => (
                          <td key={i} className={seconds === 0 ? 'empty-cell' : ''}>
                            {formatDuration(seconds)}
                          </td>
                        ))}
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatDuration(row.totalRow)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="task-col">Weekly Total</td>
                      {aggregatedData.dayTotals.map((seconds, i) => (
                        <td key={i} className={seconds === 0 ? 'empty-cell' : ''}>
                          {formatDuration(seconds)}
                        </td>
                      ))}
                      <td>{formatDuration(aggregatedData.grandTotal)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
