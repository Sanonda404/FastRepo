from __future__ import annotations
import asyncio
import stat
import threading
from io import BytesIO
from collections.abc import Callable, Iterator, Sequence
from typing import BinaryIO, Optional

import asyncpg

from dulwich.object_store import BaseObjectStore
from dulwich.objects import (
    ShaFile,
    serialize_tree,
)

from dulwich.object_format import ObjectFormat
from dulwich.object_store import _bound_read_callables
from dulwich.pack import (
    PackData,
    PackInflater,
    PackStreamCopier,
)
from dulwich.refs import RefsContainer, Ref, ObjectID, SYMREF, ZERO_SHA
from dulwich.repo import MemoryRepo, BaseRepo
from dulwich.config import ConfigFile

from sqls.git_sqls import (
    GET_RAW_BY_SHA,
    INSERT_COMMIT,
    INSERT_BLOB,
    INSERT_TAG,
    INSERT_TREE_ENTRIES,
    DELETE_TREE_ENTRIES,
    CHECK_OBJECT_EXISTS,
    ITER_OBJECT_SHAS,
    GET_TREE_ENTRIES,
    READ_LOOSE_REF,
    ALL_REFS,
    SET_SYMREF,
    SET_REF_IF_EQUALS,
    ADD_REF_IF_NEW,
    REMOVE_REF_IF_EQUALS,
)

from models.git import EMPTY_TREE_SHA
from services.database import DATABASE_URL

_OBJ_BLOB = 3
_OBJ_TREE = 2
_OBJ_COMMIT = 1
_OBJ_TAG = 4

class _AsyncBridge:
    """Utility class to make non async methods use async methods"""
    _instance: Optional[_AsyncBridge] = None
    _lock = threading.Lock()

    def __init__(self, db: str) -> None:
        self._db = db
        self._loop: asyncio.AbstractEventLoop
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._started = threading.Event()
        self._pool: Optional[asyncpg.Pool] = None
        self._thread.start()
        self._started.wait()

    @classmethod
    def get_instance(cls, db: Optional[str] = None) -> _AsyncBridge:
        with cls._lock:
            if cls._instance is None:
                if db is None:
                    db = DATABASE_URL
                cls._instance = cls(db)
            return cls._instance

    def _run_loop(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._pool = self._loop.run_until_complete(asyncpg.create_pool(self._db))
        self._started.set()
        self._loop.run_forever()

    def run(self, coro):
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if running is self._loop:
            result = None
            error = None

            def _worker() -> None:
                loop = asyncio.new_event_loop()
                try:
                    nonlocal result
                    result = loop.run_until_complete(coro)
                except BaseException as exc:
                    nonlocal error
                    error = exc
                finally:
                    loop.close()

            thread = threading.Thread(target=_worker, daemon=True)
            thread.start()
            thread.join()
            
            if error:
                raise error
            
            return result
        
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result()

    @property
    def pool(self) -> asyncpg.Pool:
        return self._pool

    def close(self) -> None:
        if self._pool:
            asyncio.run_coroutine_threadsafe(self._pool.close(), self._loop).result()
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=5)


class ObjectStore(BaseObjectStore):
    def __init__(self, repo_id: int, bridge: Optional[_AsyncBridge] = None, *, object_format: Optional[ObjectFormat] = None) -> None:
        super().__init__(object_format=object_format)
        self._repo_id = repo_id
        self._bridge = bridge or _AsyncBridge.get_instance()

    def _run(self, coro):
        return self._bridge.run(coro)

    def _async_contains(self, sha: ObjectID) -> bool:
        # Handle empty tree
        if sha == EMPTY_TREE_SHA:
            return True
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                return await conn.fetchval(CHECK_OBJECT_EXISTS, self._repo_id, sha) is not None
        return self._run(_inner())

    def contains_loose(self, sha: ObjectID) -> bool:
        return self._async_contains(sha)

    @property
    def packs(self) -> list:
        return []

    def _async_get_raw(self, sha: ObjectID) -> tuple[int, bytes]:
        # Handle empty tree
        if sha == EMPTY_TREE_SHA:
            return _OBJ_TREE, b""
        
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                row = await conn.fetchrow(GET_RAW_BY_SHA, self._repo_id, sha)
                if row is None:
                    raise KeyError(sha)
                type_num = row["type"]
                content = row["content"]
                if type_num == 0: # tree
                    entries_rows = await conn.fetch(GET_TREE_ENTRIES, self._repo_id, sha)
                    if not entries_rows:
                        raise KeyError(sha)
                    items = [(r["name"], r["mode"], r["sha"]) for r in entries_rows]
                    items.sort(key=lambda e: e[0] + (b"/" if stat.S_ISDIR(e[1]) else b""))
                    content = b"".join(serialize_tree(items))
                    return _OBJ_TREE, content
                if content is None:
                    raise KeyError(sha)
                return type_num, content
        return self._run(_inner())

    def get_raw(self, name: ObjectID | bytes) -> tuple[int, bytes]:
        return self._async_get_raw(name)

    def __iter__(self) -> Iterator[ObjectID]:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                rows = await conn.fetch(ITER_OBJECT_SHAS, self._repo_id)
                return [r["sha"] for r in rows]
        return iter(self._run(_inner()))

    def _async_add_object(self, obj: ShaFile) -> None:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                async with conn.transaction():
                    raw = obj.as_raw_string()
                    if obj.type_num == _OBJ_COMMIT:
                        await conn.execute(INSERT_COMMIT, self._repo_id, obj.id, raw)
                    elif obj.type_num == _OBJ_BLOB:
                        await conn.execute(INSERT_BLOB, self._repo_id, obj.id, raw)
                    elif obj.type_num == _OBJ_TAG:
                        await conn.execute(INSERT_TAG, self._repo_id, obj.id, raw)
                    elif obj.type_num == _OBJ_TREE:
                        await conn.execute(DELETE_TREE_ENTRIES, self._repo_id, obj.id)
                        entries = list(obj.items())
                        for name, mode, entry_sha in entries:
                            await conn.execute(
                                INSERT_TREE_ENTRIES, self._repo_id, obj.id, name, mode, entry_sha
                            )
        self._run(_inner())

    def add_object(self, obj: ShaFile) -> None:
        self._async_add_object(obj)

    def add_objects(
        self,
        objects: Sequence[tuple[ShaFile, str | None]],
        progress: Callable[..., None] | None = None,
    ) -> None:
        for obj, _path in objects:
            self.add_object(obj)
            if progress:
                progress(obj.id.decode())

    def add_pack(self) -> tuple[BinaryIO, Callable[[], None], Callable[[], None]]:
        f = BytesIO()

        def commit() -> None:
            size = f.tell()
            if size > 0:
                f.seek(0)
                p = PackData.from_file(f, self.object_format, size)
                try:
                    p.check()
                    for obj in PackInflater.for_pack_data(p, self.get_raw):
                        self.add_object(obj)
                finally:
                    p.close()

        def abort() -> None:
            f.close()

        return f, commit, abort

    def add_thin_pack(
        self,
        read_all: Callable[[int], bytes],
        read_some: Callable[[int], bytes] | None,
        progress: Callable[..., None] | None = None,
        *,
        max_input_size: int | None = None,
    ) -> None:
        if max_input_size:
            read_all, read_some = _bound_read_callables(read_all, read_some, max_input_size)

        f, commit, abort = self.add_pack()
        try:
            copier = PackStreamCopier(
                self.object_format.hash_func,
                read_all,
                read_some,
                f,
            )
            copier.verify(progress=progress)
        except BaseException:
            abort()
            raise
        else:
            commit()

    def close(self) -> None:
        pass


class RefContainer(RefsContainer):
    def __init__(self, repo_id: int, bridge: Optional[_AsyncBridge] = None) -> None:
        super().__init__(logger=None)
        self._repo_id = repo_id
        self._bridge = bridge or _AsyncBridge.get_instance()

    def _run(self, coro):
        return self._bridge.run(coro)

    def read_loose_ref(self, name: Ref) -> bytes | None:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                row = await conn.fetchrow(READ_LOOSE_REF, self._repo_id, name)
                return row["value"] if row else None
            
        return self._run(_inner())

    def get_packed_refs(self) -> dict[Ref, ObjectID]:
        return {}

    def allkeys(self) -> set[Ref]:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                rows = await conn.fetch(ALL_REFS, self._repo_id)
                return {r["name"] for r in rows}
        return self._run(_inner())

    def set_symbolic_ref(
        self,
        name: Ref,
        other: Ref,
        committer: bytes | None = None,
        timestamp: int | None = None,
        timezone: int | None = None,
        message: bytes | None = None,
    ) -> None:
        value = SYMREF + other
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                await conn.execute(SET_SYMREF, self._repo_id, name, value)
                
        self._run(_inner())
        self._log(name, None, value, committer, timestamp, timezone, message)

    def set_if_equals(
        self,
        name: Ref,
        old_ref: ObjectID | None,
        new_ref: ObjectID,
        committer: bytes | None = None,
        timestamp: int | None = None,
        timezone: int | None = None,
        message: bytes | None = None,
    ) -> bool:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                async with conn.transaction():
                    updated = await conn.execute(SET_REF_IF_EQUALS, self._repo_id, name, new_ref, old_ref)
                    if updated == "UPDATE 1":
                        return True
                    if old_ref is not None and old_ref != ZERO_SHA:
                        return False
                    inserted = await conn.execute(ADD_REF_IF_NEW, self._repo_id, name, new_ref)
                    return inserted == "INSERT 0 1"
        result = self._run(_inner())
        if result:
            self._log(name, old_ref, new_ref, committer, timestamp, timezone, message)
            
        return result

    def add_if_new(
        self,
        name: Ref,
        ref: ObjectID,
        committer: bytes | None = None,
        timestamp: int | None = None,
        timezone: int | None = None,
        message: bytes | None = None,
    ) -> bool:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                row = await conn.fetchrow(ADD_REF_IF_NEW, self._repo_id, name, ref)
                return row is not None
            
        result = self._run(_inner())
        
        if result:
            self._log(name, None, ref, committer, timestamp, timezone, message)
            
        return result

    def remove_if_equals(
        self,
        name: Ref,
        old_ref: ObjectID | None,
        committer: bytes | None = None,
        timestamp: int | None = None,
        timezone: int | None = None,
        message: bytes | None = None,
    ) -> bool:
        async def _inner():
            async with self._bridge.pool.acquire() as conn:
                async with conn.transaction():
                    row = await conn.fetchrow(READ_LOOSE_REF, self._repo_id, name)
                    if row is None:
                        return old_ref is None or old_ref == ZERO_SHA
                    if old_ref is not None and row["value"] != old_ref:
                        return False
                    await conn.execute(REMOVE_REF_IF_EQUALS, self._repo_id, name, old_ref)
                    return True
        result = self._run(_inner())
        if result:
            self._log(name, old_ref, None, committer, timestamp, timezone, message)
        return result


class FastRepo(MemoryRepo):
    def __init__(self, repo_id: int, bridge: Optional[_AsyncBridge] = None) -> None:
        self._repo_id = repo_id
        self._bridge = bridge or _AsyncBridge.get_instance()
        store = ObjectStore(repo_id, bridge=self._bridge)
        refs = RefContainer(repo_id, bridge=self._bridge)
        BaseRepo.__init__(self, store, refs)
        self._named_files: dict[str, bytes] = {}
        self.bare = True
        self._config = ConfigFile()
        self._description: bytes | None = None
        self.filter_context = None
