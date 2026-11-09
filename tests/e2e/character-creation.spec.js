import { test, expect } from '@playwright/test';

test.describe('Dorian D&D Sheet - Character Creation Wizard', () => {
  test('walks through creation wizard and summons a new hero', async ({ page }) => {
    // Navigate directly to create route
    await page.goto('/#/create');

    // Step 1: Concept & Identity
    await expect(page.locator('text=Step 1: Concept & Identity')).toBeVisible();

    const nameInput = page.locator('input[x-model="wizardData.name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Elminster Aumar');

    // Advance to Step 2 (Race & Species)
    const nextBtn = page.locator('button', { hasText: 'Next Step →' });
    await nextBtn.click();
    await expect(page.locator('text=Step 2: Race & Species')).toBeVisible();

    // Advance to Step 3 (Class, Subclass & Skills)
    await nextBtn.click();
    await expect(page.locator('text=Step 3: Class, Subclass & Skills')).toBeVisible();

    // Advance to Step 4 (Ability Scores)
    await nextBtn.click();
    await expect(page.locator('text=Step 4: Ability Scores')).toBeVisible();

    // Advance to Step 6 (Review & Summon Hero - default Fighter skips Step 5 Magic)
    await nextBtn.click();
    const reviewHeader = page.locator('text=Step 6: Review & Summon Hero');
    const step5Header = page.locator('text=Step 5: Equipment & Spells');
    if (await step5Header.isVisible({ timeout: 500 }).catch(() => false)) {
      await nextBtn.click();
    }
    await expect(reviewHeader).toBeVisible();

    // Verify hero name in review card
    await expect(page.locator('text=Elminster Aumar').first()).toBeVisible();

    // Click Summon Hero
    const summonBtn = page.locator('button', { hasText: 'Summon Hero' });
    await expect(summonBtn).toBeVisible();
    await summonBtn.click();

    // Wizard should close and character heading should now be active
    await expect(reviewHeader).not.toBeVisible();
    const activeHeroHeading = page.locator('h1[x-text*="data.identity?.name"]');
    await expect(activeHeroHeading).toBeVisible();
    await expect(activeHeroHeading).toHaveText(/Elminster Aumar/);
  });
});
