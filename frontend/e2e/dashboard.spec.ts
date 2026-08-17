import { test, expect, type Page } from "@playwright/test"

async function loginAs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.cookie = "fastrepo_token=fake-jwt-token; path=/; SameSite=Lax"
  })
}

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

test("dashboard shows stats from mock data", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const stats = page.getByTestId("stats")
  for (const [label, value] of [
    ["Commits", "1.3k"],
    ["Open issues", "23"],
    ["Open pull requests", "7"],
    ["Repositories", "8"],
    ["Collaborators", "5"],
    ["Stars", "342"],
  ]) {
    await expect(stats.getByText(value, { exact: true })).toBeVisible()
    await expect(stats.getByText(label, { exact: true })).toBeVisible()
  }
})

test("dashboard lists all repositories with GitHub-like details", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Your repositories" })
  ).toBeVisible()

  const repositories = page.getByTestId("repositories")

  for (const repo of [
    ["jane/fastrepo", "Code hosting with fine-grained"],
    ["jane/payments-service", "Internal billing and payments"],
    ["jane/dotfiles", "shell, editor and tmux"],
    ["jane/api-gateway", "Edge routing, auth and rate limiting"],
    ["jane/devops-playbook", "Runbooks and on-call"],
    ["jane/frontend", "React, Vite and Tailwind"],
    ["jane/mobile-app", "React Native client"],
    ["jane/data-pipeline", "Batch ETL jobs"],
  ]) {
    await expect(
      repositories.getByRole("link", { name: repo[0], exact: true })
    ).toBeVisible()
    await expect(repositories.getByText(repo[1])).toBeVisible()
  }
})

test("repository cards show private badges only for private repos", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const repositories = page.getByTestId("repositories")
  await expect(repositories.getByText("Private", { exact: true })).toHaveCount(3)
  for (const repo of ["payments-service", "api-gateway", "mobile-app"]) {
    await expect(
      repositories.locator("a", { hasText: repo }).locator("..").getByText("Private")
    ).toBeVisible()
  }
})

test("repository cards show counts and updated timestamps", async ({ page }) => {
  await loginAs(page)
  await page.goto("/")

  const repositories = page.getByTestId("repositories")
  const card = (name: string) =>
    repositories
      .getByRole("link", { name })
      .locator("xpath=ancestor::div[contains(@class,'rounded-xl')]")

  const fastrepo = card("jane/fastrepo")
  await expect(fastrepo.getByText("187")).toBeVisible()
  await expect(fastrepo.getByText("42")).toBeVisible()
  await expect(fastrepo.getByText("Updated 2 hours ago")).toBeVisible()

  const frontend = card("jane/frontend")
  await expect(frontend.getByText("45")).toBeVisible()
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
