import { test, expect } from "@playwright/test";

/**
 * E2E — Login flow
 *
 * Requires the app running at BASE_URL (default: http://localhost:3000)
 * with a real or seeded backend at NEXT_PUBLIC_API_URL.
 *
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars for a valid test account.
 */

const EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "testpassword";

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login page renders correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/VirtualVoice/i);
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.getByLabel(/contraseña/i).fill("wrongpassword");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  });

  test("redirects to dashboard on valid login", async ({ page }) => {
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/contraseña/i).fill(PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page is accessible from login", async ({ page }) => {
    await page.getByRole("link", { name: /registrar|crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
