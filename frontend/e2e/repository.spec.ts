import { expect, test, type Page, type Route } from "@playwright/test"

import { HOUR, iso, stubSession } from "./helpers"

type FixtureEntry = {
  name: string
  type: "blob" | "tree"
  mode: number
  sha: string
  size?: number
}

const entry = (name: string, type: "blob" | "tree", size?: number): FixtureEntry => ({
  name,
  type,
  mode: type === "tree" ? 16384 : 33188,
  sha: `sha-${name}`,
  ...(size !== undefined ? { size } : {}),
})

const TREES: Record<string, Record<string, FixtureEntry[]>> = {
  main: {
    "": [
      entry(".github", "tree"),
      entry("docs", "tree"),
      entry("src", "tree"),
      entry("tests", "tree"),
      entry(".gitignore", "blob", 30),
      entry("API.md", "blob", 512),
      entry("README.md", "blob", 1024),
      entry("pyproject.toml", "blob", 256),
    ],
    src: [
      entry("__init__.py", "blob", 12),
      entry("api.py", "blob", 180),
      entry("lib", "tree"),
      entry("models.py", "blob", 240),
    ],
    "src/lib": [
      entry("formatters", "tree"),
      entry("config.py", "blob", 64),
      entry("utils.py", "blob", 96),
    ],
    "src/lib/formatters": [
      entry("tables.py", "blob", 128),
      entry("time.py", "blob", 140),
    ],
    docs: [entry("architecture.md", "blob", 700)],
    tests: [entry("test_tree.py", "blob", 320)],
    ".github": [entry("ISSUE_TEMPLATE.md", "blob", 210)],
  },
  "feature/search": {
    "": [
      entry("docs", "tree"),
      entry("src", "tree"),
      entry("tests", "tree"),
      entry(".gitignore", "blob", 30),
      entry("README.md", "blob", 1024),
      entry("pyproject.toml", "blob", 256),
    ],
    src: [
      entry("__init__.py", "blob", 12),
      entry("api.py", "blob", 190),
      entry("search.py", "blob", 150),
    ],
    docs: [entry("search.md", "blob", 400)],
    tests: [entry("test_search.py", "blob", 280)],
  },
  "release/1.0": {
    "": [
      entry("docs", "tree"),
      entry("src", "tree"),
      entry("README.md", "blob", 1024),
      entry("pyproject.toml", "blob", 256),
    ],
    src: [entry("api.py", "blob", 170)],
    docs: [entry("release-notes.md", "blob", 500)],
  },
}

const FILES: Record<string, string> = {
  "README.md": "# FastRepo\n\nA small, self-hosted home for source code and collaboration.\n",
  "src/api.py": "from fastapi import APIRouter\n\nrouter = APIRouter(prefix='/repositories')\n",
  "src/search.py": "def search_branches(branches, query):\n    return [branch for branch in branches if query.lower() in branch.lower()]\n",
}

const HEAD_COMMITS: Record<string, { sha: string; message: string; date: string }> = {
  main: { sha: "8a4b1c2abcdef0123456789abcdef0123456789", message: "Add repository browser", date: iso(3 * HOUR) },
  "feature/search": { sha: "4c9d8e1abcdef0123456789abcdef0123456789", message: "Add branch search", date: iso(25 * 60_000) },
  "release/1.0": { sha: "7f2a3b6abcdef0123456789abcdef0123456789", message: "Release 1.0", date: iso(35 * 24 * HOUR) },
}

const REPO_META = {
  id: 1,
  name: "fastrepo",
  description: "Code hosting with fine-grained permissions.",
  is_private: true,
  owner_id: 1,
  default_branch: "main",
  created_at: iso(30 * 24 * HOUR),
}

async function stubRepoApi(page: Page): Promise<void> {
  stubSession(page)
  await page.route("**/api/**", (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === "/api/repositories/jane/fastrepo") {
      return route.fulfill({ json: REPO_META })
    }
    if (path === "/api/repositories/jane/fastrepo/branches") {
      return route.fulfill({
        json: [
          { name: "main", sha: HEAD_COMMITS.main.sha, is_default: true },
          { name: "feature/search", sha: HEAD_COMMITS["feature/search"].sha, is_default: false },
          { name: "release/1.0", sha: HEAD_COMMITS["release/1.0"].sha, is_default: false },
        ],
      })
    }
    if (path === "/api/repositories/jane/fastrepo/commits") {
      const head = HEAD_COMMITS[url.searchParams.get("ref") ?? "main"] ?? HEAD_COMMITS.main
      return route.fulfill({
        json: [
          {
            sha: head.sha,
            author: "jane",
            author_email: "jane@example.com",
            author_date: head.date,
            message: head.message,
          },
        ],
      })
    }
    if (path === "/api/repositories/jane/fastrepo/tree") {
      const ref = url.searchParams.get("ref") ?? "main"
      const dirPath = url.searchParams.get("path") ?? ""
      const entries = TREES[ref]?.[dirPath]
      if (!entries) {
        return route.fulfill({ status: 404, json: { detail: "Tree not found" } })
      }
      return route.fulfill({
        json: { commit: `commit-${ref}`, tree: "root-tree-sha", path: dirPath, entries },
      })
    }
    if (path === "/api/repositories/jane/fastrepo/file" && request.method() === "POST") {
      const body = request.postDataJSON() as { path?: string }
      const filePath = body.path ?? ""
      const content = FILES[filePath]
      if (content === undefined) {
        return route.fulfill({ status: 404, json: { detail: "File not found" } })
      }
      return route.fulfill({
        json: {
          name: filePath.split("/").pop(),
          path: filePath,
          sha: `sha-${filePath}`,
          size: content.length,
          binary: false,
          content,
        },
      })
    }

    return route.fulfill({ status: 404, json: { detail: "Not found" } })
  })
}

test.beforeEach(async ({ page }) => {
  await stubRepoApi(page)
})

test("repository explorer keeps its tree while selecting branches and files", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  await expect(page.getByRole("navigation", { name: "Repository navigation" })).toBeVisible()
  await expect(page.getByRole("table", { name: "Repository file explorer" })).toContainText("src")
  await expect(page.locator("main")).toContainText("Private")

  await page.getByRole("button", { name: /main/ }).click()
  const dialog = page.getByRole("dialog", { name: "Select branch" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: /feature\/search/ }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole("row", { name: "src", exact: true }).click()
  await expect(page.getByRole("row", { name: "search.py" })).toBeVisible()
  await page.getByRole("row", { name: "search.py" }).click()
  await expect(page.getByText("def search_branches", { exact: false })).toBeVisible()
  await expect(page.getByText("File history")).toBeVisible()
})

test("latest commit bar shows the branch head commit from the API", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const section = page.locator('section[aria-label="Repository contents"]')
  await expect(section).toContainText("jane")
  await expect(section).toContainText("Add repository browser")
  await expect(section).toContainText("8a4b1c2")
  await expect(section).toContainText("3 hours ago")
})

test("nested folders are navigable and breadcrumb jumps show each directory's tree", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })

  await explorer.getByRole("row", { name: "src", exact: true }).click()
  await expect(explorer).toContainText("api.py")
  await expect(breadcrumb).toContainText("src")

  await explorer.getByRole("row", { name: "lib", exact: true }).click()
  await expect(explorer).toContainText("config.py")
  await expect(explorer).toContainText("formatters")

  await explorer.getByRole("row", { name: "formatters", exact: true }).click()
  await expect(explorer).toContainText("time.py")

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
  await explorer.getByRole("row", { name: "src", exact: true }).click()
  await explorer.getByRole("row", { name: "lib", exact: true }).click()
  await explorer.getByRole("row", { name: "formatters", exact: true }).click()
  await expect(explorer).toContainText("tables.py")

  await explorer.getByRole("row", { name: /Up one level/ }).click()
  await expect(explorer).toContainText("utils.py")

  await explorer.getByRole("row", { name: /Up one level/ }).click()
  await expect(explorer).toContainText("models.py")
})

test("file sizes from the tree API are shown for blobs", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await expect(explorer).toContainText("512 bytes")
  await expect(explorer).toContainText("1024 bytes")

  await explorer.getByRole("row", { name: "README.md" }).click()
  await expect(page.getByText("A small, self-hosted home")).toBeVisible()
})

test("switching branch from a nested directory resets to the new branch root and keeps the explorer", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await explorer.getByRole("row", { name: "src", exact: true }).click()
  await explorer.getByRole("row", { name: "lib", exact: true }).click()

  await page.getByRole("button", { name: /main/ }).click()
  const dialog = page.getByRole("dialog", { name: "Select branch" })
  await expect(dialog).toBeVisible()
  await expect(explorer).toBeVisible()

  await dialog.getByRole("button", { name: /release\/1\.0/ }).click()
  await expect(dialog).toBeHidden()
  await expect(explorer).toContainText("README.md")
  await expect(explorer).not.toContainText("config.py")
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).not.toContainText("src")
})

test("file view breadcrumb directories return to their listings with content intact", async ({ page }) => {
  await page.goto("/jane/fastrepo")

  const explorer = page.getByRole("table", { name: "Repository file explorer" })
  await explorer.getByRole("row", { name: "src", exact: true }).click()
  await explorer.getByRole("row", { name: "api.py" }).click()
  await expect(page.getByText("router = APIRouter", { exact: false })).toBeVisible()
  await expect(page.getByText(/bytes/)).toBeVisible()

  const fileBreadcrumb = page.getByRole("navigation", { name: "File breadcrumb" })
  await fileBreadcrumb.getByRole("button", { name: "src" }).click()
  await expect(explorer).toContainText("models.py")
})
