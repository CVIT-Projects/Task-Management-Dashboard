# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: uat.spec.js >> Task Management Dashboard - Full 9-Section UAT Suite >> 3. IDOR Protection Verification
- Location: tests\uat.spec.js:37:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#taskName') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Sign in to Taskboard" [level=1] [ref=e6]
    - paragraph [ref=e7]: Welcome back! Please enter your details.
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: Email address
      - textbox "Email address" [ref=e11]:
        - /placeholder: you@example.com
    - generic [ref=e12]:
      - generic [ref=e13]: Password
      - textbox "Password" [ref=e14]:
        - /placeholder: ••••••••
    - button "Sign in" [ref=e15] [cursor=pointer]
  - generic [ref=e16]:
    - text: New to Taskboard?
    - link "Create an account" [ref=e17] [cursor=pointer]:
      - /url: /register
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Configuration
  4   | const ADMIN_SECRET = 'admin123';
  5   | const STAMP = Date.now();
  6   | const ADMIN_NAME = `Admin ${STAMP}`;
  7   | const USER_NAME = `User ${STAMP}`;
  8   | const ADMIN_EMAIL = `admin-${STAMP}@uat.com`;
  9   | const USER_EMAIL = `user-${STAMP}@uat.com`;
  10  | const TEST_PASS = 'Password123!';
  11  | 
  12  | test.describe.configure({ mode: 'serial' });
  13  | 
  14  | test.describe('Task Management Dashboard - Full 9-Section UAT Suite', () => {
  15  |     
  16  |     test('1. Admin Registration', async ({ page }) => {
  17  |         await page.goto('/register', { waitUntil: 'networkidle' });
  18  |         await page.locator('#name').fill(ADMIN_NAME);
  19  |         await page.fill('#email', ADMIN_EMAIL);
  20  |         await page.fill('#password', TEST_PASS);
  21  |         await page.fill('#adminSecret', ADMIN_SECRET);
  22  |         await page.click('button.auth-submit-btn');
  23  |         await expect(page).toHaveURL('/');
  24  |         await expect(page.locator('a.admin-link-btn[href="/admin/"]')).toBeVisible();
  25  |     });
  26  | 
  27  |     test('2. Standard User Registration', async ({ page }) => {
  28  |         await page.goto('/register', { waitUntil: 'networkidle' });
  29  |         await page.locator('#name').fill(USER_NAME);
  30  |         await page.fill('#email', USER_EMAIL);
  31  |         await page.fill('#password', TEST_PASS);
  32  |         await page.click('button.auth-submit-btn');
  33  |         await expect(page).toHaveURL('/');
  34  |         await expect(page.locator('a.admin-link-btn[href="/admin/"]')).not.toBeVisible();
  35  |     });
  36  | 
  37  |     test('3. IDOR Protection Verification', async ({ page }) => {
  38  |         // Login as Admin
  39  |         await page.goto('/login');
  40  |         await page.fill('#email', ADMIN_EMAIL);
  41  |         await page.fill('#password', TEST_PASS);
  42  |         await page.click('button.auth-submit-btn');
  43  | 
  44  |         await page.goto('/admin/');
> 45  |         await page.waitForSelector('#taskName');
      |                    ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  46  |         await page.fill('#taskName', `IDOR Test Task ${STAMP}`);
  47  |         // Assign to self (Admin)
  48  |         await page.selectOption('#assignedTo', { label: new RegExp(ADMIN_NAME) });
  49  |         await page.click('#task-form button[type="submit"]');
  50  |         
  51  |         await page.waitForSelector(`button.delete-btn[data-task-id]`);
  52  |         const deleteBtn = page.locator('button.delete-btn').first();
  53  |         const taskId = await deleteBtn.getAttribute('data-task-id');
  54  |         console.log(`Created Task ID: ${taskId}`);
  55  | 
  56  |         // Login as Regular User
  57  |         await page.goto('/');
  58  |         await page.click('.logout-btn');
  59  |         await page.goto('/login');
  60  |         await page.fill('#email', USER_EMAIL);
  61  |         await page.fill('#password', TEST_PASS);
  62  |         await page.click('button.auth-submit-btn');
  63  | 
  64  |         // Attempt access
  65  |         const status = await page.evaluate(async (id) => {
  66  |             const res = await fetch(`/api/tasks/${id}`, {
  67  |                 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
  68  |             });
  69  |             return res.status;
  70  |         }, taskId);
  71  |         
  72  |         console.log(`IDOR Access Status for user ${USER_NAME}: ${status}`);
  73  |         expect(status).toBe(403);
  74  |     });
  75  | 
  76  |     test('4. Session Persistence', async ({ page }) => {
  77  |         await page.goto('/');
  78  |         await page.reload();
  79  |         await expect(page.locator('.logout-btn')).toBeVisible();
  80  |     });
  81  | 
  82  |     test('5. Task Dashboard View & Filter', async ({ page }) => {
  83  |         await page.goto('/');
  84  |         await page.click('button:has-text("Kanban")');
  85  |         await expect(page.locator('.kanban-column:has-text("Not Started")')).toBeVisible();
  86  |     });
  87  | 
  88  |     test('6. Task Deletion & Cascading Clean', async ({ page }) => {
  89  |         // Login as Admin
  90  |         await page.goto('/login');
  91  |         await page.fill('#email', ADMIN_EMAIL);
  92  |         await page.fill('#password', TEST_PASS);
  93  |         await page.click('button.auth-submit-btn');
  94  |         
  95  |         await page.goto('/admin/');
  96  |         const taskName = `Delete Task ${STAMP}`;
  97  |         await page.fill('#taskName', taskName);
  98  |         await page.selectOption('#assignedTo', { label: new RegExp(USER_NAME) });
  99  |         await page.click('#task-form button[type="submit"]');
  100 | 
  101 |         await page.waitForSelector(`div.task-card:has-text("${taskName}")`);
  102 |         const taskId = await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).getAttribute('data-task-id');
  103 |         
  104 |         // Delete
  105 |         await page.locator(`div.task-card:has-text("${taskName}") .delete-btn`).click();
  106 |         await page.click('#modalOverlay button:has-text("Delete")'); // Confirm modal
  107 |         
  108 |         await expect(page.locator(`div.task-card:has-text("${taskName}")`)).not.toBeVisible();
  109 |     });
  110 | 
  111 |     test('7. Time Tracking & 60s performance', async ({ page }) => {
  112 |         await page.goto('/login');
  113 |         await page.fill('#email', USER_EMAIL);
  114 |         await page.fill('#password', TEST_PASS);
  115 |         await page.click('button.auth-submit-btn');
  116 | 
  117 |         const startBtn = page.locator('button:has-text("▶")').first();
  118 |         if (await startBtn.isVisible()) {
  119 |             await startBtn.click();
  120 |             const timer = page.locator('.timer-display').first();
  121 |             const val1 = await timer.textContent();
  122 |             await page.waitForTimeout(3000);
  123 |             const val2 = await timer.textContent();
  124 |             expect(val1).toBe(val2); // Should not update every second
  125 |         }
  126 |     });
  127 | 
  128 |     test('8. Deadline Overdue Lockout', async ({ page }) => {
  129 |         // Admin creates overdue task
  130 |         await page.goto('/login');
  131 |         await page.fill('#email', ADMIN_EMAIL);
  132 |         await page.fill('#password', TEST_PASS);
  133 |         await page.click('button.auth-submit-btn');
  134 |         await page.goto('/admin/');
  135 |         
  136 |         const past = new Date(Date.now() - 3600000).toISOString().slice(0, 16);
  137 |         await page.fill('#taskName', `Locked Task ${STAMP}`);
  138 |         await page.fill('#deadline', past);
  139 |         await page.selectOption('#assignedTo', { label: new RegExp(USER_NAME) });
  140 |         await page.click('#task-form button[type="submit"]');
  141 | 
  142 |         // User checks lockout
  143 |         await page.click('.logout-btn');
  144 |         await page.goto('/login');
  145 |         await page.fill('#email', USER_EMAIL);
```