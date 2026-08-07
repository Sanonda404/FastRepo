import difflib
import re
import stat

import asyncpg

from dulwich.diff_tree import (
    CHANGE_ADD,
    CHANGE_COPY,
    CHANGE_DELETE,
    CHANGE_MODIFY,
    CHANGE_RENAME,
    RenameDetector,
    tree_changes,
)
from dulwich.objects import ShaFile

from services.git_backend import ObjectStore
from sqls.git_sqls import (
    GET_BLOBS,
    GET_BRANCH_REFS,
    GET_COMMIT_META,
    GET_COMMITS_META,
    GET_PARENTS,
    GET_TREE_ENTRIES_WITH_SIZES,
    READ_LOOSE_REF,
)

_SHA_RE = re.compile(rb"^[0-9a-f]{40}$")
_CHANGE_STATUS = {
    CHANGE_ADD: "added",
    CHANGE_MODIFY: "modified",
    CHANGE_DELETE: "deleted",
    CHANGE_RENAME: "renamed",
    CHANGE_COPY: "copied",
}

async def _read_ref(pool: asyncpg.Pool, repo_id: int, name: bytes) -> bytes | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(READ_LOOSE_REF, repo_id, name)
        return row["value"] if row else None

async def resolve_ref(pool: asyncpg.Pool, repo_id: int, ref: str | None) -> bytes | None:
    if ref is None:
        head = await _read_ref(pool, repo_id, b"HEAD")
        if head and head.startswith(b"ref: "):
            target = head[5:]
            value = await _read_ref(pool, repo_id, target)
            if value:
                return value
        async with pool.acquire() as conn:
            rows = await conn.fetch(GET_BRANCH_REFS, repo_id)
        return rows[0]["value"] if rows else None

    key = ref.encode()
    value = await _read_ref(pool, repo_id, b"refs/heads/" + key)
    if value is None:
        value = await _read_ref(pool, repo_id, b"refs/tags/" + key)
    if value:
        return await _peel_to_commit(repo_id, value)
    if _SHA_RE.match(key):
        async with pool.acquire() as conn:
            row = await conn.fetchrow(GET_COMMIT_META, repo_id, key)
        return row["sha"] if row else None
    return None


async def _peel_to_commit(repo_id: int, sha: bytes) -> bytes:
    store = ObjectStore(repo_id)
    current = sha
    for _ in range(10):
        try:
            obj = store[current]
        except KeyError:
            return current
        if obj.type_num != 4:
            return current
        current = obj.object[1]
        
    return current

def _to_str(data: bytes | None) -> str | None:
    if data is None:
        return None
    return data.decode("utf-8", "replace")

async def get_branches(pool: asyncpg.Pool, repo_id: int) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_BRANCH_REFS, repo_id)
    head = await _read_ref(pool, repo_id, b"HEAD")
    default = head[5:] if head and head.startswith(b"ref: ") else None
    prefix = len(b"refs/heads/")
    return [
        {
            "name": _to_str(row["name"])[prefix:],
            "sha": row["value"].decode("ascii"),
            "is_default": row["name"] == default,
        }
        for row in rows
    ]


async def get_history(
    pool: asyncpg.Pool, repo_id: int, head_sha: bytes, limit: int, offset: int
) -> list[dict]:
    """BFS over parent edges"""
    order: list[bytes] = []
    seen: set[bytes] = set()
    pending: list[bytes] = [head_sha]
    seen.add(head_sha)
    while pending:
        batch = pending
        pending = []
        async with pool.acquire() as conn:
            edges = await conn.fetch(GET_PARENTS, repo_id, batch)
        parents: dict[bytes, list[bytes]] = {}
        for row in edges:
            parents.setdefault(row["commit_sha"], []).append(row["parent_sha"])
        for sha in batch:
            order.append(sha)
            if len(order) >= offset + limit:
                pending = []
                break
            for parent_sha in parents.get(sha, []):
                if parent_sha not in seen:
                    seen.add(parent_sha)
                    pending.append(parent_sha)

    slice_shas = order[offset:]
    if not slice_shas:
        return []
    async with pool.acquire() as conn:
        metas = await conn.fetch(GET_COMMITS_META, repo_id, slice_shas)
    by_sha = {m["sha"]: m for m in metas}
    result = []
    for sha in slice_shas:
        m = by_sha.get(sha)
        if m is None:
            continue
        result.append({
            "sha": sha.decode("ascii"),
            "author": _to_str(m["author_name"]) or "",
            "author_email": m["author_email"],
            "author_date": m["author_date"],
            "message": (_to_str(m["message"]) or "").rstrip("\n"),
        })
    return result


async def get_commit(pool: asyncpg.Pool, repo_id: int, sha: bytes) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(GET_COMMIT_META, repo_id, sha)
        if row is None:
            return None
        parents = await conn.fetch(GET_PARENTS, repo_id, [sha])
    return {
        "sha": sha.decode("ascii"),
        "author": _to_str(row["author_name"]) or "",
        "author_email": row["author_email"],
        "author_date": row["author_date"],
        "message": (_to_str(row["message"]) or "").rstrip("\n"),
        "parents": [p["parent_sha"].decode("ascii") for p in parents],
        "root_tree_sha": row["root_tree_sha"].decode("ascii"),
    }


async def get_diff(
    pool: asyncpg.Pool, repo_id: int, old_tree: bytes, new_tree: bytes
) -> list[dict]:
    store = ObjectStore(repo_id)
    try:
        changes = list(tree_changes(
            store,
            old_tree,
            new_tree,
            want_unchanged=False,
            rename_detector=RenameDetector(store),
        ))
        
    except KeyError:
        return []

    blob_shas = set()
    for change in changes:
        for entry in (change.old, change.new):
            if entry is not None:
                blob_shas.add(entry.sha)
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_BLOBS, repo_id, list(blob_shas))
    blob_data = {
        r["sha"]: _blob_data(r["content"])
        for r in rows
        if r["content"] is not None
    }

    files = []
    for change in changes:
        if change.new is None:
            continue
        entry = change.new
        path = entry.path.decode("utf-8", "replace")
        old_entry = change.old
        old_path = None
        if old_entry is not None and old_entry.path != entry.path:
            old_path = old_entry.path.decode("utf-8", "replace")

        old_bytes = blob_data.get(old_entry.sha) if old_entry else b""
        new_bytes = blob_data.get(entry.sha)
        if old_bytes is None:
            old_bytes = b""
        if new_bytes is None:
            new_bytes = b""

        binary = b"\x00" in old_bytes or b"\x00" in new_bytes
        additions = deletions = 0
        diff_text = None
        if not binary:
            def _text_lines(data: bytes) -> list[str]:
                return data.decode("utf-8", "replace").splitlines()

            diff_lines = list(difflib.unified_diff(
                _text_lines(old_bytes),
                _text_lines(new_bytes),
                fromfile=f"a/{old_path or path}",
                tofile=f"b/{path}",
                lineterm="\n",
            ))
            for line in diff_lines:
                if line.startswith("+") and not line.startswith("+++"):
                    additions += 1
                elif line.startswith("-") and not line.startswith("---"):
                    deletions += 1
            diff_text = "".join(diff_lines)

        files.append({
            "path": path,
            "old_path": old_path,
            "status": _CHANGE_STATUS.get(change.type, "modified"),
            "additions": additions,
            "deletions": deletions,
            "binary": binary,
            "diff": diff_text,
        })
    return files


def _blob_data(content: bytes) -> bytes:
    try:
        return ShaFile.from_string(content).data
    except Exception:
        return content.split(b"\x00", 1)[1] if b"\x00" in content else content

async def get_tree(
    pool: asyncpg.Pool, repo_id: int, ref: str | None, path: str
) -> dict | None:
    commit_sha = await resolve_ref(pool, repo_id, ref)
    if commit_sha is None:
        return None
    async with pool.acquire() as conn:
        commit_row = await conn.fetchrow(GET_COMMIT_META, repo_id, commit_sha)
        if commit_row is None:
            return None
        tree_sha = commit_row["root_tree_sha"]
        parts = [p.encode() for p in path.split("/") if p]
        for part in parts:
            row = await conn.fetchrow(
                "SELECT sha, mode FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2 AND name = $3",
                repo_id, tree_sha, part,
            )
            if row is None or not stat.S_ISDIR(row["mode"]):
                return None
            tree_sha = row["sha"]
        entries_rows = await conn.fetch(GET_TREE_ENTRIES_WITH_SIZES, repo_id, tree_sha)

    entries = []
    for r in entries_rows:
        is_dir = stat.S_ISDIR(r["mode"])
        entries.append({
            "name": r["name"].decode("utf-8", "replace"),
            "type": "tree" if is_dir else "blob",
            "mode": r["mode"],
            "sha": r["sha"].decode("ascii"),
            "size": None if is_dir else r["size"] or 0,
        })
    return {
        "commit": commit_sha.decode("ascii"),
        "tree": tree_sha.decode("ascii"),
        "path": path.strip("/"),
        "entries": entries,
    }
