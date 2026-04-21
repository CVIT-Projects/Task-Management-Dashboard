# Task Management Dashboard

A full-stack task management application with time tracking, project grouping, billing, and timesheet approval — inspired by Clockify. Built with React + Express + MongoDB.

---

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Recharts, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (JSON Web Tokens) with role-based access (admin / user)
- **Admin Panel:** Vanilla JS + HTML (served as static files)
- **Deployment:** Google App Engine (single instance — Express serves React build + API)

---

## Features

### Authentication
- Register with name, email, password
- Optional admin secret key during registration to receive admin role
- JWT-based login with auto-redirect if already authenticated
- Protected routes — unauthenticated users are redirected to `/login`

### Dashboard (React)
- View tasks assigned to you (regular users see only their own; admins see all)
- Filter by project, tag, and priority
- Search by task name or assigned person
- Select between List View and Kanban Board View
- Auto-sort by deadline then priority
- Overdue task highlighting
- Real-time polling every 10 seconds

### Task Cards
- Priority badges (High / Medium / Low)
- Status chips (Not Started / In Progress / Completed / Blocked)
- Estimated hours vs tracked hours progress bar
- Billable indicator
- Project color badge
- Tag chips
- File attachment download link
- Start / Stop timer button with live elapsed time display
- **Live Deadline Countdown**: Pulsing badges on tasks due within 24 hours (List & Kanban)
- **Optimized Performance**: Real-time timers synced to 1-minute updates

### Time Tracking
- One-click timer start/stop per task
- Singleton timer — starting a new timer auto-stops the previous one
- Manual time entry support
- Billable flag inherited from task's `isBillable` setting
- Hourly rate snapshot from user profile at time of entry
- Earned amount auto-calculated on stop

### Projects
- Group tasks under named, color-coded projects
- Filter tasks by project on the dashboard
- Admin panel to create, edit, and delete projects

### Weekly Timesheet
- Weekly view showing time logged per task per day (Mon–Sun)
- Navigate between weeks
- Admin can switch between team members' timesheets
- Submit timesheet for approval
- Re-submission allowed after rejection

### Timesheet Approval Workflow
- Users submit their weekly timesheet for admin review
- Admins see a Pending Approvals queue with approve / reject controls
- Rejection supports an optional note shown to the user
- Status badge on timesheet: Pending Review / Approved / Rejected

### Analytics & Reports
- Date range filter, group by task / project / user
- Project filter
- Bar chart: hours by group
- Pie chart: billable vs non-billable distribution
- Summary stats: total tracked, billable hours, total earned
- Detailed log table with all time entries
- CSV export

### Admin Panel (`/admin/`)
- Full CRUD for tasks (create, edit, delete)
- Assign tasks to users, set project, priority, status, estimated hours, billable flag, tags, file attachment
- Manage projects (create, edit, delete, color picker)
- Manage users — view all users and set hourly billing rates
- Live API status indicator
- Toast notifications and delete confirmation modals

### Tags
- Add comma-separated tags to any task (e.g. `bug`, `frontend`, `design`)
- Tags shown as chips on task cards
- Filter tasks by tag on the dashboard

### Task Status Updates
- Users can update the status of tasks assigned to them directly from the dashboard
- Inline status dropdown on each task card (Not Started / In Progress / Completed / Blocked)
- Deadline lockout — timer and status are locked once a task's deadline passes
- Timer auto-promotes task to "In Progress" when started
- Timer auto-stops when task is marked Completed

### Task Deadline Reminders
- **Automatic Background Scanning**: Backend scans for deadlines every hour
- **Hourly Proactive Notifications**: Users receive fresh in-app reminders for urgent tasks
- **Dropdown Timers**: Live "Time Left" indicator directly inside the notification dropdown
- **Populated Task Context**: Notifications link directly to task details

### Kanban Board
- **Status Columns**: Visual drag-agnostic columns (Not Started, In Progress, Blocked, Completed)
- **Feature Parity**: Kanban cards include all List view features: timers, badges, and status updates
- **Responsive Design**: Auto-adjusts layout for different screen sizes

### Onboarding & Help
- **Admin onboarding checklist** — shown on first login when no projects/tasks exist; guides through: Create Project → Register Users → Create Task; auto-ticks steps as they are completed; dismissible
- **User welcome tips** — shown to new regular users with no tasks assigned; explains timer, status updates, and timesheet submission; dismissible
- **Help page** (`/help`) — role-aware guide accessible from the navbar; admin sees full setup guide + feature cards; regular users see feature cards only
- **Improved empty states** — admin empty state links directly to Admin Panel; user empty state prompts to contact admin

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create backend environment file
cp backend/.env.example backend/.env
# Fill in: MONGO_URI, JWT_SECRET, ADMIN_SECRET, JWT_EXPIRES_IN, PORT
```

### Running locally

```bash
# Run both frontend and backend together
npm run dev:all

# Or separately:
npm run server:dev     # Backend on http://localhost:3001
npm run dev            # Frontend on http://localhost:5173
```

### Environment Variables (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JWTs | `a_long_random_string` |
| `ADMIN_SECRET` | Secret passphrase for admin registration | `myAdminKey123` |
| `JWT_EXPIRES_IN` | Token expiry duration | `1d` |
| `PORT` | Backend port | `3001` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |

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
| GET | `/api/tasks` | Private | List tasks (filtered by role) |
| POST | `/api/tasks` | Admin | Create task |
| PUT | `/api/tasks/:id` | Admin | Update task |
| DELETE | `/api/tasks/:id` | Admin | Delete task |
| PATCH | `/api/tasks/:id/status` | Private | Update task status (owner or admin) |

Query params: `?project=`, `?tag=`, `?assignedTo=`

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
| POST | `/api/projects` | Admin | Create project |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |

### Reports
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/reports/summary` | Private | Grouped summary (task/user/project) |
| GET | `/api/reports/detailed` | Private | Raw time entry list |
| GET | `/api/reports/billing` | Private | Billing totals and earned amount |

Query params: `?from=`, `?to=`, `?groupBy=`, `?userId=`, `?projectId=`

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Private | List all users |
| PUT | `/api/users/:id/rate` | Admin | Set user hourly rate |

---

## Deployment (Google App Engine)

```bash
# 1. Build the React frontend
npm run build

# 2. Deploy to App Engine
npm run deploy
# (runs: npm run build && gcloud app deploy --quiet)
```

The Express server serves the React `dist/` as static files and handles all `/api/*` routes. Everything runs on a single App Engine instance.

**Important before deploying:**
- Set all environment variables via `gcloud app deploy` env vars or Secret Manager — never commit secrets to `app.yaml`
- Set `CLIENT_URL` to your App Engine URL (e.g. `https://your-project.ew.r.appspot.com`)
- Ensure your MongoDB Atlas cluster allows connections from App Engine IPs (or allow all: `0.0.0.0/0`)

---

## Project Structure

```
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # Route logic
│   ├── middleware/auth.js        # JWT verify + requireAdmin
│   ├── models/                   # Mongoose schemas
│   └── routes/                   # Express routers
├── public/
│   └── admin/                    # Vanilla JS admin panel
├── src/
│   ├── components/               # React components
│   ├── contexts/                 # AuthContext, TimerContext
│   └── pages/                    # Dashboard, Timesheet, Analytics, Help, Login, Register
├── app.yaml                      # App Engine config
├── package.json
└── vite.config.js
```
