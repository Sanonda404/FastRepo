import stat
from datetime import datetime, timezone

import asyncpg
from dulwich.objects import Blob, Commit, Tree
from dulwich.merge import merge_blobs

from models.git import EMPTY_TREE_SHA
from sqls.git_sqls import (
    GET_TREE_ENTRIES,
    GET_PARENTS,
    CHECK_OBJECT_EXISTS,
    INSERT_COMMIT,
    INSERT_COMMIT_PARENT,
    INSERT_BLOB,
    INSERT_TREE_ENTRY,
    SET_REF_IF_EQUALS,
)
from sqls.pull_request_sqls import (
    GET_COMMIT_FOR_COPY,
    GET_BLOB_CONTENT,
    GET_BRANCH_REF,
    CLOSE_PULL_REQUEST,
    ADD_COLLABORATOR_IF_MISSING,
)

class MergeConflictError(Exception):
    def __init__(self, paths: list[str]) -> None:
        self.paths = paths
        super().__init__("Merge conflicts in: " + ", ".join(self.paths))

async def _copy_blob(conn: asyncpg.Connection, src_repo: int, dst_repo: int, sha: str) -> None:
    if await conn.fetchval(CHECK_OBJECT_EXISTS, dst_repo, sha):
        return
    row = await conn.fetchrow(GET_BLOB_CONTENT, src_repo, sha)
    if row is None:
        raise ValueError("Source blob not found")
    await conn.execute(INSERT_BLOB, dst_repo, sha, row["content"], len(row["content"]))

async def _copy_tree(conn: asyncpg.Connection, src_repo: int, dst_repo: int, tree_sha: str) -> None:
    if await conn.fetchval(CHECK_OBJECT_EXISTS, dst_repo, tree_sha):
        return
    await conn.execute(INSERT_TREE_ENTRY, dst_repo, tree_sha, "", 0o040000, None, tree_sha)
    rows = await conn.fetch(GET_TREE_ENTRIES, src_repo, tree_sha)
    for r in rows:
        blob_sha, subtree_sha = (None, r["sha"]) if stat.S_ISDIR(r["mode"]) else (r["sha"], None)
        await conn.execute(
            INSERT_TREE_ENTRY, dst_repo, tree_sha, r["name"], r["mode"], blob_sha, subtree_sha
        )
        if stat.S_ISDIR(r["mode"]):
            await _copy_tree(conn, src_repo, dst_repo, r["sha"])
        else:
            await _copy_blob(conn, src_repo, dst_repo, r["sha"])


async def _copy_reachable(
    conn: asyncpg.Connection, src_repo: int, dst_repo: int, root: str
) -> None:
    stack = [root]
    while stack:
        sha = stack.pop()
        if await conn.fetchval(CHECK_OBJECT_EXISTS, dst_repo, sha):
            continue
        row = await conn.fetchrow(GET_COMMIT_FOR_COPY, src_repo, sha)
        if row is None:
            raise ValueError("Cannot find commit in source repository")
        await conn.execute(
            INSERT_COMMIT,
            dst_repo,
            sha,
            row["content"],
            row["root_tree_sha"],
            row["author_name"],
            row["author_date"],
            row["message"],
        )
        if row["root_tree_sha"] is not None:
            await _copy_tree(conn, src_repo, dst_repo, row["root_tree_sha"])
        parents = await conn.fetch(GET_PARENTS, src_repo, [sha])
        for parent in parents:
            if not await conn.fetchval(CHECK_OBJECT_EXISTS, dst_repo, parent["parent_sha"]):
                stack.append(parent["parent_sha"])


async def _tree_map(
    conn: asyncpg.Connection, repo_id: int, tree_sha: str | None
) -> dict[str, tuple[int, str]]:
    if tree_sha is None:
        return {}
    result: dict[str, tuple[int, str]] = {}
    stack = [("", tree_sha)]
    while stack:
        prefix, ts = stack.pop()
        rows = await conn.fetch(GET_TREE_ENTRIES, repo_id, ts)
        for r in rows:
            path = r["name"] if not prefix else prefix + "/" + r["name"]
            if stat.S_ISDIR(r["mode"]):
                stack.append((path, r["sha"]))
            else:
                result[path] = (r["mode"], r["sha"])
    return result


async def _merge_base(
    conn: asyncpg.Connection, repo_id: int, a: str, b: str
) -> str | None:
    ancestors: set[str] = set()
    stack = [a]
    while stack:
        batch = [s for s in stack if s not in ancestors]
        if not batch:
            break
        ancestors.update(batch)
        rows = await conn.fetch(GET_PARENTS, repo_id, batch)
        stack = [r["parent_sha"] for r in rows if r["parent_sha"] not in ancestors]

    seen: set[str] = set()
    stack = [b]
    while stack:
        batch = [s for s in stack if s not in seen]
        if not batch:
            break
        seen.update(batch)
        for s in batch:
            if s in ancestors:
                return s
        rows = await conn.fetch(GET_PARENTS, repo_id, batch)
        stack = [r["parent_sha"] for r in rows if r["parent_sha"] not in seen]
    return None


async def _three_way_map(
    conn: asyncpg.Connection,
    repo_id: int,
    base: dict[str, tuple[int, str]],
    ours: dict[str, tuple[int, str]],
    theirs: dict[str, tuple[int, str]],
):
    merged: dict[str, tuple[int, str]] = {}
    contents: dict[str, bytes] = {}

    def _load(sha: str | None) -> Blob | None:
        if sha is None:
            return None
        return Blob.from_string(contents[sha])

    conflicts: list[str] = []
    for path in sorted(set(base) | set(ours) | set(theirs)):
        b = base.get(path)
        o = ours.get(path)
        t = theirs.get(path)
        if o == t:
            if o is not None:
                merged[path] = o
            continue
        if b == o:
            if t is not None:
                merged[path] = t
            continue
        if b == t:
            if o is not None:
                merged[path] = o
            continue
        if o is None or t is None:
            conflicts.append(path)
            continue
        if ((o[0] & 0o170000) == 0o040000) or ((t[0] & 0o170000) == 0o040000):
            conflicts.append(path)
            continue

        for sha in (b[1] if b else None, o[1], t[1]):
            if sha is not None and sha not in contents:
                row = await conn.fetchrow(GET_BLOB_CONTENT, repo_id, sha)
                contents[sha] = row["content"] if row else b""

        content, conflict = merge_blobs(
            _load(b[1]) if b else None,
            _load(o[1]),
            _load(t[1]),
            path.encode("utf-8", "replace"),
        )
        if conflict:
            conflicts.append(path)
        mblob = Blob.from_string(content)
        merged_sha = mblob.id.decode("ascii")
        contents[merged_sha] = content
        merged[path] = (o[0], merged_sha)

    if conflicts:
        raise MergeConflictError(conflicts)
    return merged, contents


def _build_trees(entries: dict[str, tuple[int, str]]) -> tuple[list[Tree], bytes | None]:
    """Build nested dulwich Trees from flat path map. Returns (all_trees, root_sha)."""
    nested: dict[str, object] = {}
    for path, (mode, sha) in entries.items():
        parts = path.split("/")
        cur: dict[str, object] = nested
        for part in parts[:-1]:
            cur = cur.setdefault(part, {})  # type: ignore[assignment]
        cur[parts[-1]] = (mode, sha)

    trees: list[Tree] = []

    def build(data: dict[str, object]) -> bytes | None:
        object_tree = Tree()
        for name, value in data.items():
            if isinstance(value, dict):
                child_sha = build(value)
                if child_sha is not None:
                    object_tree.add(name.encode(), 0o040000, child_sha)
            else:
                mode, sha = value
                object_tree.add(name.encode(), mode, sha.encode("ascii"))
        object_tree.id  # ensure sha computed
        trees.append(object_tree)
        return object_tree.id

    root_sha = build(nested)
    return trees, root_sha


async def merge_pull_request(
    pool: asyncpg.Pool,
    pull_id: int,
    author_id: int,
    actor: dict,
    target_repo: dict,
    source_branch: str,
    target_branch: str,
    source_repository_id: int | None,
) -> str:
    target_repo_id = target_repo["id"]
    source_repo_id = source_repository_id or target_repo_id

    async with pool.acquire() as conn:
        async with conn.transaction():
            target_ref = f"refs/heads/{target_branch}"
            source_ref = f"refs/heads/{source_branch}"
            target_head = await conn.fetchval(GET_BRANCH_REF, target_repo_id, target_ref)
            source_head = await conn.fetchval(GET_BRANCH_REF, source_repo_id, source_ref)
            if source_head is None:
                raise ValueError(f"Source branch '{source_branch}' does not exist")
            if target_head is None:
                raise ValueError(f"Target branch '{target_branch}' does not exist")
            if source_head == target_head:
                raise ValueError("Source and target branches point to the same commit")

            await _copy_reachable(conn, source_repo_id, target_repo_id, source_head)

            base_commit = await _merge_base(conn, target_repo_id, source_head, target_head)
            base_tree = None
            if base_commit is not None:
                base_row = await conn.fetchrow(GET_COMMIT_FOR_COPY, target_repo_id, base_commit)
                base_tree = base_row["root_tree_sha"]
            if base_tree is None:
                base_map: dict[str, tuple[int, str]] = {}
            else:
                base_map = await _tree_map(conn, target_repo_id, base_tree)

            src_row = await conn.fetchrow(GET_COMMIT_FOR_COPY, target_repo_id, source_head)
            tgt_row = await conn.fetchrow(GET_COMMIT_FOR_COPY, target_repo_id, target_head)
            theirs_map = await _tree_map(conn, target_repo_id, src_row["root_tree_sha"])
            ours_map = await _tree_map(conn, target_repo_id, tgt_row["root_tree_sha"])

            merged, contents = await _three_way_map(conn, target_repo_id, base_map, ours_map, theirs_map)

            trees, raw_root = _build_trees(merged)
            stored_root = (
                raw_root.decode("ascii")
                if raw_root is not None and raw_root != EMPTY_TREE_SHA
                else None
            )
            if stored_root is None:
                root_for_commit = EMPTY_TREE_SHA
            else:
                root_for_commit = raw_root

            for sha, content in contents.items():
                await conn.execute(INSERT_BLOB, target_repo_id, sha, content, len(content))
            if trees:
                for tree in trees:
                    tid = tree.id.decode("ascii")
                    await conn.execute(
                        INSERT_TREE_ENTRY, target_repo_id, tid, "", 0o040000, None, tid
                    )
                    for name, mode, sha in tree.items():
                        blob_sha, subtree_sha = (None, sha.decode("ascii")) if stat.S_ISDIR(mode) else (sha.decode("ascii"), None)
                        await conn.execute(
                            INSERT_TREE_ENTRY, target_repo_id, tid, name.decode("utf-8", "replace"), mode, blob_sha, subtree_sha
                        )

            message = f"Merge pull request #{pull_id}: {source_branch} into {target_branch}"
            now = int(datetime.now(timezone.utc).timestamp())
            commit = Commit()
            commit.tree = root_for_commit
            commit.parents = [target_head.encode("ascii"), source_head.encode("ascii")]
            author_line = f"{actor['username']} <{actor['email']}>".encode()
            commit.author = author_line
            commit.committer = author_line
            commit.author_time = now
            commit.commit_time = now
            commit.author_timezone = 0
            commit.commit_timezone = 0
            commit.message = message.encode()
            raw = commit.as_raw_string()
            merge_sha = commit.id.decode("ascii")

            await conn.execute(
                INSERT_COMMIT,
                target_repo_id,
                merge_sha,
                raw,
                stored_root,
                actor["username"],
                datetime.fromtimestamp(now, tz=timezone.utc),
                message,
            )
            for index, parent in enumerate(commit.parents):
                await conn.execute(
                    INSERT_COMMIT_PARENT, target_repo_id, merge_sha, parent.decode("ascii"), index
                )

            updated = await conn.fetchval(SET_REF_IF_EQUALS, target_repo_id, target_ref, merge_sha, None, target_head)
            if updated is None:
                raise ValueError("Target branch changed during merge")

            await conn.execute(CLOSE_PULL_REQUEST, pull_id)
            if author_id and author_id != target_repo["owner_id"]:
                await conn.execute(ADD_COLLABORATOR_IF_MISSING, target_repo_id, author_id)

            return merge_sha
