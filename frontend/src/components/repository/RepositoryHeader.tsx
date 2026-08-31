import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitFork, Star } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/apis/api";
import {
  forkRepository,
  getStar,
  listForks,
  starRepository,
  unstarRepository,
} from "@/lib/apis/repository_apis";

type RepositoryHeaderProps = {
  owner: string;
  repository: string;
  repositoryName?: string;
  isPrivate?: boolean;
};

export default function RepositoryHeader({
  owner,
  repository,
  repositoryName,
  isPrivate = false,
}: RepositoryHeaderProps) {
  const displayName = repositoryName ?? repository;
  const visibilityLabel = isPrivate ? "Private" : "Public";
  const navigate = useNavigate();
  const { isLoggedIn, username } = useAuth();

  const [forkCount, setForkCount] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const [isStarred, setIsStarred] = useState(false);

  // fork dialog state
  const [forkOpen, setForkOpen] = useState(false);
  const [forkName, setForkName] = useState("");
  const [forkDescription, setForkDescription] = useState("");
  const [forkIsPrivate, setForkIsPrivate] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const [forkLoading, setForkLoading] = useState(false);

  useEffect(() => {
    let active = true;
    listForks(owner, repository)
      .then((forks) => {
        if (active) setForkCount(forks.length);
      })
      .catch(() => {});
    getStar(owner, repository)
      .then((res) => {
        if (active) {
          setStarCount(res.star_count);
          setIsStarred(res.is_starred);
        }
      })
      .catch(() => {
        if (active) {
          setIsStarred(false);
        }
      });
    return () => {
      active = false;
    };
  }, [owner, repository, isLoggedIn]);

  const handleStar = async () => {
    try {
      const res = isStarred
        ? await unstarRepository(owner, repository)
        : await starRepository(owner, repository);
      setStarCount(res.star_count);
      setIsStarred(res.is_starred);
    } catch {
      // silent, could show toast
    }
  };

  const handleForkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForkError(null);
    setForkLoading(true);
    try {
      const payload: {
        name?: string;
        description?: string;
        is_private: boolean;
      } = {
        is_private: forkIsPrivate,
      };
      if (forkName.trim()) payload.name = forkName.trim();
      if (forkDescription.trim()) payload.description = forkDescription.trim();
      const newRepo = await forkRepository(owner, repository, payload);
      setForkOpen(false);
      setForkName("");
      setForkDescription("");
      setForkIsPrivate(false);
      setForkCount((c) => c + 1);
      if (username) {
        navigate(`/${username}/${newRepo.name}`);
      }
    } catch (err) {
      setForkError(getErrorMessage(err));
    } finally {
      setForkLoading(false);
    }
  };

  return (
    <>
      <header className="flex w-full items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{displayName}</span>
          <span className="inline-flex shrink-0 items-center rounded-full border border-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {visibilityLabel}
          </span>
        </div>

        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 bg-background px-2.5 py-1 text-sm font-medium hover:bg-muted"
            >
              <GitFork className="size-4 shrink-0" aria-hidden="true" />
              <span>Fork</span>
              <span className="text-muted-foreground">{forkCount}</span>
            </button>

            <button
              type="button"
              onClick={handleStar}
              aria-pressed={isStarred}
              aria-label={isStarred ? "Unstar repository" : "Star repository"}
              className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 bg-background px-2.5 py-1 text-sm font-medium hover:bg-muted data-[starred=true]:border-amber-300 data-[starred=true]:bg-amber-50 dark:data-[starred=true]:bg-amber-950/30"
              data-starred={isStarred}
            >
              <Star
                className={`size-4 shrink-0 ${isStarred ? "fill-amber-400 text-amber-500" : ""}`}
                aria-hidden="true"
              />
              <span>{isStarred ? "Starred" : "Star"}</span>
              <span className="text-muted-foreground">{starCount}</span>
            </button>
          </div>
        )}
      </header>

      <Dialog open={forkOpen} onOpenChange={setForkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork repository</DialogTitle>
            <DialogDescription>
              Create a copy of {owner}/{repository} under your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForkSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fork-name">Repository name</Label>
              <Input
                id="fork-name"
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
                placeholder={repository}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fork-description">Description</Label>
              <Textarea
                id="fork-description"
                value={forkDescription}
                onChange={(e) => setForkDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="fork-private"
                checked={forkIsPrivate}
                onCheckedChange={(v) => setForkIsPrivate(v === true)}
              />
              <Label htmlFor="fork-private">Private</Label>
            </div>
            {forkError && (
              <p className="text-sm text-destructive">{forkError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForkOpen(false)}
                disabled={forkLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={forkLoading}>
                {forkLoading ? "Forking..." : "Create fork"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
