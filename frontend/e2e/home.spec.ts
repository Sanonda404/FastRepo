import { test, expect } from "@playwright/test";

test("homepage shows hero and feature sections when logged out", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: /Code hosting with permissions/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Self-hosted, fast, and built around/),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Everything your team needs to ship" }),
  ).toBeVisible();

  for (const feature of [
    "Per-folder permissions",
    "Nested teams",
    "Pull requests",
    "Code reviews",
    "Clean merges",
  ]) {
    await expect(page.getByRole("heading", { name: feature })).toBeVisible();
  }
});

test("homepage CTAs link to the login page", async ({ page }) => {
  await page.goto("/");

  const main = page.locator("main");
  await main.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goBack();
  await main.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("navbar shows Sign in and Register when logged out", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Register" })).toBeVisible();

  await header.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("navbar Register link opens the register form", async ({ page }) => {
  await page.goto("/");

  await page.locator("header").getByRole("link", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/login\?mode=register/);
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});

test("footer renders on homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText("FastRepo");
  await expect(page.getByRole("contentinfo")).toContainText(
    "All rights reserved.",
  );
});

test("dark mode toggle switches homepage site-wide", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  await expect(html).not.toHaveClass(/dark/);
  await page
    .locator("header")
    .getByRole("button", { name: "Toggle dark mode" })
    .click();
  await expect(html).toHaveClass(/dark/);
  await expect(page.locator("header svg.lucide-sun")).toBeVisible();

  const bg = await html.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--background"),
  );
  expect(bg.trim()).not.toBe("");
});
