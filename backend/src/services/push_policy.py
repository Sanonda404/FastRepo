from dulwich.errors import HookError
from dulwich.objects import ObjectID

from services.git_backend import _AsyncBridge
from services.git_read import changed_paths
from sqls.permission_sqls import CHECK_BRANCH_PERMISSION, CHECK_FOLDER_PERMISSION


ZERO_SHA = b"0" * 40


class PushPolicy:
    def __init__(self, repo_id: int, role: str, user: dict) -> None:
        self.bridge = _AsyncBridge.get_instance()
        self.repo_id = repo_id
        self.role = role
        self.user = user
        self.store = None
        self.commands: list[tuple[ObjectID, ObjectID, bytes]] = []
        self.violations: list[str] = []

    @property
    def bypass(self) -> bool:
        return self.role in ("owner", "Admin", "Maintainer")

    def _run(self, coro):
        return self.bridge.run(coro)

    @property
    def pool(self):
        return self.bridge.pool
    
    def get_base_commit_for_new_branch(self, new_sha: str | bytes) -> str | None:
        """
        Traverses the parent chain of `new_sha` using Dulwich to find the most
        recent commit that ALREADY exists in the database.
        """
        if not self.store:
            return None

        new_sha_str = new_sha.decode("ascii") if isinstance(new_sha, bytes) else new_sha
        start_sha_bytes = new_sha_str.encode("ascii")

        queue = [start_sha_bytes]
        visited = set()

        while queue:
            curr_sha = queue.pop(0)
            if curr_sha in visited:
                continue
            visited.add(curr_sha)

            curr_sha_str = curr_sha.decode("ascii")

            # Skip checking the newly pushed head commit itself
            if curr_sha_str != new_sha_str:
                exists = self._run(self._commit_exists_in_db(curr_sha_str))
                if exists:
                    return curr_sha_str

            try:
                commit_obj = self.store[curr_sha]
                for parent_sha in getattr(commit_obj, "parents", []):
                    if parent_sha not in visited:
                        queue.append(parent_sha)
            except KeyError:
                continue

        return None

    async def _commit_exists_in_db(self, commit_sha: str) -> bool:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT 1 FROM commits WHERE repo_id = $1 AND sha = $2",
                self.repo_id,
                commit_sha,
            )
            return row is not None


class PreReceivePolicyHook:
    def __init__(self, policy: PushPolicy) -> None:
        self._policy = policy

    def execute(self, client_refs) -> tuple[bytes, bytes]:
        policy = self._policy
        if policy.bypass:
            return b"", b""

        for old_sha, new_sha, ref_name in client_refs:
            policy.commands.append((old_sha, new_sha, ref_name))
            if not ref_name.startswith(b"refs/heads/"):
                raise HookError(
                    "only Maintainers and above may update "
                    f"{ref_name.decode('utf-8', 'replace')}"
                )
            branch = ref_name[len(b"refs/heads/"):].decode("utf-8", "replace")
            if not policy._run(_check_branch(policy, branch)):
                raise HookError(f"push to branch '{branch}' denied")

        return b"", b""


class UpdatePolicyHook:
    def __init__(self, policy: PushPolicy) -> None:
        self._policy = policy

    def execute(self, ref_name: bytes, old_sha: bytes, new_sha: bytes) -> tuple[bytes, bytes]:
        policy = self._policy
        if policy.bypass or not ref_name.startswith(b"refs/heads/"):
            return b"", b""

        ZERO_SHA_BYTES = b"0" * 40
        new = new_sha.decode("ascii")

        if old_sha == ZERO_SHA_BYTES or not old_sha:
            old = policy.get_base_commit_for_new_branch(new)
        else:
            old = old_sha.decode("ascii")

        paths_to_check = sorted(changed_paths(policy.repo_id, old, new, store=policy.store))

        denied = [
            path
            for path in paths_to_check
            if not policy._run(_check_folder(policy, path))
        ]

        if denied:
            policy.violations.extend(denied)
            raise HookError("folder write denied: " + ", ".join(denied))

        return b"", b""



async def _check_branch(policy: PushPolicy, branch: str) -> bool:
    async with policy.pool.acquire() as conn:
        row = await conn.fetchrow(
            CHECK_BRANCH_PERMISSION, policy.repo_id, policy.user["id"], branch
        )
    return bool(row and row["allow_write"])


async def _check_folder(policy: PushPolicy, path: str) -> bool:
    async with policy.pool.acquire() as conn:
        row = await conn.fetchrow(
            CHECK_FOLDER_PERMISSION, policy.repo_id, policy.user["id"], path
        )
    return bool(row and row["allow_write"])