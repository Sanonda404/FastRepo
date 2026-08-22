import { useEffect, useMemo, useState } from "react"
import {
  BookOpen, Check, ChevronDown, CircleDot, Clock3, Copy, FileCode2, FileText,
  Folder, GitBranch, GitCommitHorizontal, GitFork, GitPullRequest, History,
  Lock, MoreHorizontal, Search, Star
} from "lucide-react"
import { useParams } from "react-router-dom"

import { getErrorMessage } from "@/lib/api"
import { getFile, getRepository, getTree, listBranches, listCommits } from "@/lib/repository_apis"
import type {
  BranchResponse, CommitSummary, FileResponse, RepositoryResponse, TreeEntry,
} from "@/lib/interfaces"
import { formatRelativeDate } from "@/lib/format-date"

const navItems = [
  ["Code", BookOpen], ["Issues", CircleDot], ["Pull requests", GitPullRequest]
] as const

const baseButton = "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export default function RepositoryPage() {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [repoMeta, setRepoMeta] = useState<RepositoryResponse | null>(null)
  const [branchList, setBranchList] = useState<BranchResponse[]>([])
  const [branch, setBranch] = useState("")
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchSearch, setBranchSearch] = useState("")
  const [path, setPath] = useState<string[]>([])
  const [treeResult, setTreeResult] = useState<{ key: string; entries?: TreeEntry[]; error?: string } | null>(null)
  const [latest, setLatest] = useState<CommitSummary | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileResult, setResult] = useState<{ key: string; data?: FileResponse; error?: string } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getRepository(owner, repository), listBranches(owner, repository)])
      .then(([meta, branches]) => {
        if (!active) return
        setRepoMeta(meta)
        setBranchList(branches)
        setBranch(meta.default_branch)
      })
      .catch((err) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@:`, error: getErrorMessage(err) })
      })
    return () => { active = false }
  }, [owner, repository])

  useEffect(() => {
    document.title = `${owner}/${repository}${branch ? ` · ${branch}` : ""} · FastRepo`
  }, [branch, owner, repository])

  const currentPath = path.join("/")
  const treeKey = `${owner}/${repository}@${branch}:${currentPath}`
  const tree = treeResult?.key === treeKey ? treeResult : null

  useEffect(() => {
    if (!branch) return
    let active = true
    getTree(owner, repository, branch, currentPath)
      .then((data) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@${branch}:${currentPath}`, entries: data.entries })
      })
      .catch((err) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@${branch}:${currentPath}`, error: getErrorMessage(err) })
      })
    listCommits(owner, repository, branch, 1)
      .then((commits) => {
        if (active && commits.length > 0) setLatest(commits[0])
      })
      .catch(() => {})
    return () => { active = false }
  }, [owner, repository, branch, currentPath])

  const filePath = selectedFile ? [...path, selectedFile].join("/") : ""

  useEffect(() => {
    if (!selectedFile || !branch) return
    let active = true
    getFile(owner, repository, filePath, branch)
      .then((data) => {
        if (active) setResult({ key: `${owner}/${repository}@${branch}:${filePath}`, data })
      })
      .catch((err) => {
        if (active) setResult({ key: `${owner}/${repository}@${branch}:${filePath}`, error: getErrorMessage(err) })
      })
    return () => { active = false }
  }, [owner, repository, branch, filePath, selectedFile])

  const file = fileResult?.key === `${owner}/${repository}@${branch}:${filePath}` ? fileResult : null

  const visibleBranches = useMemo(
    () => branchList.filter(({ name }) => name.toLowerCase().includes(branchSearch.toLowerCase())),
    [branchList, branchSearch],
  )

  const openFolder = (name: string) => {
    setPath((current) => [...current, name])
    setSelectedFile(null)
  }

  const selectBranch = (name: string) => {
    setBranch(name)
    setPath([])
    setSelectedFile(null)
    setBranchOpen(false)
    setBranchSearch("")
  }

  const navigateToDir = (nextPath: string[]) => {
    setPath(nextPath)
    setSelectedFile(null)
  }

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
            <BookOpen className="size-5 text-muted-foreground" />
            <span className="text-primary">{owner}</span><span className="text-muted-foreground">/</span><span>{repository}</span>
            {repoMeta?.is_private && <span className="ml-1 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground"><Lock className="mr-1 inline size-3" />Private</span>}
            <div className="ml-auto flex gap-2 text-sm">
              <button className={baseButton}><Star className="size-4" /> Star</button>
              <button className={baseButton}><GitFork className="size-4" /> Fork</button>
            </div>
          </div>
          <nav aria-label="Repository navigation" className="mt-6 flex gap-1 overflow-x-auto">
            {navItems.map(([label, Icon]) => <button key={label} className={`relative flex shrink-0 items-center gap-2 rounded-t-md px-3 py-3 text-sm ${label === "Code" ? "border-b-2 border-orange-500 font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" />{label}</button>)}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <button className={`${baseButton} min-w-32 justify-between`} onClick={() => setBranchOpen((open) => !open)} aria-expanded={branchOpen} aria-controls="branch-menu"><span className="flex items-center gap-2"><GitBranch className="size-4" />{branch || "…"}</span><ChevronDown className="size-4" /></button>
            <button className="text-sm text-muted-foreground hover:text-primary">{branchList.length} branches</button>
            {branchOpen && <div id="branch-menu" className="absolute left-0 top-10 w-80 rounded-lg border bg-popover p-3 shadow-xl" role="dialog" aria-label="Select branch">
              <label className="sr-only" htmlFor="branch-search">Find a branch</label>
              <div className="flex items-center gap-2 rounded-md border px-2"><Search className="size-4 text-muted-foreground" /><input id="branch-search" autoFocus value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} placeholder="Find a branch..." className="h-9 w-full bg-transparent text-sm outline-none" /></div>
              <p className="mt-3 px-2 text-xs font-medium text-muted-foreground">BRANCHES</p>
              <div className="mt-1 max-h-52 overflow-y-auto">
                {visibleBranches.map((item) => <button key={item.name} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => selectBranch(item.name)}><GitBranch className="size-4 text-muted-foreground" /><span className="flex-1">{item.name}</span>{item.is_default && <span className="text-xs text-muted-foreground">default</span>}{item.name === branch && <Check className="size-4 text-primary" />}</button>)}
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
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{(latest?.author ?? owner).charAt(0).toUpperCase()}</div>
            <span>{latest ? <><strong>{latest.author}</strong> <span className="text-muted-foreground">committed</span> {latest.message}</> : <span className="text-muted-foreground">Loading history…</span>}</span>
            {latest && <span className="ml-auto flex items-center gap-2 text-muted-foreground"><GitCommitHorizontal className="size-4" />{latest.sha.slice(0, 7)}<span>·</span><Clock3 className="size-4" />{formatRelativeDate(latest.author_date)}<button className="ml-2 flex items-center gap-1 hover:text-primary"><History className="size-4" /> History</button></span>}
          </div>

          {tree?.error && <p className="px-4 py-6 text-sm text-destructive">{tree.error}</p>}
          {!tree?.error && selectedFile && (file?.data || file?.error) && <FileView repository={repository} branch={branch} path={path} fileData={file?.data ?? null} error={file?.error ?? null} onBack={() => navigateToDir([])} onOpenDir={(index) => navigateToDir(path.slice(0, index + 1))} />}
          {!tree?.error && selectedFile && !file && <p className="px-4 py-6 text-sm text-muted-foreground">Loading file…</p>}
          {!tree?.error && !selectedFile && <>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 border-b px-4 py-3 text-sm">
              <button className="font-medium text-primary hover:underline" onClick={() => navigateToDir([])}>{repository}</button>
              {path.map((segment, index) => (
                <span key={segment} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button className="font-medium text-primary hover:underline" onClick={() => navigateToDir(path.slice(0, index + 1))}>{segment}</button>
                </span>
              ))}
            </nav>
            <div role="table" aria-label="Repository file explorer">
              <div role="row" className="hidden grid-cols-[minmax(14rem,2fr)_9rem] gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"><span role="columnheader">Name</span><span role="columnheader">Size</span></div>
              {!tree && <p className="px-4 py-6 text-sm text-muted-foreground">Loading contents…</p>}
              {tree?.entries && path.length > 0 && <button role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 text-left text-sm hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_9rem]" onClick={() => navigateToDir(path.slice(0, -1))}><span className="flex items-center gap-2 text-primary"><Folder className="size-4 fill-current/20" />..</span><span className="text-right text-xs text-muted-foreground sm:text-left sm:text-sm">Up one level</span></button>}
              {tree?.entries?.map((entry) => <button key={entry.name} role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_9rem]" onClick={() => entry.type === "tree" ? openFolder(entry.name) : setSelectedFile(entry.name)}><span className="flex min-w-0 items-center gap-2 font-medium text-primary"><span>{entry.type === "tree" ? <Folder className="size-4 fill-current/20" /> : <FileCode2 className="size-4" />}</span><span className="truncate">{entry.name}</span></span><span className="text-right text-xs text-muted-foreground sm:text-left sm:text-sm">{entry.size != null ? `${entry.size} bytes` : ""}</span></button>)}
            </div>
          </>}
        </section>
      </div>
    </main>
  )
}

function FileView({ repository, branch, path, fileData, error, onBack, onOpenDir }: { repository: string; branch: string; path: string[]; fileData: FileResponse | null; error: string | null; onBack: () => void; onOpenDir: (index: number) => void }) {
  return <>
    <nav aria-label="File breadcrumb" className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm"><div className="flex items-center gap-1"><button onClick={onBack} className="font-medium text-primary hover:underline">{repository}</button><span className="text-muted-foreground">/</span>{path.map((segment, index) => <span key={segment} className="flex items-center gap-1"><button onClick={() => onOpenDir(index)} className="font-medium text-primary hover:underline">{segment}</button><span className="text-muted-foreground">/</span></span>)}<span className="font-medium">{fileData?.name}</span></div><div className="flex gap-2"><button className={baseButton}>Raw</button><button className={baseButton}><Copy className="size-4" /> Copy</button><button className={baseButton}><MoreHorizontal className="size-4" /></button></div></nav>
    {error && <p className="px-4 py-6 text-sm text-destructive">{error}</p>}
    {fileData && <>
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground"><FileText className="size-4" />{fileData.path}<span>·</span><span>{fileData.size} bytes</span><span>·</span><span>{branch}</span><span className="ml-auto flex items-center gap-1"><History className="size-4" /> File history</span></div>
      {fileData.binary ? <p className="px-4 py-6 text-sm text-muted-foreground">Binary file — preview is not available.</p> : <pre className="overflow-x-auto bg-[#0d1117] p-4 text-sm leading-6 text-[#c9d1d9]">{fileData.content.split("\n").map((line, index) => <code key={index} className="block"><span className="mr-5 inline-block w-6 select-none text-right text-[#6e7681]">{index + 1}</span>{line || " "}</code>)}</pre>}
    </>}
  </>
}
