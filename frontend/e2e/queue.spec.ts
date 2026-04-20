import { test, expect, Page } from "@playwright/test";

/**
 * E2E — Approval queue flow
 *
 * Requires TEST_USER_EMAIL + TEST_USER_PASSWORD for a valid session.
 * The backend must have at least one pending response to test approve flow.
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "testpassword";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe("Approval queue", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/queue");
  });

  test("queue page loads and shows title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cola de aprobación/i })).toBeVisible();
  });

  test("shows pending count or empty state", async ({ page }) => {
    // Either shows "N respuestas pendientes" or the empty state message
    const hasPending = await page.getByText(/respuesta[s]? pendiente[s]?/i).isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no hay respuestas pendientes/i).isVisible().catch(() => false);
    expect(hasPending || hasEmpty).toBe(true);
  });

  test("influencer filter dropdown renders when influencers exist", async ({ page }) => {
    // Wait for page to finish loading
    await page.waitForTimeout(1000);
    const select = page.getByRole("combobox");
    // If influencers exist the dropdown is visible, otherwise the queue is empty
    const hasSelect = await select.isVisible().catch(() => false);
    if (hasSelect) {
      await expect(select).toContainText("Todos los influencers");
    }
  });

  test("approve card removes it from queue", async ({ page }) => {
    await page.waitForTimeout(1000);

    const approveButtons = page.getByRole("button", { name: /^aprobar$/i });
    const count = await approveButtons.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Get initial card count
    const cards = page.locator(".rounded-xl.p-5");
    const initialCount = await cards.count();

    await approveButtons.first().click();

    await expect(async () => {
      const newCount = await cards.count();
      expect(newCount).toBe(initialCount - 1);
    }).toPass({ timeout: 5000 });
  });

  test("ignore card removes it from queue", async ({ page }) => {
    await page.waitForTimeout(1000);

    const ignoreButtons = page.getByRole("button", { name: /ignorar/i });
    const count = await ignoreButtons.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cards = page.locator(".rounded-xl.p-5");
    const initialCount = await cards.count();

    await ignoreButtons.first().click();

    await expect(async () => {
      const newCount = await cards.count();
      expect(newCount).toBe(initialCount - 1);
    }).toPass({ timeout: 5000 });
  });
});
