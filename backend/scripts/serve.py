import sys
from pathlib import Path
import uvicorn

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for p in (str(SRC), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "dev"
    if mode not in ("dev", "prod"):
        print(f"usage: {sys.argv[0]} dev|prod", file=sys.stderr)
        sys.exit(1)
        
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=(mode == "dev"))

if __name__ == "__main__":
    main()
