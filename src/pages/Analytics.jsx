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
  const [productivity, setProductivity] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'productivity'
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

        // Fetch productivity if admin
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

  const billableHours = useMemo(() => {
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
      <main className="main-content" style={{ paddingTop: '20px' }}>
        <div className="analytics-container">
          
          <div className="analytics-header">
            <div className="analytics-title">
              <h2>Time Reports & Analytics</h2>
              <p>Analyze productivity and tracked hours across your team</p>
            </div>

            {user?.role === 'admin' && (
              <div className="tab-switcher">
                <button 
                  className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 size={18} />
                  Analytics
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'productivity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('productivity')}
                >
                  <TrendingUp size={18} />
                  Productivity
                </button>
              </div>
            )}

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

          {activeTab === 'analytics' ? (
            <>
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

              {budgetData && (
                <div className="budget-widget-card" style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  padding: '24px', 
                  marginBottom: '24px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <TrendingUp size={24} color="var(--accent)" />
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Project Budget Tracking: {budgetData.project.name}</h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    {/* Hours Budget */}
                    {budgetData.project.budgetHours > 0 && (
                      <div className="budget-item">
                        <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Hours Consumption</span>
                          <span style={{ fontWeight: '600', color: budgetData.hoursPercent >= 100 ? 'var(--error)' : budgetData.hoursPercent >= 80 ? 'var(--warning)' : 'var(--success)' }}>
                            {budgetData.actualHours.toFixed(1)} / {budgetData.project.budgetHours}h ({budgetData.hoursPercent.toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(100, budgetData.hoursPercent)}%`, 
                            background: budgetData.hoursPercent >= 100 ? 'var(--error)' : budgetData.hoursPercent >= 80 ? 'var(--warning)' : 'var(--accent)',
                            transition: 'width 0.5s ease'
                          }}></div>
                        </div>
                        {budgetData.hoursPercent >= 100 && (
                          <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ Over budget by {(budgetData.actualHours - budgetData.project.budgetHours).toFixed(1)}h</div>
                        )}
                      </div>
                    )}

                    {/* Money Budget */}
                    {budgetData.project.budgetAmount > 0 && (
                      <div className="budget-item">
                        <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Budget Consumption ($)</span>
                          <span style={{ fontWeight: '600', color: budgetData.amountPercent >= 100 ? 'var(--error)' : budgetData.amountPercent >= 80 ? 'var(--warning)' : 'var(--success)' }}>
                            ${budgetData.actualAmount.toLocaleString()} / ${budgetData.project.budgetAmount.toLocaleString()} ({budgetData.amountPercent.toFixed(0)}%)
                          </span>
                        </div>
                        <div style={{ height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(100, budgetData.amountPercent)}%`, 
                            background: budgetData.amountPercent >= 100 ? 'var(--error)' : budgetData.amountPercent >= 80 ? 'var(--warning)' : 'var(--accent)',
                            transition: 'width 0.5s ease'
                          }}></div>
                        </div>
                        {budgetData.amountPercent >= 100 && (
                          <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ Over budget by ${(budgetData.actualAmount - budgetData.project.budgetAmount).toLocaleString()}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                          <td>{entry.user?.name}</td>
                          <td>{entry.task?.project?.name || 'None'}</td>
                          <td>{new Date(entry.startTime).toLocaleString()}</td>
                          <td>{formatDuration(entry.duration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="report-table-section">
              <div className="table-header-row">
                <h3>Team Productivity Report</h3>
                <button className="export-btn" onClick={exportProductivityCSV}>
                  <Download size={18} />
                  Export CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Total Hours</th>
                      <th>Billable Hours</th>
                      <th>Billable %</th>
                      <th>Completed</th>
                      <th>Overdue</th>
                      <th>On-Time Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><LoadingSpinner /></td></tr>
                    ) : productivity.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No productivity data available.</td></tr>
                    ) : productivity.map((u, idx) => (
                      <tr key={u.userId || idx}>
                        <td style={{ fontWeight: '600' }}>
                          <div>{u.name}</div>
                          <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', fontWeight: 'normal' }}>{u.email}</div>
                        </td>
                        <td>{u.totalHours.toFixed(1)}h</td>
                        <td>{u.billableHours.toFixed(1)}h</td>
                        <td>
                          <div className="progress-mini">
                            <div className="progress-bar-mini" style={{ width: `${u.billablePercent}%`, background: 'var(--success)' }}></div>
                          </div>
                          {u.billablePercent.toFixed(0)}%
                        </td>
                        <td>{u.tasksCompleted}</td>
                        <td style={{ color: u.tasksOverdue > 0 ? 'var(--error)' : 'inherit' }}>{u.tasksOverdue}</td>
                        <td>
                           <span style={{ 
                             color: u.onTimeRate > 80 ? 'var(--success)' : u.onTimeRate > 50 ? 'var(--warning)' : 'var(--error)'
                           }}>
                             {u.onTimeRate.toFixed(0)}%
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
