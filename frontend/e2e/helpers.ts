import type { Page } from "@playwright/test"

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

export const janeUser = { id: 1, username: "jane", email: "jane@example.com" }

export const janeRepositories = [
  {
    id: 1,
    name: "fastrepo",
    description: "Code hosting with fine-grained permissions.",
    is_private: false,
    owner_id: 1,
    default_branch: "main",
    created_at: iso(2 * HOUR),
  },
  {
    id: 2,
    name: "payments-service",
    description: "Internal billing and payments microservice.",
    is_private: true,
    owner_id: 1,
    default_branch: "main",
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
  await page.route("**/api/repositories/jane", (route) =>
    route.fulfill({ json: janeRepositories })
  )
}

export async function loginAs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    document.cookie = "fastrepo_token=fake-jwt-token; path=/; SameSite=Lax"
  })
  await stubBackend(page)
}
