from io import BytesIO

from dulwich.protocol import Protocol
from dulwich.server import Backend, ReceivePackHandler, UploadPackHandler
from fastapi import HTTPException

from services.database import get_pool
from services.git_backend import FastRepo

# End of message/data
FLUSH_PACKET: bytes = b"0000"


class FastRepoBackend(Backend):
    def __init__(self, repo: FastRepo) -> None:
        self._repo = repo

    def open_repository(self, path):
        return self._repo


async def get_repo_id(username: str, repository: str) -> int:
    for part in (username, repository):
        if ".." in part or "/" in part or "\\" in part:
            raise HTTPException(status_code=400, detail="Invalid username or repository")

    pool = get_pool()
    async with pool.acquire() as conn:
        repo_id = await conn.fetchval(
            "SELECT r.id FROM repositories r JOIN users u ON u.id = r.owner_id "
            "WHERE u.username = $1 AND r.name = $2",
            username,
            repository,
        )
        
    if repo_id is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    return repo_id


def encode_pkt_line(data: str | bytes) -> bytes:
    """Encode plain data to git pkt line format.
    Its formatted as length(in hex) followed by data. Extra 4 byte is required for header.
    """
    if isinstance(data, str):
        data = data.encode()

    pkt_len = 4 + len(data)
    return f"{pkt_len:04x}".encode() + data

def ref_info_handler(repo_id: int, action: str) -> bytes:
    """Prepare packfile content for sending client repository information"""
    backend = FastRepoBackend(FastRepo(repo_id))
    header = encode_pkt_line(f"# service={action}\n") + FLUSH_PACKET

    if action == "git-upload-pack":
        handler = UploadPackHandler(backend, ["/"], proto=None, stateless_rpc=True)
    elif action == "git-receive-pack":
        handler = ReceivePackHandler(backend, ["/"], proto=None, stateless_rpc=True)
    else:
        raise HTTPException(status_code=403, detail="Unsupported action")

    repo = backend.open_repository("/")
    capabilities = handler.capabilities()
    capability_payload = b" ".join(capabilities)

    refs: dict[bytes, bytes] = {}
    for name in repo.refs.allkeys():
        value = repo.refs.read_loose_ref(name)
        if value is not None and not value.startswith(b"ref: "):
            refs[name] = value

    head_raw = repo.refs.read_loose_ref(b"HEAD")
    if head_raw and head_raw.startswith(b"ref: "):
        head_target = head_raw[5:]
        if head_target in refs:
            capability_payload += b" symref=HEAD:" + head_target
            refs[b"HEAD"] = refs[head_target]

    lines: list[bytes] = []
    first = True

    for ref_name, sha in sorted(refs.items()):
        ref_name_bytes = bytes(ref_name)
        sha_bytes = bytes(sha)

        if first:
            line = sha_bytes + b" " + ref_name_bytes + b"\x00" + capability_payload + b"\n"
            lines.append(encode_pkt_line(line))
            first = False
        else:
            line = sha_bytes + b" " + ref_name_bytes + b"\n"
            lines.append(encode_pkt_line(line))

    if first:
        line = b"0" * 40 + b" capabilities^{}\x00" + capability_payload + b"\n"
        lines.append(encode_pkt_line(line))

    body = header + b"".join(lines) + FLUSH_PACKET
    return body

def pack_handler(repo_id: int, action: str, input: bytes) -> bytes:
    """Send/receive git objects"""
    backend = FastRepoBackend(FastRepo(repo_id))

    input_stream = BytesIO(input)
    output_stream = BytesIO()

    protocol = Protocol(input_stream.read, output_stream.write)

    if action == "git-upload-pack":
        handler = UploadPackHandler(backend, ["/"], protocol, stateless_rpc=True)
    elif action == "git-receive-pack":
        handler = ReceivePackHandler(backend, ["/"], protocol, stateless_rpc=True)
    else:
        raise HTTPException(status_code=403, detail="Unsupported service")

    handler.handle()
    return output_stream.getvalue()
