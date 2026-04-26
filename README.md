# Task Management Dashboard

A full-stack task management application with time tracking, project grouping, billing, and timesheet approval — inspired by Clockify. Built with React + Express + MongoDB, with real-time updates over WebSockets.

---

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Recharts, Axios, socket.io-client
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (JSON Web Tokens) with role-based access (admin / user)
- **Admin Panel:** Vanilla JS + HTML (served as static files at `/admin/`)
- **Testing:** Playwright (end-to-end UAT suite)
- **Deployment:** Google App Engine (single instance — Express serves React build + API + WebSocket)

---

## Features

### Authentication
- Register with name, email, password
- Optional admin secret key during registration to receive admin role
- JWT-based login with auto-redirect if already authenticated
- Protected routes — unauthenticated users are redirected to `/login`
- IDOR-hardened: regular users cannot read or mutate tasks not assigned to them (server enforces, not just UI)

### Dashboard (React)
- View tasks assigned to you (regular users see only their own; admins see all)
- Filter by project, tag, and priority; search by task name or assignee
- Switch between **List View** and **Kanban Board View** (preference persisted)
- Auto-sort by deadline then priority; overdue task highlighting
- **Real-time updates** over WebSocket — task create/update/delete and notifications arrive instantly (60s fallback poll only when the socket is disconnected)

### Task Cards
- Priority badges (High / Medium / Low)
- Status chips (Not Started / In Progress / Completed / Blocked)
- Estimated hours vs tracked hours progress bar
- Billable indicator, project color badge, tag chips
- File attachment download link
- Start / Stop timer button with live elapsed time
- Live deadline countdown badges on tasks due within 24 hours
- Recurring badge, blocked-by badge, overdue badge

### Time Tracking
- One-click timer start/stop per task
- Singleton timer — starting a new timer auto-stops the previous one
- Manual time entry support
- Billable flag inherited from the task's `isBillable` setting
- Hourly rate snapshot from user profile at the time of entry
- Earned amount auto-calculated on stop

### Projects
- Group tasks under named, color-coded projects
- **Budget tracking**: per-project `budgetHours` and `budgetAmount`; live consumption with progress bar and warning bands (yellow at 80%, red at 100%)
- Filter tasks by project on the dashboard

### Weekly Timesheet
- Mon–Sun grid showing time logged per task per day
- Navigate between weeks
- Admin can switch between team members' timesheets
- Submit timesheet for approval; resubmission allowed after rejection
- Status badge: Pending Review / Approved / Rejected (rejection reason surfaced to the user)

### Analytics & Reports
- Date range filter, group by task / project / user, project filter
- Bar chart (hours by group) + pie chart (billable vs non-billable)
- Summary stats: total tracked, billable hours, total earned
- Detailed log table with all time entries; **CSV export**
- **Productivity tab** (admin only): per-user totals, billable %, completed, overdue, on-time rate, with dedicated CSV export

### Notifications
- In-app notifications for `task_assigned`, `deadline_approaching`, `timesheet_submitted`, `timesheet_approved`, `timesheet_rejected`
- Bell icon in navbar with unread count badge
- **Real-time delivery** via WebSocket (`notification:new` to the user's room)
- **Mark all as read** action in the dropdown
- **Clickable notifications** — clicking a notification navigates to and highlights the linked task; auto-clears Dashboard filters if the task is hidden by the current view

### Comments & Activity Log
- Per-task comment thread (admin and assignee can post)
- Status changes are auto-logged as activity entries (before/after, who, when)
- Both surfaced on the task detail panel

### Recurring Tasks
- Mark a task recurring with daily / weekly / monthly cadence
- Backend re-spawns the next occurrence after the previous one is completed

### Task Dependencies
- Block a task by one or more upstream tasks
- Blocked tasks render with a "Blocked" badge and disable the timer + status controls until the upstream tasks complete

### Admin Panel (`/admin/`)
- Full CRUD for tasks (assign, project, priority, status, estimated hours, billable, tags, file attachment, blocked-by, recurring schedule)
- **Bulk actions**: select multiple tasks → reassign / change status / delete in one operation
- Project management with color picker and budget fields
- User management — view all users and set hourly billing rates
- **Audit log** (`/admin/audit.html`) — every admin mutation (CREATE_TASK / UPDATE_TASK / DELETE_TASK / BULK_*_TASKS / UPDATE_TASK_STATUS / etc.) is recorded with admin id, timestamp, target, and details; filterable by action and date range, paginated
- Live API status indicator, toast notifications, delete confirmation modals

### Theme
- Dark / light theme toggle in the navbar (☀️ / 🌙)
- Preference persisted to `localStorage`; cross-tab synced via the `storage` event
- React app and admin panel share a unified token system, so the toggle skins both surfaces consistently
- Light-mode badge contrast tuned (priority/status chips legible on white)

### Onboarding & Help
- **Admin onboarding checklist** — shown when no projects/tasks exist; ticks off as each step completes
- **User welcome tips** — shown to new users with no tasks
- **Help page** (`/help`) — role-aware quick reference

### Data Integrity
- Deleting a task cascade-removes its time entries, comments, and notifications
- Deleting a project cascades the same way for all tasks under it

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB — either local (`sudo systemctl start mongod`) or MongoDB Atlas

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the backend environment file
cp backend/.env.example backend/.env
# Fill in: MONGO_URI, JWT_SECRET, ADMIN_SECRET, JWT_EXPIRES_IN, PORT, CLIENT_URL
```

### Running locally

```bash
# Start frontend + backend together (recommended)
npm run dev:all

# Or start them separately in two shells:
npm run server:dev     # Backend  → http://localhost:3001 (auto-restart on file change)
npm run dev            # Frontend → http://localhost:5173
```

The frontend opens the WebSocket connection to the backend automatically once you log in. You don't need a separate WS server — Socket.io is mounted on the same Express HTTP server.

### Environment Variables (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/taskdb` or `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JWTs | `a_long_random_string` |
| `JWT_EXPIRES_IN` | Token expiry duration | `1d` |
| `ADMIN_SECRET` | Passphrase that grants the admin role at registration | `myAdminKey123` |
| `PORT` | Backend port | `3001` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |
| `DISABLE_AUTH_RATE_LIMIT` | Set to `1` to disable the auth rate limiter (UAT only) | `1` |

---

## Running the UAT Suite

The Playwright suite (`tests/uat.spec.js`) is a serial 22-test end-to-end run that exercises every major feature against a live backend.

### One-time

```bash
npx playwright install chromium     # install the browser the suite uses
```

### Each run

The suite needs **MongoDB**, the **backend on :3001**, and the **frontend on :5173** all up. The auth rate limiter must be disabled because the suite registers / logs in many times.

```bash
# 1. MongoDB
sudo systemctl start mongod

# 2. Backend with rate limiter off (in its own shell)
DISABLE_AUTH_RATE_LIMIT=1 npm run server:dev

# 3. Frontend (in another shell)
npm run dev

# 4. UAT
npm run test:uat
```

Expected: **22 passed** in ~30–45s. Tests run sequentially (`workers: 1`, `mode: 'serial'`) and share a single browser context so auth state established by an earlier test is reused by later ones.

### What the suite covers

| # | Test | Feature |
|---|---|---|
| 1–2 | Admin / User Registration | Auth |
| 3 | IDOR Protection Verification | Security |
| 4 | Session Persistence | Auth |
| 5 | Task Dashboard View & Filter | Dashboard |
| 6 | Task Deletion & Cascading Clean | Data integrity |
| 7 | Time Tracking & 60s performance | Time tracking |
| 8 | Deadline Overdue Lockout | Status / timer rules |
| 9 | Timesheet Submission & Admin Approval | Timesheets |
| 10 | Analytics Export | Reports |
| 11 | Admin Onboarding | Onboarding |
| 12 | Admin Tools: Project CRUD | Admin panel |
| 13 | Admin Tools: User Rates | Admin panel |
| 14 | Admin Tools: Bulk Actions | Bulk mutations |
| 15 | Task Dependencies (Blocked By) | Dependencies |
| 16 | Recurring Task Setup | Recurring |
| 17 | Theme Toggle persistence + cross-tab sync | Theme |
| 18 | Productivity Report (admin Analytics tab) | Reports |
| 19 | Project Budget fields persist on create | Projects |
| 20 | Audit Log lists recent admin actions | Admin audit |
| 21 | Notifications: Mark All Read clears unread count | Notifications |
| 22 | Clickable Notification highlights its task on Dashboard | Notifications |

---

## API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Private | Get current user info |

### Tasks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/tasks` | Private | List tasks (filtered by role) — supports `?project=`, `?tag=`, `?assignedTo=` |
| GET | `/api/tasks/due-soon` | Private | Tasks due within the next 24 hours |
| GET | `/api/tasks/:id` | Private | Get one task (owner or admin) |
| POST | `/api/tasks` | Admin | Create task |
| PUT | `/api/tasks/:id` | Admin | Update task |
| DELETE | `/api/tasks/:id` | Admin | Delete task (cascades comments / time entries / notifications) |
| PATCH | `/api/tasks/:id/status` | Private | Update task status (owner or admin) |
| POST | `/api/tasks/bulk` | Admin | Bulk reassign / status-change / delete |

### Time Entries
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/time-entries` | Private | Get my time entries |
| POST | `/api/time-entries` | Private | Create manual entry |
| POST | `/api/time-entries/start` | Private | Start timer |
| PATCH | `/api/time-entries/:id/stop` | Private | Stop timer |
| DELETE | `/api/time-entries/:id` | Private | Delete entry |

### Timesheets
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/timesheets` | Private | List timesheets |
| POST | `/api/timesheets/submit` | Private | Submit week for approval |
| PATCH | `/api/timesheets/:id/approve` | Admin | Approve timesheet |
| PATCH | `/api/timesheets/:id/reject` | Admin | Reject with note |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Private | List all projects |
| POST | `/api/projects` | Admin | Create project (supports `budgetHours`, `budgetAmount`) |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project (cascades tasks under it) |
| GET | `/api/projects/:id/budget` | Admin | Budget vs actual hours/earned |
| GET | `/api/projects/:id/tasks` | Private | All tasks under a project |

### Reports
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reports/summary` | Private | Grouped summary (task / user / project) |
| GET | `/api/reports/detailed` | Private | Raw time entry list |
| GET | `/api/reports/billing` | Private | Billing totals and earned amount |
| GET | `/api/reports/productivity` | Admin | Per-user productivity (hours, billable %, completed, overdue, on-time rate) |

Query params: `?from=`, `?to=`, `?groupBy=`, `?userId=`, `?projectId=`

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Private | List my notifications (latest 50) |
| PATCH | `/api/notifications/:id/read` | Private | Mark a single notification read |
| PATCH | `/api/notifications/read-all` | Private | Mark every unread notification read |

### Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/comments/:taskId` | Private | List comments + activity for a task |
| POST | `/api/comments/:taskId` | Private | Add a comment to a task |

### Audit
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/audit` | Admin | Paginated audit log; supports `?action=`, `?from=`, `?to=`, `?page=` |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | List all users |
| PUT | `/api/users/:id/rate` | Admin | Set user hourly rate |

### WebSocket events (Socket.io)

The Socket.io server is mounted on the same HTTP server as the Express app. Clients authenticate by passing the JWT in `socket.auth.token`.

| Direction | Event | Payload | Notes |
|---|---|---|---|
| Client → Server | `join` | `userId` | Joins room `user:<userId>` for targeted events |
| Client → Server | `joinAdmins` | `()` | Joins room `admins` (call only when the current user is an admin) |
| Server → Client | `task:created` | `task` | Targeted to `[user:<assignee>, 'admins']` |
| Server → Client | `task:updated` | `task` | Targeted to current + previous assignee + `admins` |
| Server → Client | `task:deleted` | `{ _id }` | Targeted to previous assignee + `admins` |
| Server → Client | `tasks:bulk_updated` | `{ taskIds, action, payload }` | Targeted to all affected assignees + `admins` |
| Server → Client | `timer:started` / `timer:stopped` | `{ entry }` | Targeted to `user:<id>` (own timer only) |
| Server → Client | `notification:new` | populated `Notification` | Targeted to `user:<userId>` |

---

## Deployment (Google App Engine)

```bash
# 1. Build the React frontend
npm run build

# 2. Deploy to App Engine
npm run deploy
# (runs: npm run build && gcloud app deploy --quiet)
```

The Express server serves the React `dist/` as static files, handles all `/api/*` routes, and upgrades WebSocket connections on the same port. Everything runs on a single App Engine instance.

**Important before deploying:**
- Set every secret via `gcloud app deploy` env vars or Secret Manager — never commit secrets to `app.yaml`
- Set `CLIENT_URL` to your App Engine URL (e.g. `https://your-project.ew.r.appspot.com`)
- Ensure your MongoDB Atlas cluster allows connections from App Engine IPs (or allow all: `0.0.0.0/0`)

---

## Project Structure

```
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # Route logic (auth, task, time, timesheet, project, report, comment, notification)
│   ├── middleware/auth.js        # verifyToken + requireAdmin
│   ├── models/                   # Mongoose schemas (User, Task, Project, TimeEntry, WeeklyTimesheet, Comment, Notification, AuditLog)
│   ├── routes/                   # Express routers (one per resource + audit)
│   ├── utils/
│   │   ├── socket.js             # Socket.io init + emitEvent helper (string | string[] rooms)
│   │   ├── auditLogger.js        # logAudit helper called from admin mutations
│   │   └── deadlineChecker.js    # On-demand deadline scan that creates notifications
│   └── server.js                 # Express + Socket.io bootstrap
├── public/
│   └── admin/                    # Vanilla JS admin panel (index, projects, users, audit) + theme-sync.js
├── src/
│   ├── components/               # TaskTable, TaskCard, KanbanBoard, Navbar, NotificationBell, NotificationDropdown, ...
│   ├── contexts/                 # AuthContext, TimerContext, ThemeContext
│   ├── pages/                    # Dashboard, Timesheet, Analytics, Help, Login, Register
│   └── utils/socket.js           # socket.io-client singleton + connect / join helpers
├── tests/
│   └── uat.spec.js               # Playwright end-to-end UAT (22 tests, serial)
├── playwright.config.js          # Single worker, sequential, baseURL :5173
├── app.yaml                      # App Engine config
├── package.json
└── vite.config.js
```
