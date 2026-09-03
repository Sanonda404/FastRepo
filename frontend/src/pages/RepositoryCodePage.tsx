import { useEffect, useMemo, useState } from "react"
import {
  Check, ChevronDown, Copy, FileCode2, FileText,
  Folder, GitBranch, GitCommitHorizontal, History,
  Search
} from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { CodeViewer } from "@/components/code/CodeViewer"
import GoToFileDialog from "@/components/code/GoToFileDialog"
import RepositoryHeader from "@/components/repository/RepositoryHeader"
import RepositoryAboutStats from "@/components/repository/RepositoryAboutStats"
import { buttonVariants } from "@/components/ui/button-variants"
import { getErrorMessage } from "@/lib/apis/api"
import {
  getFile, getTree, listBranches, listCollaborators, listCommits,
} from "@/lib/apis/repository_apis"
import type {
  BranchResponse, CollaboratorResponse, CommitSummary, FileResponse,
  RepositoryResponse, TreeEntry,
} from "@/lib/interfaces"

export default function RepositoryCodePage({ repoMeta }: { repoMeta: RepositoryResponse | null }) {
  const { owner = "jane", repository = "fastrepo" } = useParams()
  const [branchList, setBranchList] = useState<BranchResponse[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[] | null>(null)
  const [branch, setBranch] = useState("")
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchSearch, setBranchSearch] = useState("")
  const [path, setPath] = useState<string[]>([])
  const [treeResult, setTreeResult] = useState<{ key: string; entries?: TreeEntry[]; error?: string } | null>(null)
  const [latest, setLatest] = useState<CommitSummary | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [goToFileOpen, setGoToFileOpen] = useState(false)
  const [fileResult, setResult] = useState<{ key: string; data?: FileResponse; error?: string } | null>(null)

  useEffect(() => {
    let active = true
    listBranches(owner, repository)
      .then((branches) => {
        if (active) setBranchList(branches)
      })
      .catch((err) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@:`, error: getErrorMessage(err) })
      })
    return () => { active = false }
  }, [owner, repository])

  useEffect(() => {
    let active = true
    listCollaborators(owner, repository)
      .then((people) => {
        if (active) setCollaborators(people.filter((person) => person.username !== owner))
      })
      .catch(() => {
        if (active) setCollaborators([])
      })
    return () => { active = false }
  }, [owner, repository])

  const activeBranch = branch || repoMeta?.default_branch || ""
  useEffect(() => {
    document.title = `${owner}/${repository}${activeBranch ? ` · ${activeBranch}` : ""} · FastRepo`
  }, [activeBranch, owner, repository])

  const currentPath = path.join("/")
  const treeKey = `${owner}/${repository}@${activeBranch}:${currentPath}`
  const tree = treeResult?.key === treeKey ? treeResult : null

  useEffect(() => {
    if (!activeBranch) return
    let active = true
    getTree(owner, repository, activeBranch, currentPath)
      .then((data) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@${activeBranch}:${currentPath}`, entries: data.entries })
      })
      .catch((err) => {
        if (active) setTreeResult({ key: `${owner}/${repository}@${activeBranch}:${currentPath}`, error: getErrorMessage(err) })
      })
    listCommits(owner, repository, activeBranch, 1)
      .then((commits) => {
        if (active && commits.length > 0) setLatest(commits[0])
      })
      .catch(() => {})
    return () => { active = false }
  }, [owner, repository, activeBranch, currentPath])

  const filePath = selectedFile ? [...path, selectedFile].join("/") : ""

  useEffect(() => {
    if (!selectedFile || !activeBranch) return
    let active = true
    getFile(owner, repository, filePath, activeBranch)
      .then((data) => {
        if (active) setResult({ key: `${owner}/${repository}@${activeBranch}:${filePath}`, data })
      })
      .catch((err) => {
        if (active) setResult({ key: `${owner}/${repository}@${activeBranch}:${filePath}`, error: getErrorMessage(err) })
      })
    return () => { active = false }
  }, [owner, repository, activeBranch, filePath, selectedFile])

  const visibleBranches = useMemo(
    () => branchList.filter(({ name }) => name.toLowerCase().includes(branchSearch.toLowerCase())),
    [branchList, branchSearch],
  )
  const file = fileResult?.key === `${owner}/${repository}@${activeBranch}:${filePath}` ? fileResult : null
  const contributors = [
    { username: owner, role: "owner" },
    ...(collaborators ?? []).map(({ username, role }) => ({ username, role })),
  ]

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
    <div className="flex flex-col">
      <RepositoryHeader owner={owner} repository={repository} repositoryName={repoMeta?.name ?? repository} isPrivate={repoMeta?.is_private ?? false} />
      <div aria-hidden="true" className="h-px w-full bg-foreground/10" />
      <div aria-hidden="true" className="h-4" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex items-center gap-2">
                <button className={`${buttonVariants({ variant: "outline", size: "sm" })} min-w-32 justify-between`} onClick={() => setBranchOpen((open) => !open)} aria-expanded={branchOpen} aria-controls="branch-menu"><span className="flex items-center gap-2"><GitBranch className="size-3.5" />{activeBranch || "…"}</span><ChevronDown className="size-3.5" /></button>
                <button className="text-sm text-muted-foreground hover:text-primary">{branchList.length} branches</button>
                {branchOpen && <div id="branch-menu" className="absolute left-0 top-9 w-72 rounded-xl bg-popover p-3 ring-1 ring-foreground/10 shadow-xl" role="dialog" aria-label="Select branch">
                  <label className="sr-only" htmlFor="branch-search">Find a branch</label>
                  <div className="flex items-center gap-2 rounded-md border border-foreground/10 px-2"><Search className="size-4 text-muted-foreground" /><input id="branch-search" autoFocus value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} placeholder="Find a branch..." className="h-9 w-full bg-transparent text-sm outline-none" /></div>
                  <p className="mt-3 px-2 text-xs font-medium text-muted-foreground">BRANCHES</p>
                  <div className="mt-1 max-h-52 overflow-y-auto">
                    {visibleBranches.map((item) => <button key={item.name} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted" onClick={() => selectBranch(item.name)}><GitBranch className="size-4 text-muted-foreground" /><span className="flex-1">{item.name}</span>{item.is_default && <span className="text-xs text-muted-foreground">default</span>}{item.name === activeBranch && <Check className="size-4 text-primary" />}</button>)}
                    {!visibleBranches.length && <p className="p-3 text-sm text-muted-foreground">No branches found.</p>}
                  </div>
                  <button className="mt-2 w-full border-t border-foreground/10 pt-3 text-left text-sm font-medium text-primary hover:underline">View all branches</button>
                </div>}
              </div>
              <button className={buttonVariants({ variant: "outline", size: "sm" })} onClick={() => setGoToFileOpen(true)}><Search className="size-3.5" /> Go to file</button>
            </div>

            <section aria-label="Repository contents" className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center gap-3 border-b border-foreground/10 px-4 py-3 text-sm">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{(latest?.author ?? owner).charAt(0).toUpperCase()}</div>
                <span>                 {latest ? <><strong><Link to={`/${latest.author}`} className="hover:underline">{latest.author}</Link></strong> <span className="text-muted-foreground">committed</span> {latest.message}</> : <span className="text-muted-foreground">Loading history…</span>}</span>
                {latest && <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><GitCommitHorizontal className="size-4" />{latest.sha.slice(0, 7)}<button className="ml-2 flex items-center gap-1 hover:text-primary"><History className="size-4" /> History</button></span>}
              </div>

              {tree?.error && <p className="px-4 py-6 text-sm text-destructive">{tree.error}</p>}
              {!tree?.error && selectedFile && (file?.data || file?.error) && <FileView repository={repository} branch={activeBranch} path={path} fileData={file?.data ?? null} error={file?.error ?? null} onBack={() => navigateToDir([])} onOpenDir={(index) => navigateToDir(path.slice(0, index + 1))} />}
              {!tree?.error && selectedFile && !file && <p className="px-4 py-6 text-sm text-muted-foreground">Loading file…</p>}
              {!tree?.error && !selectedFile && <>
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 border-b border-foreground/10 px-4 py-3 text-sm">
                  <button className="font-medium text-primary hover:underline" onClick={() => navigateToDir([])}>{repository}</button>
                  {path.map((segment, index) => (
                    <span key={segment} className="flex items-center gap-1">
                      <span className="text-muted-foreground">/</span>
                      <button className="font-medium text-primary hover:underline" onClick={() => navigateToDir(path.slice(0, index + 1))}>{segment}</button>
                    </span>
                  ))}
                </nav>
                <div role="table" aria-label="Repository file explorer">
                  <div role="row" className="hidden grid-cols-[minmax(14rem,2fr)_9rem] gap-4 border-b border-foreground/10 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"><span role="columnheader">Name</span><span role="columnheader">Size</span></div>
                  {!tree && <p className="px-4 py-6 text-sm text-muted-foreground">Loading contents…</p>}
                  {tree?.entries && path.length > 0 && <button role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-foreground/10 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_9rem]" onClick={() => navigateToDir(path.slice(0, -1))}><span className="flex items-center gap-2 text-primary"><Folder className="size-4 fill-current/20" />..</span><span className="text-right text-xs text-muted-foreground sm:text-left sm:text-sm">Up one level</span></button>}
                  {tree?.entries?.map((entry) => <button key={entry.name} role="row" className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-foreground/10 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/50 sm:grid-cols-[minmax(14rem,2fr)_9rem]" onClick={() => entry.type === "tree" ? openFolder(entry.name) : setSelectedFile(entry.name)}><span className="flex min-w-0 items-center gap-2 font-medium text-primary"><span>{entry.type === "tree" ? <Folder className="size-4 fill-current/20" /> : <FileCode2 className="size-4" />}</span><span className="truncate">{entry.name}</span></span><span className="text-right text-xs text-muted-foreground sm:text-left sm:text-sm">{entry.size != null ? `${entry.size} bytes` : ""}</span></button>)}
                </div>
              </>}
            </section>
          </div>

          <aside data-testid="repo-sidebar" className="flex flex-col gap-4">
            <section aria-label="About this repository" className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <h2 className="text-sm font-semibold">About</h2>
              <p className="mt-2 text-sm text-muted-foreground">
              {repoMeta === null
                ? "Loading description…"
                : repoMeta?.description || "No description provided."}
            </p>
              <RepositoryAboutStats owner={owner} repository={repository} />
            </section>

            <section aria-label="Contributors" className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <h2 className="text-sm font-semibold">Contributors</h2>
              {collaborators === null && <p className="mt-2 text-sm text-muted-foreground">Loading contributors…</p>}
              <ul className="mt-3 flex flex-col gap-3">
                {contributors.map((person) => (
                  <li key={person.username} className="flex items-center gap-2 text-sm">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {person.username.charAt(0).toUpperCase()}
                    </div>
                    <Link to={`/${person.username}`} className="truncate font-medium hover:underline">{person.username}</Link>
                    <span className="ml-auto rounded-full border border-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">{person.role === "owner" ? "Owner" : person.role}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <GoToFileDialog
            open={goToFileOpen}
            owner={owner}
            repository={repository}
            branch={activeBranch}
            onClose={() => setGoToFileOpen(false)}
            onSelect={(path) => {
              const parts = path.split("/")
              const file = parts.pop() ?? ""
              setPath(parts)
              setSelectedFile(file)
            }}
          />
        </div>
      </div>
  )
}

function FileView({ repository, branch, path, fileData, error, onBack, onOpenDir }: { repository: string; branch: string; path: string[]; fileData: FileResponse | null; error: string | null; onBack: () => void; onOpenDir: (index: number) => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!fileData) return
    navigator.clipboard.writeText(fileData.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return <>
    <nav aria-label="File breadcrumb" className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3 text-sm"><div className="flex items-center gap-1"><button onClick={onBack} className="font-medium text-primary hover:underline">{repository}</button><span className="text-muted-foreground">/</span>{path.map((segment, index) => <span key={segment} className="flex items-center gap-1"><button onClick={() => onOpenDir(index)} className="font-medium text-primary hover:underline">{segment}</button><span className="text-muted-foreground">/</span></span>)}<span className="font-medium">{fileData?.name}</span></div>{fileData && <div className="flex gap-2"><button className={buttonVariants({ variant: "outline", size: "xs" })} onClick={handleCopy}><Copy className="size-3.5" /> {copied ? "Copied" : "Copy"}</button></div>}</nav>
    {error && <p className="px-4 py-6 text-sm text-destructive">{error}</p>}
    {fileData && <>
      <div className="flex items-center gap-3 border-b border-foreground/10 bg-muted/30 px-4 py-2 text-xs text-muted-foreground"><FileText className="size-4" />{fileData.path}<span>·</span><span>{fileData.size} bytes</span><span>·</span><span>{branch}</span></div>
      {fileData.binary ? <p className="px-4 py-6 text-sm text-muted-foreground">Binary file — preview is not available.</p> : <CodeViewer code={fileData.content} filename={fileData.name} />}
    </>}
  </>
}