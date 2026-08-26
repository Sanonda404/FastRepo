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
        if new_sha == ZERO_SHA:
            return b"", b""

        old = old_sha.decode("ascii") if old_sha != ZERO_SHA else None
        new = new_sha.decode("ascii")
        denied = [
            path
            for path in sorted(changed_paths(policy.repo_id, old, new))
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