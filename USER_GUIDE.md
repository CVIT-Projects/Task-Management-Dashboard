# Task Management Dashboard — Official User Guide

> Canonical user-facing documentation. The README covers setup and APIs for developers; this guide covers what each role sees and clicks. Keep this file in sync whenever a feature ships.

## 1. Introduction

### Brief Overview
The Task Management Dashboard is a centralized, real-time application for running a small team. It combines task delegation, deadline tracking, time tracking, weekly timesheets, real-time notifications, and an audit trail in one interface.

### Purpose of the Application
The dashboard removes the need for separate task, time-tracking, and timesheet tools by combining them. That gives accurate sprint planning, transparent billing, strict deadline accountability, and a complete audit trail of administrative actions.

### Target Users
- **Admins (Project Managers / Leads):** Create users, assign tasks, set deadlines, manage projects + budgets, approve timesheets, and review the audit log + productivity report.
- **Normal Users (Employees / Contractors):** Pick up assigned tasks, run timers, comment on tasks, update status, and submit weekly timesheets.

---

## 2. Key Features
- **Task management:** Create tasks with project, priority, estimated hours, billable flag, tags, file attachment, deadline, and dependencies.
- **Status tracking:** Move tasks through Not Started → In Progress → Blocked → Completed inline from the dashboard.
- **Role-based access:** Strict separation — regular users can only see and mutate their own tasks (IDOR-hardened on the server).
- **Integrated time tracking:** A built-in stopwatch logs time blocks; only one timer runs at a time.
- **Real-time updates (WebSocket):** Task changes and notifications appear instantly across all open tabs without refresh.
- **Weekly timesheets:** Mon–Sun grid with submit-for-approval workflow.
- **Analytics + Productivity report:** Charts, summaries, CSV export, and an admin-only per-user productivity tab.
- **Project budgets:** Budget hours and budget amount per project, with live consumption bars.
- **Recurring tasks:** Daily / weekly / monthly auto-respawn after completion.
- **Task dependencies:** Block a task on one or more upstream tasks until they're done.
- **Comments + activity log:** Per-task comment thread; status changes are auto-logged.
- **Notifications:** Bell icon with unread count, real-time delivery, mark-all-read, and click-to-jump-to-task.
- **Bulk admin actions:** Select multiple tasks → reassign, change status, or delete in one operation.
- **Audit log:** Every admin mutation is recorded and viewable, filterable by action and date range.
- **Dark / light theme:** Toggle in the navbar; preference persists across reloads and tabs.

---

## 3. User Roles and Permissions

### The Admin Role
- **Full Control:** Access to the global dashboard, the Admin Panel (`/admin/`), the projects page, the users page, and the audit log.
- **User Management:** View all users; set hourly billing rates per user.
- **Task Management:** Create, edit, delete, and bulk-mutate any task; assign to anyone; set dependencies, recurring schedules, files, tags, billable flag.
- **Project Management:** Create / edit / delete projects with color and budget fields; review live budget consumption.
- **Timesheet Approval:** Approve or reject each user's weekly submission, with an optional rejection note.
- **Reports:** Access the Productivity tab in Analytics; CSV export for both Analytics and Productivity views.
- **Visibility:** Sees every task in the system; the Admin Panel exposes the full audit history.

### The Normal User Role
- **Limited Access:** No Admin Panel, no audit log, no productivity report, no user management.
- **Task Isolation:** The dashboard only shows tasks assigned to them. The backend enforces this — even direct URL access is blocked.
- **Work Execution:** Start / stop their own timers, change status of their own tasks, post comments, submit their own weekly timesheet.

---

## 4. Getting Started

### Login Process
1. Navigate to the application.
2. Enter your registered Email Address and Password.
3. The system routes you to your dashboard automatically based on your role.

### Dashboard Overview After Login
- **Header navigation:** Brand, global search, project / tag / priority filters, list/kanban toggle, theme toggle, notification bell, profile + logout.
- **Real-time status indicator:** A small "synced" badge — when you see a peer create or change a task, it appears in your view immediately (no refresh).
- **View switcher:** Toggle between **List View** and **Kanban Board View**; your preference is remembered for next time.
- **Task list / board:** Your active workspace; sorted by deadline + priority.
- **Onboarding:** First-time admins see a 3-step setup checklist; first-time users see a welcome tip with the basics.

### Navigation Explanation
- **📊 Dashboard:** The main task list / board.
- **🕒 Timesheet:** Your weekly aggregated logged hours.
- **📈 Analytics:** Charts and CSV exports. Admins also see a "Productivity" tab with per-user stats.
- **⚙️ Admin Panel:** (Admins only) Tasks, projects, users, audit log.
- **🌙 / ☀️ Theme:** Toggle dark / light theme. Your preference is saved and synced across tabs.
- **🔔 Notifications:** Unread badge + dropdown with real-time updates.
- **❓ Help:** Role-aware quick reference.
- **Logout:** Securely ends your session.

---

## 5. Detailed Feature Guide

### Creating a Task (Admin Only)
- **What it does:** Generates a new piece of work for the team.
- **Where to find it:** `⚙️ Admin Panel` → main page (Tasks form).
- **Steps:**
  1. Fill in Task Name, project, priority, start time, deadline, and estimated hours.
  2. Select the assignee from the dropdown.
  3. Optionally: tags, file attachment, billable flag, blocked-by dependencies, recurring schedule.
  4. Click `Add Task`.

### Editing / Deleting a Task (Admin Only)
- Click `Edit` on a task card to modify it; click `Delete` to remove it.
- **Cascading delete:** Removing a task also deletes its time entries, comments, and notifications, so the database stays clean.

### Assigning Tasks (Admin Only)
- Use the "Assigned To" dropdown when creating or editing a task. The new assignee receives an instant in-app notification.

### Bulk Admin Actions (Admin Only)
- **What it does:** Update or delete several tasks in one operation instead of one by one.
- **Where to find it:** Admin Panel main page — checkboxes on each task card; or the "Select All" checkbox in the list header.
- **Steps:**
  1. Select 2 or more tasks. A floating bulk action bar appears at the bottom.
  2. Pick an action: **Reassign** (choose a new assignee), **Change Status**, or **Delete**.
  3. Click apply. A toast confirms the result.

### Recurring Tasks (Admin Only)
- **What it does:** A finished task automatically respawns the next occurrence.
- **Where to find it:** "Recurring" checkbox in the task form.
- **Steps:**
  1. Enable **Recurring**.
  2. Pick a frequency: daily / weekly / monthly.
  3. Save the task. Each time it's marked Completed, the system queues the next instance with the same template.
- A 🔁 emoji on the task row indicates a recurring task.

### Task Dependencies — "Blocked By" (Admin Only)
- **What it does:** Prevents a task from being worked on until its upstream tasks are done.
- **Where to find it:** "Blocked By" multi-select in the task form.
- **Steps:**
  1. Pick one or more upstream tasks in the form.
  2. Save. The blocked task shows a red **Blocked** badge.
  3. The assignee's timer + status controls are disabled until every upstream task is Completed.

### Updating Task Status (Normal User or Admin)
- **What it does:** Communicates the current phase of the task.
- **Where to find it:** The colored status chip on each task row / kanban card.
- **Steps:**
  1. Click the status chip.
  2. Pick a new status: Not Started / In Progress / Completed / Blocked.
- **Notes:**
  - Starting a timer auto-promotes the task to "In Progress".
  - Marking a task "Completed" stamps the exact end time and locks the timer.
  - Once the deadline passes, status + timer are locked.

### Time Tracking
- Click `▶ Start Timer` on a task you own.
- Only one timer runs at a time — starting a new one auto-stops the previous one.
- The card shows a live elapsed counter; the timer survives across page reloads.
- The billable flag and your hourly rate at the time are snapshotted onto the entry.

### Comments & Activity Log
- **What it does:** Discuss a task in a thread; system events get auto-logged.
- **Where to find it:** Task detail panel / per-task comment box.
- **Behavior:** Every status change is recorded with who, when, and the before / after values, alongside human comments.

### Switching to Kanban View
- **What it does:** Organizes tasks into status columns.
- **Where to find it:** Top right of the Dashboard.
- **Behavior:** Each column (Not Started, In Progress, Blocked, Completed) shows cards for your tasks. All List-view actions (timer, status update, badges) are available on the cards.

### Live Deadline Reminders
- A pulsing amber badge appears on tasks due within 24 hours.
- Every hour, the backend scans deadlines and pushes new in-app notifications for tasks approaching theirs.
- The notification dropdown shows live "Time Left" countdowns next to each deadline notification.

### Notifications
- **Bell icon (🔔)** in the navbar; the red unread-count badge updates in real time over WebSocket — no refresh required.
- **Click a notification:** Closes the dropdown and jumps to the linked task on the Dashboard, briefly highlighting the row. If your current filter hides the task, the filters automatically clear so you can find it.
- **✓ Mark All Read:** A button in the dropdown header marks every unread notification read at once. The badge clears immediately; the action rolls back if the network call fails.

### Theme Toggle (☀️ / 🌙)
- **What it does:** Switches the entire UI (React + Admin Panel) between dark and light.
- **Where to find it:** A 🌙 (in dark mode) or ☀️ (in light mode) button in the navbar, next to the bell.
- **Behavior:** Your preference is saved to the browser. Open another tab and the theme is applied there too.

### Real-Time Updates (under the hood)
- The app maintains a single WebSocket connection. When an admin creates / updates / deletes a task that involves you, you see it instantly. Same for assigned-to-you notifications and your own timer events.
- If the connection drops, a slow background poll keeps things in sync until it reconnects.

### Project Budget Tracking (Admin Only)
- **What it does:** Track each project's budget in hours and dollars, with visual warnings as you consume it.
- **Where to find it:** Admin Panel → **Projects** page → project form has **Budget (Hours)** and **Budget (Amount $)** fields.
- **Behavior:**
  - Set a budget when creating or editing a project.
  - Each project card shows a progress bar of consumed-vs-budget. The bar turns yellow at 80% and red at 100%.
  - Detailed budget breakdown is also shown in the Analytics page filtered by project.

### Productivity Report (Admin Only)
- **What it does:** Per-team-member productivity summary.
- **Where to find it:** Analytics page → **Productivity** tab (admin only).
- **Columns:** User, Total Hours, Billable Hours, Billable %, Completed, Overdue, On-Time Rate.
- **Filters:** Same date-range selector as the Analytics tab.
- **Export:** Dedicated `Export CSV` button on the Productivity tab.

### Audit Log (Admin Only)
- **What it does:** A tamper-evident record of every admin mutation.
- **Where to find it:** Admin Panel → **Audit Logs** link (or `/admin/audit.html`).
- **What's logged:** CREATE_TASK / UPDATE_TASK / DELETE_TASK / UPDATE_TASK_STATUS / BULK_*_TASKS / project + user changes — with admin id, timestamp, target id, and detail payload.
- **Filters:** By action type, by date range. Pagination at the bottom.

### Weekly Timesheet
- **Where to find it:** `🕒 Timesheet` in the navbar.
- A Mon–Sun grid of time logged per task per day. Navigate between weeks with the arrows.
- Click `Submit for Approval` to send the current week to your manager.
- **Re-submission** is allowed if your week was rejected — fix what's wrong and submit again.

### Timesheet Approval (Admin Only)
- Admins see a "Pending Approvals" queue with each user's submitted week.
- Approve or reject; rejection takes an optional note that's shown to the user.
- Status badge on the timesheet header: Pending Review / Approved / Rejected.

### Analytics & Reports
- Date-range filter, group by task / project / user, optional project filter.
- Bar chart (hours by group) + pie chart (billable vs non-billable).
- Summary stat cards: total tracked, billable hours, total earned.
- Detailed log table with every entry; CSV export.

---

## 6. Button and UI Element Explanation

| Element | What it means |
|---|---|
| **▶ Start Timer** | Begin tracking time on a task you own. |
| **⏹ Stop [Time]** | Halt the active timer and persist the elapsed duration. |
| **Status chip** (colored pill) | Click to transition the task — Not Started / In Progress / Completed / Blocked. |
| **Add Task / Edit / Delete** | Standard CRUD on tasks (admin-only). |
| **Select All** + checkboxes | Activate Bulk Admin Actions for multiple tasks. |
| **🔒 Deadline Passed** | The deadline has passed; timer + status are locked. |
| **⏳ Due in Xh Ym** | A pulsing amber badge — deadline within 24 hours. |
| **🚫 Blocked** | The task is gated by a "Blocked By" upstream that isn't done yet. |
| **🔁 Recurring badge** | Indicates a task that auto-respawns on completion. |
| **🔔 Notification Bell** | Real-time unread count; click to open the dropdown. |
| **✓ Mark All Read** | In the notification dropdown, marks every unread item read. |
| **Notification item** | Click to close the dropdown and jump to the linked task. |
| **🌙 / ☀️ Theme Toggle** | Flip the entire UI between dark and light. |
| **📈 Productivity tab** | (Admins) Per-user productivity table inside Analytics. |
| **Budget bar on a project** | Live consumption — green / yellow at 80% / red at 100%. |
| **Audit Logs link** | (Admins) Opens the searchable history of admin actions. |

---

## 7. Admin Workflow (End-to-End)

1. **Login** as an admin.
2. **Create a project** in `Admin Panel → Projects`. Set a color and a budget (hours + amount).
3. **Make sure team members are registered** (they sign up themselves at `/register`).
4. **Create tasks** in the Admin Panel — assign to teammates, set priority, deadline, billable flag, tags, dependencies, and (if needed) a recurring schedule.
5. **Bulk operations:** When you need to reassign 10 tasks to a new owner or close out a sprint, select the cards and use the bulk action bar.
6. **Monitor in real time:** Watch the Dashboard — status chips and timer states update as the team works, no refresh needed.
7. **Approve timesheets:** End of week, go through the Pending Approvals queue and approve or reject each user.
8. **Review productivity:** Open Analytics → Productivity to see per-user totals; export to CSV for stakeholders.
9. **Audit when needed:** If a task disappeared or a status flipped unexpectedly, open Admin Panel → Audit Logs and filter by action and date.

---

## 8. User Workflow (End-to-End)

1. **Login** and see only the tasks assigned to you.
2. **Get a real-time ping** when a new task lands — the bell badge updates immediately. Click the notification to jump to the new task.
3. **Read the brief:** click the attachment link to download specs.
4. **Start work:** click `▶ Start Timer`. The task auto-promotes to In Progress.
5. **Comment as you go:** drop questions or progress notes in the per-task comment thread; status changes are auto-logged for the admin.
6. **Pause:** click `⏹ Stop` for breaks. Hours accumulate accurately.
7. **Mark Completed** when done. The end time is stamped permanently and the timer locks.
8. **Submit your week:** end of the week, go to `🕒 Timesheet` → `Submit for Approval`.

---

## 9. Best Practices

### Do's
- **Do** stop your timer for long breaks. The system is designed for accurate session intervals, not background guessing.
- **Do** rely on the green "Estimated Hours" bar to gauge whether you're overshooting an estimate.
- **Do** mark a task **Blocked** when waiting on a dependency — the admin can see it and unblock you faster than chasing in chat.
- **Do** click "Mark All Read" after going through the bell — it keeps the unread count meaningful.
- **Do** click notifications instead of scrolling — they jump straight to the right task.

### Don'ts
- **Don't** let tasks run past the deadline. The system locks the timer when a deadline passes.
- **Don't** mark a task Completed until it's truly done — the end time is stamped permanently for managerial tracking.
- **Don't** delete a task you might want back later — deletes cascade and remove time entries, comments, and notifications.

---

## 10. Conclusion

By tying time tracking, status, comments, real-time notifications, and an immutable audit trail into a single workflow, the dashboard removes friction for both employees and managers. Employees get a focused view of exactly what to do today, with timers and statuses one click away. Managers get accurate weekly hour logs, per-user productivity reports, project-budget visibility, and a full audit history of every admin action — all without juggling separate tools.
