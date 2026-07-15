import os
from pathlib import Path
from dotenv import load_dotenv
from io import BytesIO

from dulwich.repo import Repo
from dulwich.server import DictBackend, ReceivePackHandler, UploadPackHandler
from dulwich.protocol import Protocol

from fastapi import HTTPException

# Read environment variables from .env
load_dotenv()
REPOSITORY_ROOT: str = os.getenv("REPOSITORY_ROOT", "./repositories")

# End of message/data
FLUSH_PACKET: bytes = b"0000"

def get_repo_path(username: str, repo: str) -> Path:
    """Return the absolute path to a bare repository on disk.
    Stored at $REPOSITORY_ROOT/{username}/{repo}.git
    """
    
    for part in (username, repo):
        if ".." in part or "/" in part or "\\" in part:
            raise HTTPException(status_code=400, detail="Invalid username or repository")

    repo = repo if repo.endswith(".git") else repo + ".git"
    repo_path = Path(REPOSITORY_ROOT).resolve() / username / f"{repo}"

    # Add valid username/repository check later
    if not repo_path.is_dir():
        raise HTTPException(status_code=404, detail="Repository not found")

    return repo_path

def encode_pkt_line(data: str | bytes) -> bytes:
    """Encode plain data to git pkt line format.
    Its formatted as length(in hex) followed by data. Extra 4 byte is required for header.
    """
    if isinstance(data, str):
        data = data.encode()

    pkt_len = 4 + len(data)
    return f"{pkt_len:04x}".encode() + data

def ref_info_handler(repo_path: Path, action: str) -> bytes:
    """Prepare packfile content for sending client repository information"""
    
    repo = Repo(str(repo_path))
    header = encode_pkt_line(f"# service={action}\n") + FLUSH_PACKET
    backend = DictBackend({"/" : repo})

    if action == "git-upload-pack":
        handler = UploadPackHandler(
            backend, ["/"], proto=None, stateless_rpc=True
        )
        
    elif action == "git-receive-pack":
        handler = ReceivePackHandler(
            backend, ["/"], proto=None, stateless_rpc=True
        )
        
    else:
        raise HTTPException(status_code=403, detail="Unsupported action")

    refs = repo.get_refs()
    capabilities = handler.capabilities()
    capability_payload = b" ".join(capabilities)

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
        line = b"0"*40 + b" capabilities^{}\x00" + capability_payload + b"\n"
        lines.append(encode_pkt_line(line))

    body = header + b"".join(lines) + FLUSH_PACKET
    return body

def pack_handler(repo_path: Path, action: str, input: bytes) -> bytes:
    """Send/receive git objects"""
    
    repo = Repo(str(repo_path))
    backend = DictBackend({"/" : repo})

    input_stream = BytesIO(input)
    output_stream = BytesIO()

    protocol = Protocol(input_stream.read, output_stream.write)
    
    if action == "git-upload-pack":
        handler = UploadPackHandler(
            backend, ["/"], protocol, stateless_rpc=True
        )
        
    elif action == "git-receive-pack":
        handler = ReceivePackHandler(
            backend, ["/"], protocol, stateless_rpc=True
        )
        
    else:
        raise HTTPException(status_code=403, detail="Unsupported service")

    handler.handle()
    return output_stream.getvalue()
