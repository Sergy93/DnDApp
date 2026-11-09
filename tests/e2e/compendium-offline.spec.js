import { test, expect } from '@playwright/test';

test.describe('Dorian D&D Sheet - Compendium Spell Lookup', () => {
  test('opens Add Spell modal and searches spells in compendium', async ({ page }) => {
    await page.goto('/');

    // 1. Go to Combat & Magic tab
    const combatBtn = page.locator('button', { hasText: 'Combat & Magic' });
    await combatBtn.click();

    // 2. Open Add Spell modal
    const addSpellBtn = page.locator('button', { hasText: 'Add Spell' });
    await expect(addSpellBtn).toBeVisible();
    await addSpellBtn.click();

    // 3. Verify Add Spell modal is open
    const modal = page.locator('[x-show="modalSpellAddOpen"]');
    await expect(modal).toBeVisible();

    // 4. Search input
    const searchInput = modal.locator('input[x-model="spellCompendiumSearch"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Fireball');

    // 5. Verify Fireball appears in the filtered compendium list (exact match)
    await expect(modal.getByText('Fireball', { exact: true })).toBeVisible();

    // 6. Close modal using the top right close button (×)
    const closeBtn = modal.locator('button', { hasText: '×' });
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
