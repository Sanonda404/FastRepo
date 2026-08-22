import { test, expect, type Page } from "@playwright/test"

import { stubBackend } from "./helpers"

async function themeVar(page: Page, name: string): Promise<string> {
  return page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v), name)
}

test("login page renders and root shows homepage when logged out", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /org chart/ })).toBeVisible()

  await page.goto("/login")
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
  await expect(page.getByPlaceholder("username")).toBeVisible()
  await expect(page.getByPlaceholder("••••••••")).toBeVisible()
})

test("dark mode toggle switches the whole page to dark", async ({ page }) => {
  await page.goto("/login")
  const html = page.locator("html")
  const panel = page.locator(".auth-panel")
  const toggle = page.locator("header").getByRole("button", { name: "Toggle dark mode" })

  await expect(html).not.toHaveClass(/dark/)
  await expect(page.locator("header svg.lucide-moon")).toBeVisible()

  const lightPanelBg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor)
  const lightVar = await themeVar(page, "--background")

  await toggle.click()

  await expect(html).toHaveClass(/dark/)
  await expect(page.locator("header svg.lucide-sun")).toBeVisible()

  // theme token swaps site-wide
  const darkVar = await themeVar(page, "--background")
  expect(darkVar).not.toBe(lightVar)

  // auth page panel (far from navbar) repaints
  const darkPanelBg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(darkPanelBg).not.toBe(lightPanelBg)

  // navbar and page token agree — one theme, not a local navbar theme
  const darkNavBg = await page.locator("header").evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(darkNavBg).toBe(darkVar)
})

test("dark mode persists after reload", async ({ page }) => {
  await page.goto("/login")
  await page.locator("header").getByRole("button", { name: "Toggle dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.reload()

  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.locator("header svg.lucide-sun")).toBeVisible()
})

test("toggle returns to light", async ({ page }) => {
  await page.goto("/login")
  const html = page.locator("html")
  const toggle = page.locator("header").getByRole("button", { name: "Toggle dark mode" })

  await toggle.click()
  await expect(html).toHaveClass(/dark/)

  await toggle.click()
  await expect(html).not.toHaveClass(/dark/)
  await expect(page.locator("header svg.lucide-moon")).toBeVisible()
})

test("login with mocked backend lands on the dashboard", async ({ page }) => {
  await stubBackend(page)
  await page.route("**/api/users/login", (route) =>
    route.fulfill({
      json: { access_token: "fake-jwt", token_type: "bearer" },
    })
  )

  await page.goto("/login")
  await page.getByPlaceholder("username").fill("jane")
  await page.getByPlaceholder("••••••••").fill("secret123")
  await page.getByRole("button", { name: "Sign In" }).click()

  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()
  await expect(page.locator("header")).toContainText("jane")
  await expect(page.locator("header").getByRole("button", { name: "Log out" })).toBeVisible()

  const cookie = await page.evaluate(() => document.cookie)
  expect(cookie).toContain("fastrepo_token")
})

test("register with mocked backend lands on the dashboard", async ({ page }) => {
  await stubBackend(page)
  await page.route("**/api/users/register", (route) =>
    route.fulfill({
      status: 201,
      json: { id: 1, username: "jane", email: "jane@example.com" },
    })
  )
  await page.route("**/api/users/login", (route) =>
    route.fulfill({
      json: { access_token: "fake-jwt", token_type: "bearer" },
    })
  )

  await page.goto("/login")
  await page.getByRole("button", { name: "Register" }).click()

  await page.getByPlaceholder("your-username").fill("jane")
  await page.getByPlaceholder("you@example.com").fill("jane@example.com")
  await page.getByPlaceholder("••••••••").first().fill("secret123")
  await page.getByPlaceholder("••••••••").nth(1).fill("secret123")
  await page.getByRole("button", { name: "Create Account" }).click()

  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()
  await expect(page.locator("header")).toContainText("jane")
})
