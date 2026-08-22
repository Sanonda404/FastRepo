import { expect, test } from "@playwright/test"

test("repository explorer keeps its tree while selecting branches and files", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  await expect(page.getByRole("navigation", { name: "Repository navigation" })).toBeVisible()
  await expect(page.getByRole("table", { name: "Repository file explorer" })).toContainText("src")

  await page.getByRole("button", { name: /main/ }).click()
  await expect(page.getByRole("dialog", { name: "Select branch" })).toBeVisible()
  await page.getByRole("dialog", { name: "Select branch" }).getByRole("button", { name: /feature\/search/ }).click()
  await expect(page.getByRole("dialog", { name: "Select branch" })).toBeHidden()
  await expect(page.getByRole("table", { name: "Repository file explorer" })).toContainText("search preview")

  await page.getByRole("row", { name: /src Add branch search/ }).click()
  await expect(page.getByRole("row", { name: /search\.py Add branch search/ })).toBeVisible()
  await page.getByRole("row", { name: /search\.py Add branch search/ }).click()
  await expect(page.getByText("def search_branches", { exact: false })).toBeVisible()
  await expect(page.getByText("File history")).toBeVisible()
})

test("nested folders are navigable and breadcrumb jumps show each directory's tree", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })

  await explorer.getByRole("row", { name: /src Add repository browser/ }).click()
  await expect(explorer).toContainText("api.py")
  await expect(breadcrumb).toContainText("src")

  await explorer.getByRole("row", { name: /lib Extract shared helpers/ }).click()
  await expect(explorer).toContainText("config.py")
  await expect(explorer).toContainText("formatters")

  await explorer.getByRole("row", { name: /formatters Add table formatting/ }).click()
  await expect(explorer).toContainText("time.py")
  await expect(breadcrumb).toContainText("lib")

  await breadcrumb.getByRole("button", { name: "lib" }).click()
  await expect(explorer).toContainText("utils.py")
  await expect(explorer).not.toContainText("models.py")

  await breadcrumb.getByRole("button", { name: "src" }).click()
  await expect(explorer).toContainText("api.py")
  await expect(explorer).toContainText("models.py")
  await expect(breadcrumb).not.toContainText("lib")

  await breadcrumb.getByRole("button", { name: "fastrepo" }).click()
  await expect(explorer).toContainText("README.md")
  await expect(breadcrumb).not.toContainText("src")
})

test("up one level walks back through nested directories", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await explorer.getByRole("row", { name: /src Add repository browser/ }).click()
  await explorer.getByRole("row", { name: /lib Extract shared helpers/ }).click()
  await explorer.getByRole("row", { name: /formatters Add table formatting/ }).click()
  await expect(explorer).toContainText("tables.py")

  await explorer.getByRole("row", { name: /Up one level/ }).click()
  await expect(explorer).toContainText("utils.py")

  await explorer.getByRole("row", { name: /Up one level/ }).click()
  await expect(explorer).toContainText("models.py")
})

test("switching branch from a nested directory resets to the new branch root and keeps the explorer", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await explorer.getByRole("row", { name: /src Add repository browser/ }).click()
  await explorer.getByRole("row", { name: /lib Extract shared helpers/ }).click()

  await page.getByRole("button", { name: /main/ }).click()
  const dialog = page.getByRole("dialog", { name: "Select branch" })
  await expect(dialog).toBeVisible()
  await expect(explorer).toBeVisible()

  await dialog.getByRole("button", { name: /release\/1\.0/ }).click()
  await expect(dialog).toBeHidden()
  await expect(explorer).toContainText("Prepare 1.0 notes")
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).not.toContainText("src")
})

test("file view breadcrumb directories return to their listings with content intact", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await explorer.getByRole("row", { name: /src Add repository browser/ }).click()
  await explorer.getByRole("row", { name: /api\.py Add repository browser/ }).click()
  await expect(page.getByText("router = APIRouter", { exact: false })).toBeVisible()

  const fileBreadcrumb = page.getByRole("navigation", { name: "File breadcrumb" })
  await fileBreadcrumb.getByRole("button", { name: "src" }).click()
  await expect(explorer).toContainText("models.py")
})
