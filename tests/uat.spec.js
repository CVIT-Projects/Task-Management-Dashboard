import { test, expect } from '@playwright/test';

// Configuration
const ADMIN_SECRET = 'admin123';
const STAMP = Date.now();
const ADMIN_NAME = `Admin ${STAMP}`;
const USER_NAME = `User ${STAMP}`;
const ADMIN_EMAIL = `admin-${STAMP}@uat.com`;
const USER_EMAIL = `user-${STAMP}@uat.com`;
const TEST_PASS = 'Password123!';

test.describe.configure({ mode: 'serial' });

test.describe('Task Management Dashboard - Full 9-Section UAT Suite', () => {
    
    test('1. Admin Registration', async ({ page }) => {
        await page.goto('/register', { waitUntil: 'networkidle' });
        await page.locator('#name').fill(ADMIN_NAME);
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.fill('#adminSecret', ADMIN_SECRET);
        await page.click('button.auth-submit-btn');
        await expect(page).toHaveURL('/');
        await expect(page.locator('a.admin-link-btn[href="/admin/"]')).toBeVisible();
    });

    test('2. Standard User Registration', async ({ page }) => {
        await page.goto('/register', { waitUntil: 'networkidle' });
        await page.locator('#name').fill(USER_NAME);
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        await expect(page).toHaveURL('/');
        await expect(page.locator('a.admin-link-btn[href="/admin/"]')).not.toBeVisible();
    });

    test('3. IDOR Protection Verification', async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');

        await page.goto('/admin/');
        await page.waitForSelector('#taskName');
        await page.fill('#taskName', `IDOR Test Task ${STAMP}`);
        // Assign to self (Admin)
        await page.selectOption('#assignedTo', { label: new RegExp(ADMIN_NAME) });
        await page.click('#task-form button[type="submit"]');
        
        await page.waitForSelector(`button.delete-btn[data-task-id]`);
        const deleteBtn = page.locator('button.delete-btn').first();
        const taskId = await deleteBtn.getAttribute('data-task-id');
        console.log(`Created Task ID: ${taskId}`);

        // Login as Regular User
        await page.goto('/');
        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');

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

    test('4. Session Persistence', async ({ page }) => {
        await page.goto('/');
        await page.reload();
        await expect(page.locator('.logout-btn')).toBeVisible();
    });

    test('5. Task Dashboard View & Filter', async ({ page }) => {
        await page.goto('/');
        await page.click('button:has-text("Kanban")');
        await expect(page.locator('.kanban-column:has-text("Not Started")')).toBeVisible();
    });

    test('6. Task Deletion & Cascading Clean', async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        
        await page.goto('/admin/');
        const taskName = `Delete Task ${STAMP}`;
        await page.fill('#taskName', taskName);
        await page.selectOption('#assignedTo', { label: new RegExp(USER_NAME) });
        await page.click('#task-form button[type="submit"]');

        await page.waitForSelector(`div.task-card:has-text("${taskName}")`);
        const taskId = await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).getAttribute('data-task-id');
        
        // Delete
        await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).click();
        await page.click('#modalOverlay button:has-text("Delete")'); // Confirm modal
        
        await expect(page.locator(`div.task-card:has-text("${taskName}")`)).not.toBeVisible();
    });

    test('7. Time Tracking & 60s performance', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');

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

    test('8. Deadline Overdue Lockout', async ({ page }) => {
        // Admin creates overdue task
        await page.goto('/login');
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        await page.goto('/admin/');
        
        const past = new Date(Date.now() - 3600000).toISOString().slice(0, 16);
        await page.fill('#taskName', `Locked Task ${STAMP}`);
        await page.fill('#deadline', past);
        await page.selectOption('#assignedTo', { label: new RegExp(USER_NAME) });
        await page.click('#task-form button[type="submit"]');

        // User checks lockout
        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        
        const card = page.locator(`.task-card:has-text("Locked Task")`);
        await expect(card.locator('button:has-text("🔒")')).toBeVisible();
    });

    test('9. Timesheet Submission & Admin Approval', async ({ page }) => {
        await page.goto('/timesheet');
        await page.click('button:has-text("Submit for Approval")');
        await expect(page.locator('.submission-status-badge')).toContainText('Pending');

        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        
        await page.goto('/timesheet');
        await page.click('.approve-btn');
        await expect(page.locator('.approve-btn')).not.toBeVisible();
    });

    test('10. Analytics Export', async ({ page }) => {
        await page.goto('/analytics');
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export CSV")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
    });

    test('11. Admin Onboarding', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.onboarding-banner')).toBeVisible();
    });

    test('12. Admin Tools: Project CRUD', async ({ page }) => {
        await page.goto('/admin/');
        await page.click('button:has-text("Projects")');
        await page.fill('#projName', `Project ${STAMP}`);
        await page.click('#project-form button[type="submit"]');
        await expect(page.locator('.task-card:has-text("Project ' + STAMP + '")')).toBeVisible();
    });

    test('13. Admin Tools: User Rates', async ({ page }) => {
        await page.goto('/admin/');
        await page.click('button:has-text("Users")');
        await page.click('.edit-btn');
        await page.fill('#hourlyRate', '185');
        await page.click('#submitBtn');
        await expect(page.locator('body')).toContainText('$ 185 / hr');
    });

    test('14. Admin Tools: Bulk Actions', async ({ page }) => {
        await page.goto('/admin/');
        
        // Create 2 tasks
        for (let i = 1; i <= 2; i++) {
            await page.fill('#taskName', `Bulk Task ${i} ${STAMP}`);
            await page.click('#task-form button[type="submit"]');
            await page.waitForTimeout(500);
        }

        // Select All
        await page.click('#selectAllTasks');
        await expect(page.locator('#bulkActionBar')).not.toHaveClass(/hidden/);
        await expect(page.locator('#selectedCount')).toHaveText('2');

        // Reassign (to self)
        await page.selectOption('#bulkAssignedTo', { label: new RegExp(ADMIN_NAME) });
        await page.click('button:has-text("Reassign")');
        
        await expect(page.locator('.toast.success')).toBeVisible();
        await expect(page.locator('#bulkActionBar')).toHaveClass(/hidden/);
    });

    test('15. Task Dependencies (Blocked By)', async ({ page }) => {
        await page.goto('/admin/');
        
        // 1. Create Blocker Task
        const blockerName = `Blocker Task ${STAMP}`;
        await page.fill('#taskName', blockerName);
        await page.click('#task-form button[type="submit"]');
        await page.waitForSelector(`div.task-card:has-text("${blockerName}")`);

        // 2. Create Blocked Task
        const blockedName = `Blocked Task ${STAMP}`;
        await page.fill('#taskName', blockedName);
        await page.selectOption('#assignedTo', { label: new RegExp(USER_NAME) });
        // Select the blocker in the multiple-select dropdown
        await page.selectOption('#blockedBy', { label: new RegExp(blockerName) });
        await page.click('#task-form button[type="submit"]');

        // 3. Login as User and check lockout
        await page.goto('/');
        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');

        const card = page.locator(`.task-card:has-text("${blockedName}")`);
        await expect(card.locator('.blocked-badge-main')).toBeVisible();
        await expect(card.locator('button:has-text("🚫 Blocked")')).toBeDisabled();

        // 4. Admin completes blocker
        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', ADMIN_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');
        
        await page.locator(`.task-card:has-text("${blockerName}") select`).selectOption('Completed');
        await page.waitForTimeout(1000);

        // 5. User check unblocked
        await page.click('.logout-btn');
        await page.goto('/login');
        await page.fill('#email', USER_EMAIL);
        await page.fill('#password', TEST_PASS);
        await page.click('button.auth-submit-btn');

        const unblockedCard = page.locator(`.task-card:has-text("${blockedName}")`);
        await expect(unblockedCard.locator('.blocked-badge-main')).not.toBeVisible();
        await expect(unblockedCard.locator('.timer-btn')).not.toBeDisabled();
    });

    test('16. Recurring Task Setup', async ({ page }) => {
        await page.goto('/admin/');
        
        const recurringName = `Recurring Task ${STAMP}`;
        await page.fill('#taskName', recurringName);
        await page.check('#recurringEnabled');
        await page.selectOption('#frequency', 'weekly');
        await page.click('#task-form button[type="submit"]');

        await page.waitForSelector(`div.task-card:has-text("${recurringName}")`);
        // Check for the repeating emoji indicator on the card
        await page.goto('/');
        await expect(page.locator(`.task-card:has-text("${recurringName}") .recurring-badge`)).toBeVisible();
    });
});
