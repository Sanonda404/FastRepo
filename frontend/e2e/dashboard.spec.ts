import { test, expect } from "@playwright/test"

import { loginAs } from "./helpers"

test("dashboard shows welcome message and username in navbar when logged in", async ({
  page,
}) => {
  await loginAs(page)
  await page.goto("/")

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()

  const header = page.locator("header")
  await expect(header).toContainText("jane")
  await expect(header.getByText("J", { exact: true })).toBeVisible()
  await expect(header.getByRole("button", { name: "Log out" })).toBeVisible()
})

test("dashboard shows stats derived from the API data", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const stat = (label: string) =>
    page.getByTestId(`stat-${label.toLowerCase().replace(/\s+/g, "-")}`)

  await expect(stat("Repositories")).toContainText("2")
  for (const label of [
    "Commits",
    "Open issues",
    "Open pull requests",
    "Collaborators",
    "Stars",
  ]) {
    await expect(stat(label)).toContainText("0")
    await expect(stat(label).getByText(label, { exact: true })).toBeVisible()
  }
})

test("dashboard lists repositories returned by the API", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Your repositories" })
  ).toBeVisible()

  const repositories = page.getByTestId("repositories")
  await expect(
    repositories.getByRole("link", { name: "jane/fastrepo", exact: true })
  ).toBeVisible()
  await expect(repositories.getByText("Code hosting with fine-grained")).toBeVisible()
  await expect(
    repositories.getByRole("link", { name: "jane/payments-service", exact: true })
  ).toBeVisible()
  await expect(repositories.getByText("Internal billing and payments")).toBeVisible()
})

test("repository cards show private badges only for private repos", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const repositories = page.getByTestId("repositories")
  await expect(repositories.getByText("Private", { exact: true })).toHaveCount(1)
  const card = (name: string) =>
    repositories
      .getByRole("link", { name })
      .locator("xpath=ancestor::div[contains(@class,'rounded-xl')]")

  await expect(card("jane/payments-service").getByText("Private")).toBeVisible()
  await expect(
    card("jane/fastrepo").getByText("Private")
  ).toHaveCount(0)
})

test("repository cards show creation timestamps from the API", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const repositories = page.getByTestId("repositories")
  const card = (name: string) =>
    repositories
      .getByRole("link", { name })
      .locator("xpath=ancestor::div[contains(@class,'rounded-xl')]")

  await expect(card("jane/fastrepo").getByText("Created 2 hours ago")).toBeVisible()
  await expect(card("jane/payments-service").getByText("Created 1 day ago")).toBeVisible()
})

test("dashboard persists across reload while logged in", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()

  await page.reload()

  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()
  await expect(page.locator("header").getByRole("button", { name: "Log out" })).toBeVisible()
})

test("logout returns to the homepage and clears the session", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Welcome back, jane" })).toBeVisible()

  await page.locator("header").getByRole("button", { name: "Log out" }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole("heading", { name: /Code hosting with permissions/ })
  ).toBeVisible()
  await expect(page.locator("header").getByRole("link", { name: "Sign in" })).toBeVisible()

  const cookie = await page.evaluate(() => document.cookie)
  expect(cookie).not.toContain("fastrepo_token")
})

test("dark mode toggle works on the dashboard", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")
  const html = page.locator("html")

  await expect(html).not.toHaveClass(/dark/)
  await page.locator("header").getByRole("button", { name: "Toggle dark mode" }).click()
  await expect(html).toHaveClass(/dark/)
  await expect(page.locator("header svg.lucide-sun")).toBeVisible()
})
