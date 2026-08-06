import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest
import asyncpg

from services.git_backend import ObjectStore, RefContainer, FastRepo, _AsyncBridge
from models.git import ensure_tables, EMPTY_TREE_SHA
from services.database import DATABASE_URL

import asyncio

pytestmark = pytest.mark.asyncio


async def setup_test_db():
    pool = await asyncpg.create_pool(DATABASE_URL)
    from models.users import ensure_users_table
    from models.repository import ensure_repositories_table
    from models.repository_collaborators import ensure_repository_collaborators_table
    from models.team import ensure_teams_table
    from models.team_members import ensure_team_members_table
    await ensure_users_table(pool)
    await ensure_repositories_table(pool)
    await ensure_repository_collaborators_table(pool)
    await ensure_teams_table(pool)
    await ensure_team_members_table(pool)
    await ensure_tables(pool)
    return pool


def run_git(repo_dir: Path, *args) -> subprocess.CompletedProcess:
    is_bare = (
        repo_dir.is_dir()
        and (repo_dir / "HEAD").is_file()
        and (repo_dir / "objects").is_dir()
        and not (repo_dir / ".git").exists()
    )
    git_target = ["--git-dir", str(repo_dir)] if is_bare else ["-C", str(repo_dir)]
    return subprocess.run(
        ["git", *git_target, *args],
        capture_output=True,
        text=True,
    )


def create_commit(repo_dir: Path, filename: str, content: str, message: str) -> str:
    run_git(repo_dir, "config", "user.name", "Test User")
    run_git(repo_dir, "config", "user.email", "test@example.com")
    file_path = repo_dir / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)
    run_git(repo_dir, "add", filename)
    run_git(repo_dir, "commit", "--allow-empty", "-m", message)
    result = run_git(repo_dir, "rev-parse", "HEAD")
    return result.stdout.strip()


def get_refs(repo_dir: Path) -> dict:
    result = run_git(repo_dir, "for-each-ref", "--format=%(refname) %(objectname)")
    refs = {}
    for line in result.stdout.strip().split("\n"):
        if line:
            ref, sha = line.split(" ", 1)
            refs[ref] = sha
    return refs


async def _tree_exists(repo_id: int, tree_sha: bytes) -> bool:
    async def _check():
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            return await conn.fetchval(
                "SELECT 1 FROM tree_entries WHERE repo_id = $1 AND tree_sha = $2",
                repo_id, tree_sha,
            ) is not None
        finally:
            await conn.close()

    return await _check()


class TestGitBackend:
    @pytest.fixture(scope="class")
    def pool(self):
        loop = asyncio.new_event_loop()
        pool = loop.run_until_complete(setup_test_db())
        yield pool
        loop.run_until_complete(pool.close())
        loop.close()

    @pytest.fixture
    def bridge(self, pool):
        _AsyncBridge._instance = None
        bridge = _AsyncBridge.get_instance(DATABASE_URL)
        yield bridge
        bridge.close()

    @pytest.fixture
    def repo_id(self):
        import random
        loop = asyncio.new_event_loop()

        async def _seed():
            conn = await asyncpg.connect(DATABASE_URL)
            try:
                user_id = await conn.fetchval(
                    "INSERT INTO users (username, email, password_hash) "
                    "VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
                    f"tu{random.randint(0, 10**9)}",
                    f"tu{random.randint(0, 10**9)}@t.com",
                    "x",
                )
                if user_id is None:
                    user_id = await conn.fetchval("SELECT id FROM users LIMIT 1")
                rid = random.randint(10000, 99999)
                for extra in (0, 1):
                    await conn.execute(
                        "INSERT INTO repositories (id, owner_id, name) "
                        "VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
                        rid + extra, user_id, f"repo_{rid + extra}",
                    )
                return rid
            finally:
                await conn.close()

        try:
            return loop.run_until_complete(_seed())
        finally:
            loop.close()

    def test_object_roundtrip_byte_identical(self, bridge, repo_id):
        store = ObjectStore(repo_id, bridge=bridge)

        from dulwich.repo import Repo
        from dulwich.objects import Blob, Commit, Tag, Tree

        tmp = tempfile.mkdtemp()
        try:
            repo_path = Path(tmp) / "test_repo"
            repo_path.mkdir()
            run_git(repo_path, "init")
            run_git(repo_path, "config", "user.name", "Test")
            run_git(repo_path, "config", "user.email", "test@test.com")

            create_commit(repo_path, "file1.txt", "content1", "First commit")
            create_commit(repo_path, "dir/file2.txt", "content2", "Second commit")
            create_commit(repo_path, "file3.txt", "content3", "Third commit")

            # Annotated tag (creates a tag object in tags table)
            run_git(repo_path, "tag", "-a", "v1.0", "-m", "Version 1.0", "HEAD~2")
            # Lightweight tag (no tag object)
            run_git(repo_path, "tag", "v2.0", "HEAD")

            dulwich_repo = Repo(str(repo_path))
            original_objects = {}
            for sha in dulwich_repo.object_store:
                obj = dulwich_repo.object_store[sha]
                original_objects[sha] = obj

            # single transaction: object order in the pack is arbitrary,
            # deferred FKs need all rows visible before the commit point
            store.add_objects([(obj, None) for obj in original_objects.values()])

            for sha, original_obj in original_objects.items():
                retrieved = store[sha]
                assert retrieved.id == original_obj.id, f"SHA mismatch for {sha}"
                assert retrieved.as_raw_string() == original_obj.as_raw_string(), f"Byte mismatch for {sha}"
                assert retrieved.type_num == original_obj.type_num, f"Type mismatch for {sha}"

            tree_shas = [sha for sha, obj in original_objects.items() if obj.type_num == 2]
            for tree_sha in tree_shas:
                raw = store.get_raw(tree_sha)
                assert raw[0] == 2
                original_tree = original_objects[tree_sha]
                assert raw[1] == original_tree.as_raw_string(), f"Tree byte mismatch for {tree_sha}"
        finally:
            shutil.rmtree(tmp)

    def test_structured_commit_columns_and_parents(self, bridge, repo_id):
        """Extracted columns: root_tree, author, message, date, parents, blob size."""
        from dulwich.repo import Repo

        store = ObjectStore(repo_id, bridge=bridge)

        tmp = tempfile.mkdtemp()
        try:
            repo_path = Path(tmp) / "merge_repo"
            repo_path.mkdir()
            run_git(repo_path, "init")
            run_git(repo_path, "config", "user.name", "Test Author")
            run_git(repo_path, "config", "user.email", "author@test.com")

            create_commit(repo_path, "base.txt", "base", "base")
            run_git(repo_path, "checkout", "-b", "feature")
            feature_head = run_git(repo_path, "rev-parse", "HEAD").stdout.strip().encode()
            create_commit(repo_path, "feat.txt", "feat", "Feature")
            feature_head = run_git(repo_path, "rev-parse", "HEAD").stdout.strip().encode()
            run_git(repo_path, "checkout", "master")
            create_commit(repo_path, "other.txt", "other", "Other")
            master_head = run_git(repo_path, "rev-parse", "HEAD").stdout.strip().encode()
            merge_result = run_git(repo_path, "merge", "--no-ff", "feature", "-m", "Merge feature")
            assert merge_result.returncode == 0, merge_result.stderr
            merge_head = run_git(repo_path, "rev-parse", "HEAD").stdout.strip().encode()

            dulwich_repo = Repo(str(repo_path))
            objects = [dulwich_repo.object_store[sha] for sha in dulwich_repo.object_store]
            store.add_objects([(o, None) for o in objects])

            blobs_expected = {
                o.id: len(o.data)
                for o in objects if o.type_num == 3
            }
            root_tree = None

            async def verify():
                conn = await asyncpg.connect(DATABASE_URL)
                try:
                    nonlocal root_tree
                    row = await conn.fetchrow(
                        "SELECT root_tree_sha, author_name, author_date, message "
                        "FROM commits WHERE repo_id = $1 AND sha = $2",
                        repo_id, merge_head,
                    )
                    root_tree = row["root_tree_sha"]
                    assert row["author_name"] == b"Test User"
                    assert row["message"] == b"Merge feature\n"
                    assert row["author_date"] is not None

                    parents = await conn.fetch(
                        "SELECT parent_index, parent_sha FROM commit_parent "
                        "WHERE repo_id = $1 AND commit_sha = $2 ORDER BY parent_index",
                        repo_id, merge_head,
                    )
                    assert [r["parent_index"] for r in parents] == [0, 1]
                    assert [r["parent_sha"] for r in parents] == [master_head, feature_head]

                    blob_rows = await conn.fetch(
                        "SELECT sha, size FROM blobs WHERE repo_id = $1", repo_id
                    )
                    got = {r["sha"]: r["size"] for r in blob_rows}
                    for sha, size in blobs_expected.items():
                        assert got.get(sha) == size, f"blob {sha} size mismatch"
                finally:
                    await conn.close()

            asyncio.new_event_loop().run_until_complete(verify())

            assert root_tree is not None and len(root_tree) == 40
            tree_exists = asyncio.new_event_loop().run_until_complete(_tree_exists(repo_id, root_tree))
            assert tree_exists
        finally:
            shutil.rmtree(tmp)

    def test_empty_tree(self, bridge, repo_id):
        """Test empty tree special case handling."""
        store = ObjectStore(repo_id, bridge=bridge)

        # Empty tree should be considered present
        assert EMPTY_TREE_SHA in store

        # Get raw should return empty tree
        type_num, content = store.get_raw(EMPTY_TREE_SHA)
        assert type_num == 2
        assert content == b""

    def test_thin_pack_ingestion(self, bridge, repo_id):
        store = ObjectStore(repo_id, bridge=bridge)

        tmp = tempfile.mkdtemp()
        try:
            repo_path = Path(tmp) / "client_repo"
            repo_path.mkdir()
            run_git(repo_path, "init")
            run_git(repo_path, "config", "user.name", "Test")
            run_git(repo_path, "config", "user.email", "test@test.com")

            base_commit = create_commit(repo_path, "base.txt", "base", "Base commit")
            create_commit(repo_path, "feature.txt", "feature", "Feature commit")
            head_commit = run_git(repo_path, "rev-parse", "HEAD").stdout.strip()

            pack_output = subprocess.run(
                ["git", "--git-dir", str(repo_path / ".git"), "pack-objects", "--stdout", "--thin", "--revs"],
                input=f"{base_commit}\n{head_commit}\n".encode(),
                capture_output=True,
            )
            assert pack_output.returncode == 0
            pack_data = pack_output.stdout
            pos = 0

            def read_all(n):
                nonlocal pos
                data = pack_data[pos : pos + n]
                pos += len(data)
                return data

            def read_some(n):
                nonlocal pos
                data = pack_data[pos : pos + n]
                pos += len(data)
                return data

            store.add_thin_pack(read_all, read_some)

            assert head_commit.encode() in store
            assert base_commit.encode() in store
        finally:
            shutil.rmtree(tmp)

    def test_clone_path_write_pack_from_container(self, bridge, repo_id):
        from dulwich.pack import write_pack_from_container
        from io import BytesIO

        store = ObjectStore(repo_id, bridge=bridge)

        tmp = tempfile.mkdtemp()
        try:
            repo_path = Path(tmp) / "source_repo"
            repo_path.mkdir()
            run_git(repo_path, "init")
            run_git(repo_path, "config", "user.name", "Test")
            run_git(repo_path, "config", "user.email", "test@test.com")

            c1 = create_commit(repo_path, "a.txt", "a", "Commit 1")
            c2 = create_commit(repo_path, "b.txt", "b", "Commit 2")
            c3 = create_commit(repo_path, "c.txt", "c", "Commit 3")

            dulwich_repo = __import__("dulwich.repo").repo.Repo(str(repo_path))
            all_shas = list(dulwich_repo.object_store)
            store.add_objects([(dulwich_repo.object_store[sha], None) for sha in all_shas])

            store2 = ObjectStore(repo_id + 1, bridge=bridge)
            object_ids = [(sha, None) for sha in all_shas]

            buf = BytesIO()
            write_pack_from_container(buf.write, store, object_ids, store.object_format)

            buf.seek(0)
            pack_data = buf.read()

            def read_all(n):
                return pack_data[:n]
            def read_some(n):
                return pack_data[:n]

            f, commit, _abort = store2.add_pack()
            f.write(pack_data)
            commit()

            for sha in all_shas:
                assert sha in store2
        finally:
            shutil.rmtree(tmp)

    def test_refs_cas_and_symref(self, bridge, repo_id):
        refs = RefContainer(repo_id, bridge=bridge)

        head_ref = b"HEAD"
        master_ref = b"refs/heads/master"
        feature_ref = b"refs/heads/feature"
        commit_sha = b"a" * 40

        assert refs.add_if_new(master_ref, commit_sha) is True
        assert refs.add_if_new(master_ref, commit_sha) is False
        assert refs[master_ref] == commit_sha

        assert refs.set_if_equals(master_ref, commit_sha, b"b" * 40) is True
        assert refs[master_ref] == b"b" * 40
        assert refs.set_if_equals(master_ref, commit_sha, b"c" * 40) is False

        refs.set_symbolic_ref(head_ref, master_ref)
        assert refs[head_ref] == b"b" * 40

        assert refs.remove_if_equals(feature_ref, None) is True
        refs.add_if_new(feature_ref, b"c" * 40)
        assert refs.remove_if_equals(feature_ref, b"c" * 40) is True
        assert feature_ref not in refs

        symrefs = refs.get_symrefs()
        assert head_ref in symrefs
        assert symrefs[head_ref] == master_ref

    def test_fastrepo_integration(self, bridge, repo_id):
        repo = FastRepo(repo_id, bridge=bridge)

        from dulwich.objects import Commit, Tree, Blob
        from dulwich.repo import Repo as DulwichRepo

        tmp = tempfile.mkdtemp()
        try:
            repo_path = Path(tmp) / "integration_repo"
            repo_path.mkdir()
            run_git(repo_path, "init")
            run_git(repo_path, "config", "user.name", "Test")
            run_git(repo_path, "config", "user.email", "test@test.com")

            c1 = create_commit(repo_path, "file1.txt", "content1", "First")
            c2 = create_commit(repo_path, "file2.txt", "content2", "Second")

            dulwich_src = DulwichRepo(str(repo_path))
            repo.object_store.add_objects(
                [(dulwich_src.object_store[sha], None) for sha in dulwich_src.object_store]
            )

            refs_dict = dulwich_src.get_refs()
            for ref_name, sha in refs_dict.items():
                repo.refs.add_if_new(ref_name, sha)

            assert repo.get_refs() == refs_dict
            assert c1.encode() in repo.object_store
            assert c2.encode() in repo.object_store

            all_shas = list(repo.object_store)
            assert len(all_shas) >= 4
        finally:
            shutil.rmtree(tmp)

    def test_handler_smoke_receive_and_upload(self, bridge, repo_id):
        from dulwich.protocol import Protocol
        from dulwich.server import Backend, ReceivePackHandler, UploadPackHandler
        from io import BytesIO

        class FastRepoBackend(Backend):
            def __init__(self, repo):
                self._repo = repo

            def open_repository(self, path):
                return self._repo

        repo = FastRepo(repo_id, bridge=bridge)

        tmp = tempfile.mkdtemp()
        try:
            src_path = Path(tmp) / "client"
            src_path.mkdir()
            run_git(src_path, "init")
            run_git(src_path, "config", "user.name", "Test")
            run_git(src_path, "config", "user.email", "test@test.com")
            create_commit(src_path, "foo.txt", "foo", "Initial")

            dulwich_src = __import__("dulwich.repo").repo.Repo(str(src_path))
            head_sha = dulwich_src[b"HEAD"].id

            for sha in dulwich_src.object_store:
                obj = dulwich_src.object_store[sha]
                repo.object_store.add_objects([(obj, None)])
            repo.refs.add_if_new(b"refs/heads/master", head_sha)
            repo.refs.set_symbolic_ref(b"HEAD", b"refs/heads/master")

            advertise_out = BytesIO()
            advertise_proto = Protocol(BytesIO().read, advertise_out.write)
            upload_adv = UploadPackHandler(FastRepoBackend(repo), [b"git-upload-pack"], advertise_proto)
            from dulwich.errors import HangupException
            try:
                upload_adv.handle()
            except HangupException:
                pass  # client sent no wants; advertise already validated
            assert b"refs/heads/master" in advertise_out.getvalue()

            receive_in = BytesIO()
            receive_out = BytesIO()
            receive_proto = Protocol(receive_in.read, receive_out.write)
            receive = ReceivePackHandler(FastRepoBackend(repo), [b"git-receive-pack"], receive_proto)
            try:
                receive.handle()
            except HangupException:
                pass  # no commands sent; smoke coverage of handler lifecycle
        finally:
            shutil.rmtree(tmp)
