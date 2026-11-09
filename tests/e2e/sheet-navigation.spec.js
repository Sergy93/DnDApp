import { test, expect } from '@playwright/test';

test.describe('Dorian D&D Sheet - Navigation and Layout', () => {
  test('loads character sheet and displays primary character identity', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Verify main app title and character heading is visible
    await expect(page.locator('body')).toBeVisible();
    const characterHeading = page.locator('h1[x-text*="data.identity?.name"]');
    await expect(characterHeading).toBeVisible();
    await expect(characterHeading).toHaveText(/Dorian/);

    // Verify no unhandled JavaScript runtime exceptions occurred during initial load
    const jsRuntimeErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('Failed to load resource') &&
      !e.includes('status of 500')
    );
    expect(jsRuntimeErrors).toHaveLength(0);
  });

  test('switches between all 5 navigation tabs smoothly', async ({ page }) => {
    await page.goto('/');

    // 1. Profile tab (default)
    const profileSection = page.locator('section[x-show*="activeTab === \'profile\'"]');
    await expect(profileSection).toBeVisible();

    // 2. Combat & Magic tab
    const combatBtn = page.locator('button', { hasText: 'Combat & Magic' });
    await combatBtn.click();
    const combatSection = page.locator('section[x-show*="activeTab === \'combat\'"]');
    await expect(combatSection).toBeVisible();
    await expect(profileSection).not.toBeVisible();

    // 3. Inventory tab
    const invBtn = page.locator('button', { hasText: 'Inventory' });
    await invBtn.click();
    const invSection = page.locator('section[x-show*="activeTab === \'inventory\'"]');
    await expect(invSection).toBeVisible();
    await expect(combatSection).not.toBeVisible();

    // 4. Classes progression tab
    const classesBtn = page.locator('button', { hasText: 'Classes' });
    await classesBtn.click();
    const progSection = page.locator('section[x-show*="activeTab === \'progression\'"]');
    await expect(progSection).toBeVisible();
    await expect(invSection).not.toBeVisible();

    // 5. Quests & Story tab
    const questsBtn = page.locator('button', { hasText: 'Quests' });
    await questsBtn.click();
    const questsSection = page.locator('section[x-show*="activeTab === \'quests\'"]');
    await expect(questsSection).toBeVisible();
    await expect(progSection).not.toBeVisible();

    // Return to Profile
    const profileBtn = page.locator('button', { hasText: 'Profile' });
    await profileBtn.click();
    await expect(profileSection).toBeVisible();
  });
});
