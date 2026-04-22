# 📋 User Acceptance Testing (UAT) Checklist
**Project:** Task Management Dashboard

This document serves as the final verification checklist for all features implemented in the `main` branch. Use these test cases to verify the system meets all business and security requirements.

---

## 1. Authentication & Security
- [ ] **Admin Registration**: Register with the `ADMIN_SECRET`. Verify the user has access to the `/admin/` portal.
- [ ] **Standard Registration**: Register without the secret. Verify the user **cannot** access the `/admin/` portal.
- [ ] **IDOR Protection**: Log in as a Regular User. Try to access `GET /api/tasks/<someone-elses-task-id>` via browser console. Verify a `403 Forbidden` is returned.
- [ ] **Session Persistence**: Log in, refresh the page, and verify the user remains authenticated.

## 2. Task Dashboard (View & Organization)
- [ ] **View Switcher**: Toggle between **List View** and **Kanban Board**. Verify all tasks are present in both.
- [ ] **Kanban Columns**: Verify tasks are correctly categorized into NOT STARTED, IN PROGRESS, BLOCKED, and COMPLETED columns.
- [ ] **Global Search**: Search by task name. Verify results update in real-time.
- [ ] **Filters**: Apply Project and Tag filters. Verify the task list reflects the selection correctly.

## 3. Task Lifecycle (Admin)
- [ ] **Task Creation**: Create a task with an attachment and a specific project. Verify it appears on the assigned user's dashboard.
- [ ] **Assignment Notification**: Verify the assigned user receives a 🔔 notification for the new task.
- [ ] **Task Deletion (Cascading)**: Delete a task. Verify all associated **Notifications**, **Comments**, and **Time Entries** are wiped from the database (no orphaned data).

## 4. Time Tracking & Performance
- [ ] **Stopwatch Sync**: Start a timer. Verify the task status auto-updates to "In Progress."
- [ ] **Singleton Timer**: Start a timer on Task A, then start one on Task B. Verify Task A's timer stops automatically.
- [ ] **60s Performance Check**: Observe the countdown timer. Verify it updates every 60 seconds (not every second) to save system resources.
- [ ] **Manual Entry**: Add a manual time entry. Verify the total "Logged Hours" and earned amount update correctly.

## 5. Deadline System
- [ ] **Pulsing Badge**: Create a task due within 24 hours. Verify the amber `Due in Xh Ym` badge pulses on the card.
- [ ] **Overdue Lockout**: Set a task's deadline to 1 minute ago. Verify the timer button is locked and a 🔒 icon appears.
- [ ] **Notification Live Timer**: Open the notification dropdown. Verify the "Time Left" indicator is ticking in real-time.

## 6. Timesheets & Approval
- [ ] **Weekly Submission**: Log hours throughout the week and click **Submit for Approval**.
- [ ] **Admin Queue**: Log in as Admin. Verify the submitted timesheet appears in the **Pending Approvals** list.
- [ ] **Rejection Flow**: Reject a timesheet with a note. Verify the regular user sees the "Rejected" status and the admin's feedback.

## 7. Analytics & Reporting
- [ ] **Dynamic Charts**: Log billable and non-billable hours. Verify the Pie Chart reflects the correct distribution.
- [ ] **CSV Export**: Click the Export button. Verify the downloaded file contains accurate time entry logs.

---
**Status:** All tests must be marked [x] before final deployment.
