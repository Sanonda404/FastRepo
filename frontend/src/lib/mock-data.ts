export interface MockUser {
  username: string
  email: string
}

export interface MockStats {
  totalRepos: number
  totalCommits: number
  openIssues: number
  openPullRequests: number
  collaborators: number
  totalStars: number
}

export interface MockRepository {
  id: number
  name: string
  owner: string
  description: string
  is_private: boolean
  language: string
  stars: number
  forks: number
  open_issues: number
  default_branch: string
  updated_at: string
}

export const mockUser: MockUser = {
  username: "jane",
  email: "jane@example.com",
}

export const mockStats: MockStats = {
  totalRepos: 8,
  totalCommits: 1284,
  openIssues: 23,
  openPullRequests: 7,
  collaborators: 5,
  totalStars: 342,
}

export const mockRepositories: MockRepository[] = [
  {
    id: 1,
    name: "fastrepo",
    owner: "jane",
    description: "Code hosting with fine-grained, org-chart-matched permissions.",
    is_private: false,
    language: "Python",
    stars: 187,
    forks: 42,
    open_issues: 6,
    default_branch: "main",
    updated_at: "2 hours ago",
  },
  {
    id: 2,
    name: "payments-service",
    owner: "jane",
    description: "Internal billing and payments microservice.",
    is_private: true,
    language: "TypeScript",
    stars: 4,
    forks: 3,
    open_issues: 8,
    default_branch: "main",
    updated_at: "yesterday",
  },
  {
    id: 3,
    name: "dotfiles",
    owner: "jane",
    description: "My shell, editor and tmux configuration.",
    is_private: false,
    language: "Shell",
    stars: 61,
    forks: 12,
    open_issues: 1,
    default_branch: "main",
    updated_at: "3 days ago",
  },
  {
    id: 4,
    name: "api-gateway",
    owner: "jane",
    description: "Edge routing, auth and rate limiting for the platform.",
    is_private: true,
    language: "Go",
    stars: 12,
    forks: 5,
    open_issues: 4,
    default_branch: "main",
    updated_at: "last week",
  },
  {
    id: 5,
    name: "devops-playbook",
    owner: "jane",
    description: "Runbooks and on-call procedures for the platform.",
    is_private: false,
    language: "Markdown",
    stars: 33,
    forks: 9,
    open_issues: 2,
    default_branch: "main",
    updated_at: "last week",
  },
  {
    id: 6,
    name: "frontend",
    owner: "jane",
    description: "FastRepo web application — React, Vite and Tailwind.",
    is_private: false,
    language: "TypeScript",
    stars: 45,
    forks: 11,
    open_issues: 2,
    default_branch: "main",
    updated_at: "2 weeks ago",
  },
  {
    id: 7,
    name: "mobile-app",
    owner: "jane",
    description: "React Native client for FastRepo on the go.",
    is_private: true,
    language: "TypeScript",
    stars: 0,
    forks: 1,
    open_issues: 0,
    default_branch: "main",
    updated_at: "3 weeks ago",
  },
  {
    id: 8,
    name: "data-pipeline",
    owner: "jane",
    description: "Batch ETL jobs feeding the analytics warehouse.",
    is_private: false,
    language: "Python",
    stars: 0,
    forks: 4,
    open_issues: 0,
    default_branch: "main",
    updated_at: "a month ago",
  },
]
