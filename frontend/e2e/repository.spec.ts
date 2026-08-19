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
