# Task Management Dashboard - Official User Guide

## 1. Introduction
### Brief Overview
The Task Management Dashboard is a centralized, real-time application designed to streamline company workflows. It combines task delegation, deadline tracking, and an integrated session-based stopwatch directly into one unified interface.

### Purpose of the Application
The dashboard eliminates the need for external time-tracking software by natively combining task management (similar to Jira or Asana) with time management (similar to Clockify). This ensures accurate sprint planning, transparent billing, and strict accountability for deadlines.

### Target Users
*   **Admins (Project Managers/Leads):** Responsible for creating users, assigning tasks, setting deadlines, and tracking team-wide performance and timesheets.
*   **Normal Users (Employees/Contractors):** Responsible for picking up their assigned tasks, managing their active timers, and moving tasks through completion statuses.

---

## 2. Key Features
*   **Task Creation & Management:** Generate tasks with rich details including project association, estimated hours, and file attachments.
*   **Task Assignment:** Dynamically assign tasks to specific team members.
*   **Status Tracking (Interactive):** Move tasks through "Not Started", "In Progress", "Completed", and "Blocked" natively from the UI.
*   **Role-Based Access Control:** Strict separation of privileges preventing normal users from editing unassigned tasks or modifying global settings.
*   **Integrated Time Tracking:** A built-in stopwatch that logs time blocks securely to a backend database, automatically calculating total hour estimations versus reality.
*   **Automated Timesheets:** Weekly aggregation of all logged hours specifically broken down by task, Day-of-the-Week, and grand totals.

---

## 3. User Roles and Permissions

### The Admin Role
*   **Full Control:** Has access to the global dashboard and the dedicated Admin Portal.
*   **User Management:** Can create, edit, and delete employee accounts.
*   **Task Management:** Can create new tasks, assign them to anyone, and edit any task in the system.
*   **Visibility:** Can view tasks across the entire company, but is purposefully restricted from proactively starting timers on tasks managed by other employees (the timer is hidden for tasks not assigned to the Admin).

### The Normal User Role
*   **Limited Access:** Cannot access the Admin Portal or create new users.
*   **Task Isolation:** The dashboard will *only* display tasks explicitly assigned to them.
*   **Work Execution:** Empowered to start/stop their task timers and update the completion status of their own work.

---

## 4. Getting Started

### Login Process
1. Navigate to the application portal.
2. Enter your assigned Email Address and Password.
3. Upon successful authentication, the system will automatically route you to your designated dashboard based on your role.

### Dashboard Overview After Login
*   **Header Navigation:** Contains quick metrics (total tasks, polling status) and navigational links to your Timesheet or the Admin Panel (if authorized).
*   **Global Filters:** Allows you to filter your view by Project Name or Tags.
*   **View Switcher (NEW):** Toggle between the classic **List View** and the new **Kanban Board View** using the buttons at the top right of the dashboard.
*   **Task List / Board:** The main workspace listing all tasks. 

### Navigation Explanation
*   **📊 Dashboard Button:** Returns you to the main active task list.
*   **🕒 Timesheet Button:** Takes you to your weekly aggregated logged hours.
*   **⚙️ Admin Panel Button:** (Admins Only) Takes you to the data-entry portal to create users/tasks.
*   **Logout Button:** Securely ends your session.

---

## 5. Detailed Feature Guide

### Creating a Task (Admin Only)
*   **What it does:** Generates a new piece of work for the team.
*   **Where to find it:** Click `⚙️ Admin Panel` -> `Tasks` tab.
*   **Steps:** 
    1. Fill in the Task Name, description, and deadline. 
    2. Select the assigned user from the dropdown. 
    3. Click `Add Task`.

### Editing/Deleting a Task (Admin Only)
*   **What it does:** Modifies parameters of an existing task or permanently removes it.
*   **Where to find it:** Inside the `⚙️ Admin Panel` under the active task lists grid.
*   **Steps:** Click the `Edit` button next to a task to modify its parameters, or the `Delete` button to permanently erase it from the system.

### Assigning Tasks (Admin Only)
*   **What it does:** Hands off a task to a designated teammate.
*   **Where to find it:** Inside the `⚙️ Admin Panel` (Same as Creating a Task).
*   **Steps:** When editing or creating a task, select the "Assigned To" dropdown and choose a registered user.

### Updating Task Status (Normal User or Admin)
*   **What it does:** Communicates the current phase of the task.
*   **Where to find it:** On the Dashboard, inside the specific Task Row, look for the colored badge.
*   **Steps:** 
    1. Click the current status badge (e.g., "Not Started"). 
    2. A dropdown will appear. Select the new status (e.g., "In Progress").
    *Note: The status also auto-updates from "Not Started" to "In Progress" the very first time you hit Play!*
    *Note: When a status is marked "Completed", the exact time is automatically captured and the task is immediately sealed off to prevent further time logging.*

### Viewing Dashboard Insights
*   **What it does:** Shows high-level project trajectory metrics and estimate burndown.
*   **Where to find it:** By observing the Green Progress Bar (`Estimate Labels`) above task names.
*   **Explanation:** When tracking time, the bar fills up. If actual logged hours outpace the original estimate assigned by the Admin, the bar turns Red.

### Switching to Kanban View
*   **What it does:** Organizes your tasks into visual columns based on their status.
*   **Where to find it:** Top right of the Dashboard, click the `Kanban Board` button.
*   **Explanation:** This view is best for visualizing your progress. Each column (Not Started, In Progress, Blocked, Completed) shows cards for your assigned tasks. You can still update statuses and start timers directly from the cards.

### Live Deadline Reminders
*   **What it does:** Alerts you when a task is due within 24 hours.
*   **Visual Indicator:** A pulsing amber badge appears on the task saying `Due in Xh Ym`.
*   **Proactive Alerts:** You will also receive an in-app notification every hour for tasks approaching their deadline. Check the 🔔 bell icon in the navbar.
*   **Real-time sync:** The "Time Left" indicator updates every minute automatically.

---

## 6. Button and UI Element Explanation

*   **▶ Start Timer:** Initiates a new time-tracking block for a task.
*   **⏹ Stop [Time]:** Halts the active timer and saves the recorded duration to the database.
*   **Add Task:** Stores the filled form into the system as a brand new task.
*   **Edit / Save:** Adjusts existing system entries.
*   **Delete:** Permanently destroys a record.
*   **Status Dropdown:** (The colored pill badge). Click this to manually transition a task to Completed, Blocked, or In Progress.
*   **🔒 Deadline Passed:** A visual lock indicating that a task has missed its due date and can no longer be tracked or edited.
*   **⏳ Due in Xh Ym:** A pulsing amber badge indicating a deadline is approaching within 24 hours.
*   **✔ Completed:** A greyed-out button indicating the task is done and no further time tracking is permitted.
*   **🔔 Notification Bell:** Located in the navbar; shows a red dot when you have new deadline reminders. Click to see live countdowns for each task.

---

## 7. Admin Workflow (End-to-End)

1. **Login:** Admin logs into the system securely.
2. **Create Users:** Goes to the Admin Panel and ensures the necessary contractors have accounts under the "Users" tab.
3. **Assign Tasks:** Creates 5 new tasks, attaches spec files, sets estimated hours, assigns them to the contractors, and sets a strict deadline.
4. **Monitor Progress:** Returns to the Main Dashboard to watch the Status badges dynamically shift as contractors begin working across the globe.
5. **Generate Insights:** Evaluates the `Timesheet` page at the end of the week, switching the view to different team members to approve or reject their logged hours, checking if timelines were met.

---

## 8. User Workflow (End-to-End)

1. **Login:** User authenticates and is greeted by *only* the tasks explicitly assigned to them.
2. **Review:** User clicks the `⬇ Download` button to read the task instructions and specifications provided by the Admin.
3. **Start Work:** User clicks `▶ Start Timer`. The task auto-promotes to "In Progress."
4. **Pause:** User takes lunch, clicking `⏹ Stop Timer`. The accumulated hours are seamlessly logged.
5. **Complete Work:** User finishes the work, changes the Status Dropdown to "Completed". The timer button locks down to prevent accidental clicks, and the exact completion time is stamped permanently for the Admin to see!

---

## 9. Best Practices

### Do's
*   **Do** stop your timer when going on a long break or taking a phone call. The system is designed for highly accurate, session-based intervals!
*   **Do** rely on the green "Estimated Hours" bar to gauge if you are taking too long on an assignment.
*   **Do** change your task strictly to "Blocked" if you are waiting on external dependencies, so the Admin knows exactly why the timer hasn't been running.

### Don'ts
*   **Don't** leave tasks running over the deadline! If the deadline crosses while your timer is running, the system will forcefully stop your timer and lock you completely out of the task. Keep track of your deadlines!
*   **Don't** mark a task as "Completed" until it is genuinely 100% finished. Doing so instantly stamps the official End Time for managerial tracking.

---

## 10. Conclusion

By strictly linking time-tracking directly to the assignment status, the Task Management Dashboard removes the friction of maintaining separate timesheet spreadsheets. For employees, it provides a distraction-free, isolated view of exactly what needs to be accomplished today. For management, it natively enforces hard deadlines, accurately visualizes estimated time burndown, and guarantees completely accurate weekly hour logs!
