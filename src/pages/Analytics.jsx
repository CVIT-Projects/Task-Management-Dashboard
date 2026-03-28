import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend 
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Download, PieChart as PieIcon, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import './Analytics.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const formatISO = (date) => date ? date.toISOString().split('T')[0] : '';

export default function Analytics() {
  const { token, user } = useAuth();
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState('task');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Data
  const [summary, setSummary] = useState([]);
  const [detailed, setDetailed] = useState([]);
  const [billing, setBilling] = useState({ totalEarned: 0, billableHours: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch projects for filter
    axios.get(`${API_BASE}/api/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setProjects(res.data))
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = `from=${formatISO(startDate)}&to=${formatISO(endDate)}&groupBy=${groupBy}&projectId=${selectedProjectId}`;
        const [sumRes, detRes, billRes] = await Promise.all([
          axios.get(`${API_BASE}/api/reports/summary?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/reports/detailed?${query}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/reports/billing?${query}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setSummary(sumRes.data);
        setDetailed(detRes.data);
        setBilling(billRes.data);
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [startDate, endDate, groupBy, selectedProjectId, token]);

  const totalHours = useMemo(() => {
    const sec = summary.reduce((acc, curr) => acc + curr.totalSeconds, 0);
    return formatDuration(sec);
  }, [summary]);

  const billableHours = useMemo(() => {
    const sec = summary.reduce((acc, curr) => acc + (curr.billableSeconds || 0), 0);
    return formatDuration(sec);
  }, [summary]);

  const exportCSV = () => {
    const headers = ['Task', 'User', 'Project', 'Start Time', 'Duration (Seconds)'];
    const rows = detailed.map(e => [
      e.task?.taskName || 'N/A',
      e.user?.username || 'N/A',
      e.task?.project?.name || 'N/A',
      new Date(e.startTime).toLocaleString(),
      e.duration
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Task_Report_${formatISO(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    return summary.map(item => ({
      name: item.group,
      hours: Math.round((item.totalSeconds / 3600) * 10) / 10,
      billable: Math.round((item.billableSeconds / 3600) * 10) / 10
    }));
  }, [summary]);

  const pieData = useMemo(() => {
    const total = summary.reduce((acc, curr) => acc + curr.totalSeconds, 0);
    const billable = summary.reduce((acc, curr) => acc + (curr.billableSeconds || 0), 0);
    const nonBillable = total - billable;
    
    return [
      { name: 'Billable', value: billable },
      { name: 'Non-Billable', value: nonBillable }
    ];
  }, [summary]);

  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content" style={{ paddingTop: '20px' }}>
        <div className="analytics-container">
          
          <div className="analytics-header">
            <div className="analytics-title">
              <h2>Time Reports & Analytics</h2>
              <p>Analyze productivity and tracked hours across your team</p>
            </div>

            <div className="controls-group">
              <div className="filter-item">
                <label>Date Range</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <DatePicker 
                    selected={startDate} 
                    onChange={date => setStartDate(date)} 
                    className="date-picker-input"
                    placeholderText="From"
                  />
                  <DatePicker 
                    selected={endDate} 
                    onChange={date => setEndDate(date)} 
                    className="date-picker-input"
                    placeholderText="To"
                  />
                </div>
              </div>

              <div className="filter-item">
                <label>Group By</label>
                <select className="analytics-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                  <option value="task">Task</option>
                  <option value="project">Project</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div className="filter-item">
                <label>Project</label>
                <select className="analytics-select" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="summary-stats">
            <div className="stat-box">
              <div className="label">Total Tracked</div>
              <div className="value">{totalHours}</div>
            </div>
            <div className="stat-box">
              <div className="label">Billable Hrs</div>
              <div className="value" style={{ color: 'var(--success)' }}>{billableHours}</div>
            </div>
            <div className="stat-box" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="label">Total Earned</div>
              <div className="value" style={{ color: '#10b981' }}>
                ${(billing.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3><BarChart3 size={20} color="var(--accent)" /> Hours by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</h3>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="hours" name="Total Hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h3><PieIcon size={20} color="var(--accent)" /> Billable Distribution</h3>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <section className="report-table-section">
            <div className="table-header-row">
              <h3>Detailed Log</h3>
              <button className="export-btn" onClick={exportCSV}>
                <Download size={18} />
                Export CSV
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>User</th>
                    <th>Project</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /></td></tr>
                  ) : detailed.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No entries found for this range.</td></tr>
                  ) : detailed.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{entry.task?.taskName}</td>
                      <td>{entry.user?.username || entry.user?.name}</td>
                      <td>{entry.task?.project?.name || 'None'}</td>
                      <td>{new Date(entry.startTime).toLocaleString()}</td>
                      <td>{formatDuration(entry.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
