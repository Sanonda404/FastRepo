export type MockIssue = {
  id: number
  title: string
  body: string
  status: "open" | "closed"
  author: string
  createdAt: string
  updatedAt: string
  comments: number
  labels: string[]
  assignees: string[]
}

export type MockComment = {
  id: number
  author: string
  body: string
  createdAt: string
}

export const mockIssues: MockIssue[] = [
  {
    id: 24,
    title: "Improve repository permissions UI",
    body: "The repository permissions screen should make team-level and folder-level access easier to understand.",
    status: "open",
    author: "alex",
    createdAt: "2 hours ago",
    updatedAt: "18 minutes ago",
    comments: 6,
    labels: ["enhancement", "permissions"],
    assignees: ["maria"],
  },
  {
    id: 23,
    title: "Add nested team permissions",
    body: "Allow a team to inherit access from its parent team while still supporting repository-specific overrides.",
    status: "open",
    author: "maria",
    createdAt: "Yesterday",
    updatedAt: "3 hours ago",
    comments: 4,
    labels: ["feature", "teams"],
    assignees: ["jane", "alex"],
  },
  {
    id: 21,
    title: "Add branch protection rules",
    body: "Repositories should be able to require reviews before changes reach protected branches.",
    status: "open",
    author: "jane",
    createdAt: "3 days ago",
    updatedAt: "Yesterday",
    comments: 3,
    labels: ["feature", "security"],
    assignees: ["alex"],
  },
  {
    id: 17,
    title: "Update README examples",
    body: "Refresh the examples so they match the current FastRepo API.",
    status: "closed",
    author: "jane",
    createdAt: "1 week ago",
    updatedAt: "4 days ago",
    comments: 2,
    labels: ["documentation"],
    assignees: [],
  },
]

export const mockComments: Record<number, MockComment[]> = {
  24: [
    {
      id: 1,
      author: "alex",
      body: "I think the team permission summary should be visible directly on the repository page.",
      createdAt: "1 hour ago",
    },
    {
      id: 2,
      author: "maria",
      body: "Agreed. I can take the first pass on the UI.",
      createdAt: "42 minutes ago",
    },
  ],
  23: [
    {
      id: 3,
      author: "jane",
      body: "This should work nicely with the folder-level restrictions.",
      createdAt: "Yesterday",
    },
  ],
  21: [
    {
      id: 4,
      author: "alex",
      body: "I will prepare a draft implementation.",
      createdAt: "Yesterday",
    },
  ],
  17: [
    {
      id: 5,
      author: "jane",
      body: "Updated the installation and API examples.",
      createdAt: "4 days ago",
    },
  ],
}
