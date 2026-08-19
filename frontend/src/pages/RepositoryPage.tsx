import { useEffect, useMemo, useState } from "react"
import {
  BookOpen, Check, ChevronDown, CircleDot, Clock3, Copy, FileCode2, FileText,
  Folder, GitBranch, GitCommitHorizontal, GitFork, GitPullRequest, History,
  Lock, MoreHorizontal, Search, Star
} from "lucide-react"
import { useParams } from "react-router-dom"

type Entry = {
  name: string
  type: "tree" | "blob"
  message: string
  updated: string
}

const branches = [
  { name: "main", sha: "8a4b1c2", default: true },
  { name: "feature/search", sha: "4c9d8e1", default: false },
  { name: "release/1.0", sha: "7f2a3b6", default: false },
]

const tree: Record<string, Record<string, Entry[]>> = {
  main: {
    "": [
      { name: ".github", type: "tree", message: "Add issue templates", updated: "2 days ago" },
      { name: "docs", type: "tree", message: "Clarify API setup", updated: "yesterday" },
      { name: "src", type: "tree", message: "Add repository browser", updated: "3 hours ago" },
      { name: "tests", type: "tree", message: "Cover branch selection", updated: "3 hours ago" },
      { name: ".gitignore", type: "blob", message: "Ignore local cache", updated: "last week" },
      { name: "API.md", type: "blob", message: "Document source tree API", updated: "yesterday" },
      { name: "README.md", type: "blob", message: "Refresh project overview", updated: "yesterday" },
      { name: "pyproject.toml", type: "blob", message: "Bump development tools", updated: "last week" },
    ],
    src: [
      { name: "__init__.py", type: "blob", message: "Create application package", updated: "2 weeks ago" },
      { name: "api.py", type: "blob", message: "Add repository browser", updated: "3 hours ago" },
      { name: "models.py", type: "blob", message: "Add repository models", updated: "4 days ago" },
    ],
    docs: [{ name: "architecture.md", type: "blob", message: "Clarify API setup", updated: "yesterday" }],
    tests: [{ name: "test_tree.py", type: "blob", message: "Cover branch selection", updated: "3 hours ago" }],
    ".github": [{ name: "ISSUE_TEMPLATE.md", type: "blob", message: "Add issue templates", updated: "2 days ago" }],
  },
  "feature/search": {
    "": [
      { name: "docs", type: "tree", message: "Document search syntax", updated: "25 minutes ago" },
      { name: "src", type: "tree", message: "Add branch search", updated: "25 minutes ago" },
      { name: "tests", type: "tree", message: "Test branch matching", updated: "20 minutes ago" },
      { name: ".gitignore", type: "blob", message: "Ignore local cache", updated: "last week" },
      { name: "README.md", type: "blob", message: "Describe search preview", updated: "25 minutes ago" },
      { name: "pyproject.toml", type: "blob", message: "Bump development tools", updated: "last week" },
    ],
    src: [
      { name: "__init__.py", type: "blob", message: "Create application package", updated: "2 weeks ago" },
      { name: "api.py", type: "blob", message: "Add branch search", updated: "25 minutes ago" },
      { name: "search.py", type: "blob", message: "Add branch search", updated: "25 minutes ago" },
    ],
    docs: [{ name: "search.md", type: "blob", message: "Document search syntax", updated: "25 minutes ago" }],
    tests: [{ name: "test_search.py", type: "blob", message: "Test branch matching", updated: "20 minutes ago" }],
  },
  "release/1.0": {
    "": [
      { name: "docs", type: "tree", message: "Prepare 1.0 notes", updated: "Jun 12" },
      { name: "src", type: "tree", message: "Release 1.0", updated: "Jun 12" },
      { name: "README.md", type: "blob", message: "Prepare 1.0 notes", updated: "Jun 12" },
      { name: "pyproject.toml", type: "blob", message: "Release 1.0", updated: "Jun 12" },
    ],
    src: [{ name: "api.py", type: "blob", message: "Release 1.0", updated: "Jun 12" }],
    docs: [{ name: "release-notes.md", type: "blob", message: "Prepare 1.0 notes", updated: "Jun 12" }],
  },
}

const contents: Record<string, string> = {
  "README.md": "# FastRepo\n\nA small, self-hosted home for source code and collaboration.\n\n## Getting started\n\nSee `API.md` for the repository API reference.\n",
  "src/api.py": "from fastapi import APIRouter\n\nrouter = APIRouter(prefix='/repositories')\n\n@router.get('/{owner}/{repository}/tree')\ndef get_tree(owner: str, repository: str):\n    return {'owner': owner, 'repository': repository}\n",
  "src/search.py": "def search_branches(branches, query):\n    return [branch for branch in branches if query.lower() in branch.lower()]\n",
  "API.md": "# FastRepo API\n\nThe repository tree accepts a ref and an optional path.\n",
  ".gitignore": ".venv/\n__pycache__/\n.env\n",
}

const navItems = [
  ["Code", BookOpen], ["Issues", CircleDot], ["Pull requests", GitPullRequest]
] as const

const baseButton = "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export default function RepositoryPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [branch, setBranch] = useState("main")
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchSearch, setBranchSearch] = useState("")
  const [path, setPath] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${owner}/${repository} · ${branch} · FastRepo`
  }, [branch, owner, repository])

  const currentPath = path.join("/")
  const entries = tree[branch][currentPath] ?? []
  const visibleBranches = useMemo(
    () => branches.filter(({ name }) => name.toLowerCase().includes(branchSearch.toLowerCase())),
    [branchSearch],
  )
  const filePath = selectedFile ? [...path, selectedFile].join("/") : ""
  const latest = branch === "feature/search"
    ? { author: "jane", message: "Add branch search", sha: "4c9d8e1", time: "25 minutes ago" }
    : { author: "jane", message: "Add repository browser", sha: "8a4b1c2", time: "3 hours ago" }

  const openFolder = (name: string) => {
    setPath((current) => [...current, name])
    setSelectedFile(null)
  }

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            <BookOpen className="size-5 text-muted-foreground" />
            <span className="text-primary">{owner}</span><span className="text-muted-foreground">/</span><span>{repository}</span>
            <span className="ml-1 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground"><Lock className="mr-1 inline size-3" />Private</span>
            <div className="ml-auto flex gap-2 text-sm">
              <button className={baseButton}><Star className="size-4" /> Star <span className="text-muted-foreground">45</span></button>
              <button className={baseButton}><GitFork className="size-4" /> Fork <span className="text-muted-foreground">11</span></button>
            </div>
          </div>
          <nav aria-label="Repository navigation" className="mt-6 flex gap-1 overflow-x-auto">
            {navItems.map(([label, Icon]) => <button key={label} className={`relative flex shrink-0 items-center gap-2 rounded-t-md px-3 py-3 text-sm ${label === "Code" ? "border-b-2 border-orange-500 font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" />{label}{label === "Issues" && <span className="rounded-full bg-muted px-1.5 text-xs">2</span>}</button>)}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <button className={`${baseButton} min-w-32 justify-between`} onClick={() => setBranchOpen((open) => !open)} aria-expanded={branchOpen} aria-controls="branch-menu"><span className="flex items-center gap-2"><GitBranch className="size-4" />{branch}</span><ChevronDown className="size-4" /></button>
            <button className="text-sm text-muted-foreground hover:text-primary">{branches.length} branches</button>
            {branchOpen && <div id="branch-menu" className="absolute left-0 top-10 w-80 rounded-lg border bg-popover p-3 shadow-xl" role="dialog" aria-label="Select branch">
              <label className="sr-only" htmlFor="branch-search">Find a branch</label>
              <div className="flex items-center gap-2 rounded-md border px-2"><Search className="size-4 text-muted-foreground" /><input id="branch-search" autoFocus value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} placeholder="Find a branch..." className="h-9 w-full bg-transparent text-sm outline-none" /></div>
              <p className="mt-3 px-2 text-xs font-medium text-muted-foreground">RECENT BRANCHES</p>
              <div className="mt-1 max-h-52 overflow-y-auto">
                {visibleBranches.map((item) => <button key={item.name} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => { setBranch(item.name); setPath([]); setSelectedFile(null); setBranchOpen(false); setBranchSearch("") }}><GitBranch className="size-4 text-muted-foreground" /><span className="flex-1">{item.name}</span>{item.default && <span className="text-xs text-muted-foreground">default</span>}{item.name === branch && <Check className="size-4 text-primary" />}</button>)}
                {!visibleBranches.length && <p className="p-3 text-sm text-muted-foreground">No branches found.</p>}
              </div>
              <button className="mt-2 w-full border-t pt-3 text-left text-sm font-medium text-primary hover:underline">View all branches</button>
            </div>}
          </div>
          <div className="flex items-center gap-2">
            <button className={baseButton}><Search className="size-4" /> Go to file</button>
          </div>
        </div>

        <section className="mt-5 overflow-hidden rounded-lg border" aria-label="Repository contents">
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-3 text-sm">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">J</div>
            <span><strong>{latest.author}</strong> <span className="text-muted-foreground">committed</span> {latest.message}</span>
            <span className="ml-auto flex items-center gap-2 text-muted-foreground"><GitCommitHorizontal className="size-4" />{latest.sha}<span>·</span><Clock3 className="size-4" />{latest.time}<button className="ml-2 flex items-center gap-1 hover:text-primary"><History className="size-4" /> History</button></span>
          </div>

          {selectedFile ? <FileView owner={owner} repository={repository} branch={branch} path={path} file={selectedFile} content={contents[filePath] ?? "# File preview\n\nMock content is available for this file in the production API."} onBack={() => setSelectedFile(null)} /> : <>
            <div className="flex items-center gap-1 border-b px-4 py-3 text-sm"><button className="font-medium text-primary hover:underline" onClick={() => setPath([])}>{repository}</button>{path.map((segment, index) => <span key={segment} className="flex items-center gap-1"><span className="text-muted-foreground">/</span><button className="font-medium text-primary hover:underline" onClick={() => setPath(path.slice(0, index + 1))}>{segment}</button></span>)}</div>
            <div role="table" aria-label="Repository file explorer">
              <div role="row" className="hidden grid-cols-[minmax(14rem,2fr)_minmax(12rem,2fr)_9rem] gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"><span role="columnheader">Name</span><span role="columnheader">Latest commit message</span><span role="columnheader">Last update</span></div>
              {path.length > 0 && <button role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 text-left text-sm hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_minmax(12rem,2fr)_9rem]" onClick={() => setPath(path.slice(0, -1))}><span className="flex items-center gap-2 text-primary"><Folder className="size-4 fill-current/20" />..</span><span className="hidden sm:block" /><span className="text-muted-foreground">Up one level</span></button>}
              {entries.map((entry) => <button key={entry.name} role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_minmax(12rem,2fr)_9rem]" onClick={() => entry.type === "tree" ? openFolder(entry.name) : setSelectedFile(entry.name)}><span className="flex min-w-0 items-center gap-2 font-medium text-primary"><span>{entry.type === "tree" ? <Folder className="size-4 fill-current/20" /> : <FileCode2 className="size-4" />}</span><span className="truncate">{entry.name}</span></span><span className="hidden truncate text-muted-foreground sm:block">{entry.message}</span><span className="text-right text-xs text-muted-foreground sm:text-left sm:text-sm">{entry.updated}</span></button>)}
            </div>
          </>}
        </section>
      </div>
    </main>
  )
}

function FileView({ owner, repository, branch, path, file, content, onBack }: { owner: string; repository: string; branch: string; path: string[]; file: string; content: string; onBack: () => void }) {
  const lines = content.split("\n")
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm"><div className="flex items-center gap-1"><button onClick={onBack} className="font-medium text-primary hover:underline">{repository}</button><span className="text-muted-foreground">/</span>{path.map((segment) => <span key={segment} className="flex items-center gap-1"><span className="font-medium text-primary">{segment}</span><span className="text-muted-foreground">/</span></span>)}<span className="font-medium">{file}</span></div><div className="flex gap-2"><button className={baseButton}>Raw</button><button className={baseButton}><Copy className="size-4" /> Copy</button><button className={baseButton}><MoreHorizontal className="size-4" /></button></div></div>
    <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground"><FileText className="size-4" />{[...path, file].join("/")}<span>·</span><span>{content.length} bytes</span><span>·</span><span>{branch}</span><span className="ml-auto flex items-center gap-1"><History className="size-4" /> File history</span></div>
    <pre className="overflow-x-auto bg-[#0d1117] p-4 text-sm leading-6 text-[#c9d1d9]">{lines.map((line, index) => <code key={index} className="block"><span className="mr-5 inline-block w-6 select-none text-right text-[#6e7681]">{index + 1}</span>{line || " "}</code>)}</pre>
    <p className="sr-only">Viewing {owner}/{repository}</p>
  </>
}
