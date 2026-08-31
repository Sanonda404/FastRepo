import type { Page } from "@playwright/test"

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

export const janeUser = { id: 1, username: "jane", email: "jane@example.com", commits: 5, open_issues: 2, open_pull_requests: 1, collaborators: 3, stars: 7 }

export const janeRepositories = [
  {
    id: 1,
    name: "fastrepo",
    description: "Code hosting with fine-grained permissions.",
    is_private: false,
    owner_id: 1,
    default_branch: "main",
    parent_repository_id: null,
    parent_owner_username: null,
    parent_repository_name: null,
    created_at: iso(2 * HOUR),
  },
  {
    id: 2,
    name: "payments-service",
    description: "Internal billing and payments microservice.",
    is_private: true,
    owner_id: 1,
    default_branch: "main",
    parent_repository_id: 99,
    parent_owner_username: "octocat",
    parent_repository_name: "Hello-World",
    created_at: iso(DAY + HOUR),
  },
]

export function stubSession(page: Page): void {
  void page.route("**/api/users/me", (route) =>
    route.fulfill({ json: janeUser })
  )
}

export async function stubBackend(page: Page): Promise<void> {
  stubSession(page)
  await page.route("**/api/users/jane", (route) =>
    route.fulfill({ json: { id: janeUser.id, username: janeUser.username, email: janeUser.email } })
  )
  await page.route("**/api/repositories/jane", (route) => {
    const auth = route.request().headers()["authorization"]
    const isLoggedIn = !!auth
    const repos = isLoggedIn ? janeRepositories : janeRepositories.filter((r) => !r.is_private)
    route.fulfill({ json: repos })
  })
  await page.route("**/api/repositories/", (route) =>
    route.fulfill({ json: janeRepositories.map((r) => ({ ...r, owner_username: "jane", role: "Owner" })) })
  )
  await page.route("**/api/repositories", (route) =>
    route.fulfill({ json: janeRepositories.map((r) => ({ ...r, owner_username: "jane", role: "Owner" })) })
  )
}

export async function loginAs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.cookie = "fastrepo_token=fake-jwt-token; path=/; SameSite=Lax"
  })
  await stubBackend(page)
}
