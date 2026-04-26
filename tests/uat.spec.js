import { test, expect } from '@playwright/test';

// Configuration
const ADMIN_SECRET = 'AdminSecret2026';
const STAMP = Date.now();
const ADMIN_NAME = `Admin ${STAMP}`;
const USER_NAME = `User ${STAMP}`;
const ADMIN_EMAIL = `admin-${STAMP}@uat.com`;
const USER_EMAIL = `user-${STAMP}@uat.com`;
const TEST_PASS = 'Password123!';

// Resilient selector: picks the <option> whose visible text contains `partialLabel`,
// regardless of any suffix (email, ID, etc.) appended by the UI. Avoids brittle
// exact-match failures when option text format changes.
async function selectByPartialLabel(page, selectSelector, partialLabel) {
    const value = await page
        .locator(`${selectSelector} option`, { hasText: partialLabel })
        .first()
        .getAttribute('value');
    await page.selectOption(selectSelector, value);
}

// Fills the three required scheduling fields the admin form validates before submit.
// Callers can override `deadline` (e.g. to create an overdue task for the lockout test).
async function fillRequiredTaskFields(page, { deadline } = {}) {
    const toLocal = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    await page.fill('#startDateTime', toLocal(new Date()));
    await page.fill('#deadline', deadline ?? toLocal(new Date(Date.now() + 3600_000)));
    await page.selectOption('#priority', 'Medium');
}

// Login and Register pages auto-redirect to "/" when a token is present. In a
// shared-context suite the token from a prior test leaks in, so we clear it
// before navigating to either auth screen.
async function clearAuth(page) {
    try {
        await page.evaluate(() => localStorage.clear());
    } catch {
        // No URL context yet (first run) — ignore.
    }
}

async function loginAs(page, email, password) {
    await clearAuth(page);
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await Promise.all([
        page.waitForURL('/'),
        page.click('button.auth-submit-btn')
    ]);
}

test.describe.configure({ mode: 'serial' });

test.describe('Task Management Dashboard - Full 9-Section UAT Suite', () => {
    // Shared browser context/page across all tests in this serial suite so auth
    // state (localStorage token, cookies) persists between tests — many tests
    // intentionally rely on a session established by an earlier test.
    // Playwright's per-test fixture teardown closes anything created in `beforeAll`,
    // so instead we lazily (re)create a single context/page and share them.
    let sharedContext;
    let page;

    async function getSharedPage(browser) {
        if (!sharedContext || !page || page.isClosed()) {
            sharedContext = await browser.newContext();
            page = await sharedContext.newPage();
        }
        return page;
    }

    
    test('1. Admin Registration', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/register', { waitUntil: 'networkidle' });
        await page.locator('#name').fill(ADMIN_NAME);
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.fill('#adminSecret', ADMIN_SECRET);
        await Promise.all([
            page.waitForURL('/'),
            page.click('button.auth-submit-btn')
        ]);
        await expect(page.locator('a.admin-link-btn[href="/admin/"]')).toBeVisible();
    });

    test('2. Standard User Registration', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await clearAuth(page);
        await page.goto('/register', { waitUntil: 'networkidle' });
        await page.locator('#name').fill(USER_NAME);
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await Promise.all([
            page.waitForURL('/'),
            page.click('button.auth-submit-btn')
        ]);
        await expect(page.locator('a.admin-link-btn[href="/admin/"]')).not.toBeVisible();
    });

    test('3. IDOR Protection Verification', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await loginAs(page, ADMIN_EMAIL, TEST_PASS);
        await page.goto('/admin/');
        await page.waitForSelector('#taskName');
        await page.fill('#taskName', `IDOR Test Task ${STAMP}`);
        // Assign to self (Admin)
        await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');
        
        await page.waitForSelector(`button.delete-btn[data-task-id]`);
        const deleteBtn = page.locator('button.delete-btn').first();
        const taskId = await deleteBtn.getAttribute('data-task-id');
        console.log(`Created Task ID: ${taskId}`);

        // Login as Regular User
        await loginAs(page, USER_EMAIL, TEST_PASS);

        // Attempt access
        const status = await page.evaluate(async (id) => {
            const res = await fetch(`/api/tasks/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            return res.status;
        }, taskId);
        
        console.log(`IDOR Access Status for user ${USER_NAME}: ${status}`);
        expect(status).toBe(403);
    });

    test('4. Session Persistence', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/');
        await page.reload();
        await expect(page.locator('.logout-btn')).toBeVisible();
    });

    test('5. Task Dashboard View & Filter', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/');
        await page.click('button:has-text("Kanban")');
        await expect(page.locator('.kanban-column:has-text("Not Started")')).toBeVisible();
    });

    test('6. Task Deletion & Cascading Clean', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await loginAs(page, ADMIN_EMAIL, TEST_PASS);
        await page.goto('/admin/');
        const taskName = `Delete Task ${STAMP}`;
        await page.fill('#taskName', taskName);
        await selectByPartialLabel(page, '#assignedTo', USER_NAME);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');

        await page.waitForSelector(`div.task-card:has-text("${taskName}")`);
        const taskId = await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).getAttribute('data-task-id');
        
        // Delete
        await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).click();
        await page.click('#modalOverlay button:has-text("Delete")'); // Confirm modal
        
        await expect(page.locator(`div.task-card:has-text("${taskName}")`)).not.toBeVisible();
    });

    test('7. Time Tracking & 60s performance', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await loginAs(page, USER_EMAIL, TEST_PASS);

        const startBtn = page.locator('button:has-text("▶")').first();
        if (await startBtn.isVisible()) {
            await startBtn.click();
            const timer = page.locator('.timer-display').first();
            const val1 = await timer.textContent();
            await page.waitForTimeout(3000);
            const val2 = await timer.textContent();
            expect(val1).toBe(val2); // Should not update every second
        }
    });

    test('8. Deadline Overdue Lockout', async ({ browser }) => {
        const page = await getSharedPage(browser);
        // Admin creates overdue task
        await loginAs(page, ADMIN_EMAIL, TEST_PASS);
        await page.goto('/admin/');

        const toLocal = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const pastDeadline = toLocal(new Date(Date.now() - 3600000));
        await page.fill('#taskName', `Locked Task ${STAMP}`);
        await selectByPartialLabel(page, '#assignedTo', USER_NAME);
        await fillRequiredTaskFields(page, { deadline: pastDeadline });
        await page.click('#taskForm button[type="submit"]');

        // User checks lockout
        await loginAs(page, USER_EMAIL, TEST_PASS);

        const card = page.locator(`.task-row:has-text("Locked Task")`);
        await expect(card.locator('button:has-text("🔒")')).toBeVisible();
    });

    test('9. Timesheet Submission & Admin Approval', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/timesheet');
        await page.click('button:has-text("Submit for Approval")');
        await expect(page.locator('.submission-status-badge')).toContainText('Pending');

        await loginAs(page, ADMIN_EMAIL, TEST_PASS);

        await page.goto('/timesheet');
        await page.click('.approve-btn');
        await expect(page.locator('.approve-btn')).not.toBeVisible();
    });

    test('10. Analytics Export', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/analytics');
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export CSV")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
    });

    test('11. Admin Onboarding', async ({ browser }) => {
        const page = await getSharedPage(browser);
        // The onboarding banner auto-hides once the admin has projects AND tasks,
        // so after a few test runs (projects persist in Mongo) the banner won't show.
        // Delete all projects via API to guarantee the "fresh admin" state the test covers.
        await page.evaluate(async () => {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
            const projects = res.ok ? await res.json() : [];
            for (const p of projects) {
                await fetch(`/api/projects/${p.id || p._id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        });
        await page.goto('/');
        await expect(page.locator('.onboarding-banner')).toBeVisible();
    });

    test('12. Admin Tools: Project CRUD', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/projects.html');
        await page.fill('#name', `Project ${STAMP}`);
        await page.click('#projectForm button[type="submit"]');
        await expect(page.locator('.task-card:has-text("Project ' + STAMP + '")')).toBeVisible();
    });

    test('13. Admin Tools: User Rates', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/users.html');
        await page.locator('.edit-btn').first().click();
        await page.fill('#hourlyRate', '185');
        await page.click('#submitBtn');
        await expect(page.locator('body')).toContainText('$ 185 / hr');
    });

    test('14. Admin Tools: Bulk Actions', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/');
        
        // Create 2 tasks
        for (let i = 1; i <= 2; i++) {
            await page.fill('#taskName', `Bulk Task ${i} ${STAMP}`);
            await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
            await fillRequiredTaskFields(page);
            await page.click('#taskForm button[type="submit"]');
            await page.waitForTimeout(500);
        }

        // Select All — shared DB with prior tests means count isn't just the 2 we created;
        // verify the bar appears and the counter shows *some* positive number.
        await page.click('#selectAllTasks');
        await expect(page.locator('#bulkActionBar')).not.toHaveClass(/hidden/);
        await expect(page.locator('#selectedCount')).toHaveText(/^\d+$/);

        // Reassign (to self)
        await selectByPartialLabel(page, '#bulkAssignedTo', ADMIN_NAME);
        await page.click('button:has-text("Reassign")');
        
        await expect(page.locator('.toast.success')).toBeVisible();
        await expect(page.locator('#bulkActionBar')).toHaveClass(/hidden/);
    });

    test('15. Task Dependencies (Blocked By)', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/');
        
        // 1. Create Blocker Task
        const blockerName = `Blocker Task ${STAMP}`;
        await page.fill('#taskName', blockerName);
        await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');
        await page.waitForSelector(`div.task-card:has-text("${blockerName}")`);

        // 2. Create Blocked Task
        const blockedName = `Blocked Task ${STAMP}`;
        await page.fill('#taskName', blockedName);
        await selectByPartialLabel(page, '#assignedTo', USER_NAME);
        // Select the blocker in the multiple-select dropdown
        await selectByPartialLabel(page, '#blockedBy', blockerName);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');

        // 3. Login as User and check lockout
        await loginAs(page, USER_EMAIL, TEST_PASS);

        const card = page.locator(`.task-row:has-text("${blockedName}")`);
        await expect(card.locator('.blocked-badge-main')).toBeVisible();
        await expect(card.locator('button:has-text("🚫 Blocked")')).toBeDisabled();

        // 4. Admin completes blocker — admin-owned tasks show an inline status dropdown
        // on the user-facing dashboard. Match by exact task-name text, since the blocked
        // task row also contains the blocker's name in its "blocked by" tooltip.
        await loginAs(page, ADMIN_EMAIL, TEST_PASS);
        await page.locator(`.task-row:has(.task-name:text-is("${blockerName}")) select.status-chip`).selectOption('Completed');
        await page.waitForTimeout(1000);

        // 5. User check unblocked
        await loginAs(page, USER_EMAIL, TEST_PASS);

        const unblockedCard = page.locator(`.task-row:has-text("${blockedName}")`);
        await expect(unblockedCard.locator('.blocked-badge-main')).not.toBeVisible();
        await expect(unblockedCard.locator('.timer-btn')).not.toBeDisabled();
    });

    test('16. Recurring Task Setup', async ({ browser }) => {
        const page = await getSharedPage(browser);
        // Test 15 leaves us as USER; admin is needed to access /admin/.
        await loginAs(page, ADMIN_EMAIL, TEST_PASS);
        await page.goto('/admin/');

        const recurringName = `Recurring Task ${STAMP}`;
        await page.fill('#taskName', recurringName);
        await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
        await fillRequiredTaskFields(page);
        await page.check('#recurringEnabled');
        await page.selectOption('#frequency', 'weekly');
        await page.click('#taskForm button[type="submit"]');

        await page.waitForSelector(`div.task-card:has-text("${recurringName}")`);
        // Check for the repeating emoji indicator on the dashboard (task-row, not task-card)
        await page.goto('/');
        await expect(page.locator(`.task-row:has(.task-name:text-is("${recurringName}")) .recurring-badge`)).toBeVisible();
    });

    // Coverage for the features merged into Staging in PRs #113–#119 plus the
    // theme + targeted-WebSocket fixes. Each test starts from the state left
    // by the prior one (admin, on dashboard) and re-logs in only when needed.

    test('17. Theme Toggle persistence + cross-tab sync', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/');
        // Both the theme button and notification bell share .bell-btn — disambiguate by title.
        const themeBtn = page.locator('button.bell-btn[title="Toggle Theme"]');
        const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
        const opposite = initial === 'dark' ? 'light' : 'dark';

        await themeBtn.click();
        await expect.poll(
            () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))
        ).toBe(opposite);
        const stored = await page.evaluate(() => localStorage.getItem('theme'));
        expect(stored).toBe(opposite);

        // Reload — theme must persist.
        await page.reload();
        await expect.poll(
            () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))
        ).toBe(opposite);

        // Toggle back so subsequent tests start from the original state.
        await page.locator('button.bell-btn[title="Toggle Theme"]').click();
        await expect.poll(
            () => page.evaluate(() => document.documentElement.getAttribute('data-theme'))
        ).toBe(initial);
    });

    test('18. Productivity Report (admin Analytics tab)', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/analytics');
        // Admin-only tab switcher renders Analytics + Productivity buttons.
        const prodTab = page.locator('button.tab-btn:has-text("Productivity")');
        await expect(prodTab).toBeVisible();
        await prodTab.click();

        await expect(page.locator('h3:has-text("Team Productivity Report")')).toBeVisible();
        // Headers from the productivity table — proves the schema rendered, not just the heading.
        for (const header of ['Total Hours', 'Billable %', 'On-Time Rate']) {
            await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
        }
        // Export-CSV button on the productivity tab triggers a download.
        const downloadPromise = page.waitForEvent('download');
        await page.locator('section.report-table-section button.export-btn').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('Productivity_Report');
    });

    test('19. Project Budget fields persist on create', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/projects.html');
        const projectName = `Budget Project ${STAMP}`;
        await page.fill('#name', projectName);
        await page.fill('#budgetHours', '40');
        await page.fill('#budgetAmount', '5000');
        await page.click('#projectForm button[type="submit"]');

        // Project card appears in the list — confirms the create succeeded with the new fields.
        await expect(page.locator(`.task-card:has-text("${projectName}")`)).toBeVisible();
        // Verify the backend round-trip exposed the budget on the project resource.
        const budget = await page.evaluate(async (name) => {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
            const projects = await res.json();
            const match = projects.find(p => p.name === name);
            return match ? { hours: match.budgetHours, amount: match.budgetAmount } : null;
        }, projectName);
        expect(budget).toEqual({ hours: 40, amount: 5000 });
    });

    test('20. Audit Log lists recent admin actions', async ({ browser }) => {
        const page = await getSharedPage(browser);
        await page.goto('/admin/audit.html');
        // Filter / table chrome must render — no JS error.
        await expect(page.locator('#filterAction')).toBeVisible();
        await expect(page.locator('table.audit-table')).toBeVisible();
        // The earlier tests created tasks/projects, so #auditList should populate
        // with at least one row referencing one of those actions.
        await expect.poll(
            () => page.locator('#auditList tr').count(),
            { timeout: 5000 }
        ).toBeGreaterThan(0);
    });

    test('21. Notifications: Mark All Read clears unread count', async ({ browser }) => {
        const page = await getSharedPage(browser);
        // Generate a fresh task_assigned notification (admin → admin) so we
        // are not relying on stale notifications from earlier tests.
        await page.goto('/admin/');
        const notifTaskName = `Notif Task ${STAMP}`;
        await page.fill('#taskName', notifTaskName);
        await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');
        await page.waitForTimeout(800);

        await page.goto('/');
        // Force a fetch of /api/notifications by opening + closing the bell.
        const bell = page.locator('button.bell-btn[title="Notifications"]');
        await bell.click();
        const dropdown = page.locator('.notification-dropdown');
        await expect(dropdown).toBeVisible();

        const markAll = dropdown.locator('.mark-all-read-btn');
        await expect(markAll).toBeVisible();
        await markAll.click();

        // Optimistic state should remove unread items from the dropdown immediately.
        await expect(dropdown.locator('.notification-item.unread')).toHaveCount(0);
        // Bell badge is rendered only when unreadCount > 0.
        await expect(page.locator('.unread-badge')).toHaveCount(0);
    });

    test('22. Clickable Notification highlights its task on Dashboard', async ({ browser }) => {
        const page = await getSharedPage(browser);
        // Create a fresh task so we know exactly which row should light up.
        await page.goto('/admin/');
        const clickableName = `Clickable Task ${STAMP}`;
        await page.fill('#taskName', clickableName);
        await selectByPartialLabel(page, '#assignedTo', ADMIN_NAME);
        await fillRequiredTaskFields(page);
        await page.click('#taskForm button[type="submit"]');
        await page.waitForTimeout(800);

        await page.goto('/');
        const bell = page.locator('button.bell-btn[title="Notifications"]');
        await bell.click();
        const dropdown = page.locator('.notification-dropdown');
        await expect(dropdown).toBeVisible();

        // The most recent notification is the one we just generated. Click it.
        const notif = dropdown.locator(`.notification-item:has-text("${clickableName}")`).first();
        await expect(notif).toBeVisible();
        await notif.click();

        // Dropdown closes and the corresponding task row picks up the highlight class.
        await expect(dropdown).not.toBeVisible();
        await expect(
            page.locator(`.task-row:has(.task-name:text-is("${clickableName}")).highlight-glow`)
        ).toBeVisible({ timeout: 4000 });
    });
});
