import { test, expect } from '@playwright/test';

test.describe('Dorian D&D Sheet - HP and Resting Flow', () => {
  test('opens and closes Short Rest modal cleanly', async ({ page }) => {
    await page.goto('/');

    const shortRestBtn = page.locator('button', { hasText: 'Short Rest' });
    await expect(shortRestBtn).toBeVisible();
    await shortRestBtn.click();

    // Verify modal is visible
    const modal = page.locator('[x-show="modalShortRestOpen"]');
    await expect(modal).toBeVisible();

    // Verify modal title or heading
    await expect(modal.locator('text=Short Rest').first()).toBeVisible();

    // Cancel modal
    const cancelBtn = modal.locator('button', { hasText: 'Cancel' });
    await cancelBtn.click();

    // Modal should now be closed
    await expect(modal).not.toBeVisible();
  });

  test('vitals bar and HP manager modal operate correctly', async ({ page }) => {
    await page.goto('/');

    // 1. Verify HP widget is visible in the top vitals bar
    const hpWidget = page.locator('text=❤️ HP');
    await expect(hpWidget).toBeVisible();

    // 2. Open HP Manager modal
    const hpManagerBtn = page.locator('button', { hasText: 'Damage / Heal / Temp' });
    await expect(hpManagerBtn).toBeVisible();
    await hpManagerBtn.click();

    // 3. Verify modal is open
    const hpModal = page.locator('[x-show="modalHpManagerOpen"]');
    await expect(hpModal).toBeVisible();
    await expect(hpModal.locator('text=Damage / Heal Manager')).toBeVisible();

    // 4. Close HP Manager modal using close button
    const closeBtn = hpModal.locator('button', { hasText: '×' });
    await closeBtn.click();
    await expect(hpModal).not.toBeVisible();

    // 5. Verify Profile tab displays Armor Class, Initiative, and Speed stat cards
    const profileSection = page.locator('section[x-show*="activeTab === \'profile\'"]');
    await expect(profileSection.locator('text=Armor Class')).toBeVisible();
    await expect(profileSection.locator('text=Initiative')).toBeVisible();
    await expect(profileSection.locator('text=Speed')).toBeVisible();
  });
});
