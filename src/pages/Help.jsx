import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import './Help.css';

export default function Help() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content" style={{ paddingTop: '20px' }}>
        <div className="help-container">

          <div className="help-header">
            <h2>Help & Getting Started</h2>
            <p>Everything you need to know to get up and running.</p>
          </div>

          {/* Admin Setup Guide */}
          {isAdmin && (
            <section className="help-section">
              <h3>⚙️ Admin Setup Guide</h3>
              <div className="help-steps">
                <div className="help-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Create Projects</h4>
                    <p>Go to <a href="/admin/projects.html">Admin Panel → Manage Projects</a>. Create colour-coded projects to group related tasks (e.g. "Frontend", "Backend", "Design").</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Register Team Members</h4>
                    <p>Ask each team member to register at <strong>/register</strong>. They will join as regular users. Use <a href="/admin/users.html">Admin Panel → Manage Users</a> to set their hourly billing rates.</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Create & Assign Tasks</h4>
                    <p>Go to <a href="/admin/">Admin Panel</a>. Fill in the task form — set the name, assignee, project, priority, deadline, estimated hours, and whether it's billable.</p>
                  </div>
                </div>
                <div className="help-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Review Timesheets</h4>
                    <p>Team members submit weekly timesheets for approval. Check <strong>Timesheet</strong> in the navbar — you'll see a <em>Pending Approvals</em> queue to approve or reject with notes.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* For all users */}
          <section className="help-section">
            <h3>📋 Dashboard</h3>
            <div className="help-cards">
              <div className="help-card">
                <div className="help-card-icon">🔍</div>
                <h4>Search & Filter</h4>
                <p>Use the search box to find tasks by name. Filter by Priority, Project, or Tag using the dropdowns.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">🔄</div>
                <h4>Update Status</h4>
                <p>Click the status chip on any task assigned to you to change it — Not Started → In Progress → Completed.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">⏱️</div>
                <h4>Start a Timer</h4>
                <p>Click <strong>▶ Start Timer</strong> on any task to begin tracking time. Only one timer runs at a time — starting a new one auto-stops the previous.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">🔒</div>
                <h4>Deadline Lockout</h4>
                <p>Once a task's deadline passes, the timer and status are locked. Contact your admin to adjust the deadline if needed.</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3>🕒 Timesheet</h3>
            <div className="help-cards">
              <div className="help-card">
                <div className="help-card-icon">📅</div>
                <h4>Weekly View</h4>
                <p>See your tracked time grouped by task for each day of the week. Use the arrows to navigate between weeks.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">📤</div>
                <h4>Submit for Approval</h4>
                <p>At the end of your week, click <strong>Submit for Approval</strong>. Your admin will review and approve or reject it with feedback.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">🔁</div>
                <h4>Re-submission</h4>
                <p>If your timesheet is rejected, fix the issues and click <strong>Resubmit</strong>. The rejection note from your admin will guide you.</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3>📈 Reports & Analytics</h3>
            <div className="help-cards">
              <div className="help-card">
                <div className="help-card-icon">📊</div>
                <h4>Group By</h4>
                <p>Switch between grouping by Task, Project, or User to get different views of where time is being spent.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">💰</div>
                <h4>Billable Hours</h4>
                <p>The pie chart and summary stats show billable vs non-billable split. Total earned is calculated from your hourly rate × billable hours.</p>
              </div>
              <div className="help-card">
                <div className="help-card-icon">⬇️</div>
                <h4>Export CSV</h4>
                <p>Click <strong>Export CSV</strong> to download the detailed log for the selected date range and filters.</p>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="help-section">
              <h3>🏷️ Tags</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                When creating or editing a task in the Admin Panel, enter comma-separated tags (e.g. <code>bug, frontend, urgent</code>). Tags appear as chips on task cards and can be filtered from the Dashboard.
              </p>
            </section>
          )}

          <div className="help-footer">
            <p>Still stuck? Check the <a href="https://github.com/AnkamAjay/Task-Management-Dashboard" target="_blank" rel="noopener noreferrer">GitHub repository</a> for more details.</p>
          </div>

        </div>
      </main>
    </div>
  );
}
