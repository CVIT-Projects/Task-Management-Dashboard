import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend 
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  Download, 
  PieChart as PieIcon, 
  BarChart3, 
  Clock, 
  TrendingUp,
  DollarSign,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
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
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState('task');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const [summary, setSummary] = useState([]);
  const [detailed, setDetailed] = useState([]);
  const [billing, setBilling] = useState({ totalEarned: 0, billableHours: 0 });
  const [projects, setProjects] = useState([]);
  const [productivity, setProductivity] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (user?.role === 'admin') {
          const prodRes = await axios.get(`${API_BASE}/api/reports/productivity?${query}`, { headers: { Authorization: `Bearer ${token}` } });
          setProductivity(prodRes.data);
        }
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [startDate, endDate, groupBy, selectedProjectId, token, user]);

  useEffect(() => {
    const fetchBudget = async () => {
      if (!selectedProjectId || user?.role !== 'admin') {
        setBudgetData(null);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/api/projects/${selectedProjectId}/budget`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBudgetData(res.data);
      } catch (err) {
        console.error('Failed to fetch budget', err);
        setBudgetData(null);
      }
    };
    fetchBudget();
  }, [selectedProjectId, token, user]);

  const totalHours = useMemo(() => {
    const sec = summary.reduce((acc, curr) => acc + curr.totalSeconds, 0);
    return formatDuration(sec);
  }, [summary]);

  const billableHoursLabel = useMemo(() => {
    const sec = summary.reduce((acc, curr) => acc + (curr.billableSeconds || 0), 0);
    return formatDuration(sec);
  }, [summary]);

  const exportCSV = () => {
    const headers = ['Task', 'User', 'Project', 'Start Time', 'Duration (Seconds)'];
    const rows = detailed.map(e => [
      e.task?.taskName || 'N/A',
      e.user?.name || 'N/A',
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

  const exportProductivityCSV = () => {
    const headers = ['User', 'Email', 'Total Hours', 'Billable Hours', 'Billable %', 'Tasks Completed', 'Tasks Overdue', 'On-Time Rate %'];
    const rows = productivity.map(u => [
      u.name,
      u.email,
      u.totalHours.toFixed(2),
      u.billableHours.toFixed(2),
      u.billablePercent.toFixed(1),
      u.tasksCompleted,
      u.tasksOverdue,
      u.onTimeRate.toFixed(1)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Productivity_Report_${formatISO(new Date())}.csv`);
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
      <main className="main-content">
        <div className="analytics-container">
          
          <div className="analytics-header">
            <div className="analytics-title">
              <h2>Team Analytics</h2>
              <p>Track performance, billing, and budget consumption.</p>
            </div>

            <div className="analytics-controls">
              {user?.role === 'admin' && (
                <div className="tab-switcher-v2">
                  <button 
                    className={`tab-item ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <BarChart3 size={16} /> Analytics
                  </button>
                  <button 
                    className={`tab-item ${activeTab === 'productivity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('productivity')}
                  >
                    <TrendingUp size={16} /> Productivity
                  </button>
                </div>
              )}

              <div className="filter-toolbar">
                <div className="filter-pill">
                  <Calendar size={14} />
                  <DatePicker selected={startDate} onChange={date => setStartDate(date)} className="clean-dp" />
                  <span>to</span>
                  <DatePicker selected={endDate} onChange={date => setEndDate(date)} className="clean-dp" />
                </div>

                <div className="filter-pill">
                  <Filter size={14} />
                  <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                    <option value="task">By Task</option>
                    <option value="project">By Project</option>
                    <option value="user">By User</option>
                  </select>
                </div>

                <div className="filter-pill">
                  <FolderOpen size={14} />
                  <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'analytics' ? (
            <>
              <div className="summary-grid">
                <div className="summary-card" style={{ animationDelay: '0.1s' }}>
                  <div className="card-icon"><Clock size={24} /></div>
                  <div className="card-info">
                    <div className="label">Total Tracked</div>
                    <div className="value">{totalHours}</div>
                  </div>
                </div>
                <div className="summary-card billable" style={{ animationDelay: '0.2s' }}>
                  <div className="card-icon"><Badge color="low" tone="soft" icon={CheckCircle2} /></div>
                  <div className="card-info">
                    <div className="label">Billable Hours</div>
                    <div className="value">{billableHoursLabel}</div>
                  </div>
                </div>
                <div className="summary-card earnings" style={{ animationDelay: '0.3s' }}>
                  <div className="card-icon"><DollarSign size={24} /></div>
                  <div className="card-info">
                    <div className="label">Total Revenue</div>
                    <div className="value">
                      ${(billing.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {budgetData && (
                <div className="budget-container">
                  <div className="budget-header">
                    <h3>Budget Consumption: {budgetData.project.name}</h3>
                    <Badge color={budgetData.hoursPercent >= 100 ? 'high' : budgetData.hoursPercent >= 80 ? 'warning' : 'low'} tone="soft">
                      {budgetData.hoursPercent.toFixed(0)}% Utilized
                    </Badge>
                  </div>
                  
                  <div className="budget-bars">
                    {budgetData.project.budgetHours > 0 && (
                      <div className="budget-item">
                        <div className="item-meta">
                          <span>Hours consumed</span>
                          <span>{budgetData.actualHours.toFixed(1)} / {budgetData.project.budgetHours}h</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ 
                            width: `${Math.min(100, budgetData.hoursPercent)}%`,
                            backgroundColor: budgetData.hoursPercent >= 100 ? 'var(--high-color)' : budgetData.hoursPercent >= 80 ? 'var(--warning-color)' : 'var(--accent)'
                          }} />
                        </div>
                      </div>
                    )}

                    {budgetData.project.budgetAmount > 0 && (
                      <div className="budget-item">
                        <div className="item-meta">
                          <span>Financial budget</span>
                          <span>${budgetData.actualAmount.toLocaleString()} / ${budgetData.project.budgetAmount.toLocaleString()}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ 
                            width: `${Math.min(100, budgetData.amountPercent)}%`,
                            backgroundColor: budgetData.amountPercent >= 100 ? 'var(--high-color)' : budgetData.amountPercent >= 80 ? 'var(--warning-color)' : 'var(--accent)'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="charts-container">
                <div className="chart-wrapper">
                  <div className="chart-header">
                    <h4>Hours Distribution</h4>
                    <BarChart3 size={16} />
                  </div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                          cursor={{ fill: 'var(--bg-hover)' }}
                        />
                        <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-wrapper">
                  <div className="chart-header">
                    <h4>Billable vs Non-Billable</h4>
                    <PieIcon size={16} />
                  </div>
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="detailed-log-card">
                <div className="card-header">
                  <h3>Detailed Activity Log</h3>
                  <button className="export-v2-btn" onClick={exportCSV}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>User</th>
                        <th>Project</th>
                        <th>Date</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="loading-td"><LoadingSpinner /></td></tr>
                      ) : detailed.length === 0 ? (
                        <tr><td colSpan={5} className="empty-td">No entries found.</td></tr>
                      ) : detailed.map((entry, idx) => (
                        <tr key={idx}>
                          <td className="task-name">{entry.task?.taskName}</td>
                          <td>{entry.user?.name}</td>
                          <td>{entry.task?.project ? <Badge color="muted" tone="soft" size="sm">{entry.task.project.name}</Badge> : '—'}</td>
                          <td>{new Date(entry.startTime).toLocaleDateString()}</td>
                          <td>{formatDuration(entry.duration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="productivity-card">
              <div className="card-header">
                <h3>Team Efficiency & Performance</h3>
                <button className="export-v2-btn" onClick={exportProductivityCSV}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="table-responsive">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Total Hours</th>
                      <th>Billable %</th>
                      <th>Tasks</th>
                      <th>On-Time Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="loading-td"><LoadingSpinner /></td></tr>
                    ) : productivity.length === 0 ? (
                      <tr><td colSpan={5} className="empty-td">No data available.</td></tr>
                    ) : productivity.map((u, idx) => (
                      <tr key={u.userId || idx}>
                        <td className="user-cell">
                          <div className="user-avatar-mini">{u.name.charAt(0)}</div>
                          <div className="user-info">
                            <span className="name">{u.name}</span>
                            <span className="email">{u.email}</span>
                          </div>
                        </td>
                        <td>{u.totalHours.toFixed(1)}h</td>
                        <td>
                          <div className="mini-progress-group">
                            <div className="progress-label">{u.billablePercent.toFixed(0)}%</div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${u.billablePercent}%`, background: 'var(--low-color)' }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="task-stats">
                            <span className="completed">{u.tasksCompleted} done</span>
                            {u.tasksOverdue > 0 && <span className="overdue">{u.tasksOverdue} overdue</span>}
                          </div>
                        </td>
                        <td>
                           <Badge color={u.onTimeRate > 80 ? 'low' : u.onTimeRate > 50 ? 'warning' : 'high'} tone="soft">
                             {u.onTimeRate.toFixed(0)}%
                           </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

