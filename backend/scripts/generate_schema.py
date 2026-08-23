import sys
from pathlib import Path

from models.profile_pic import PROFILE_PICS_TABLE_DDL
from models.users import USERS_TABLE_DDL
from models.repository import REPOSITORIES_TABLE_DDL
from models.repository_collaborators import REPOSITORY_COLLABORATORS_TABLE_DDL
from models.team import TEAMS_TABLE_DDL
from models.team_members import TEAM_MEMBERS_TABLE_DDL
from models.permission import PERMISSIONS_TABLE_DDL
from models.git import (
    BLOBS_TABLE_DDL,
    TAGS_TABLE_DDL,
    TREE_ENTRIES_TABLE_DDL,
    COMMITS_TABLE_DDL,
    REFS_TABLE_DDL,
    COMMIT_PARENT_TABLE_DDL,
)
from models.issues import ISSUES_TABLE_DDL
from models.labels import LABELS_TABLE_DDL
from models.issue_comments import ISSUE_COMMENTS_TABLE_DDL
from models.pull_request import PULL_REQUESTS_TABLE_DDL
from models.pr_reviews import PR_REVIEWS_TABLE_DDL
from models.stars import STARS_TABLE_DDL
from models.issue_assignees import ISSUE_ASSIGNEES_TABLE_DDL
from models.issue_labels import ISSUE_LABELS_TABLE_DDL
from models.issue_pull_requests import ISSUE_PULL_REQUESTS_TABLE_DDL

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for p in (str(SRC), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

DDLS = [
    PROFILE_PICS_TABLE_DDL,
    USERS_TABLE_DDL,
    REPOSITORIES_TABLE_DDL,
    REPOSITORY_COLLABORATORS_TABLE_DDL,
    TEAMS_TABLE_DDL,
    TEAM_MEMBERS_TABLE_DDL,
    PERMISSIONS_TABLE_DDL,
    BLOBS_TABLE_DDL,
    TAGS_TABLE_DDL,
    TREE_ENTRIES_TABLE_DDL,
    COMMITS_TABLE_DDL,
    REFS_TABLE_DDL,
    COMMIT_PARENT_TABLE_DDL,
    ISSUES_TABLE_DDL,
    LABELS_TABLE_DDL,
    ISSUE_COMMENTS_TABLE_DDL,
    PULL_REQUESTS_TABLE_DDL,
    PR_REVIEWS_TABLE_DDL,
    STARS_TABLE_DDL,
    ISSUE_ASSIGNEES_TABLE_DDL,
    ISSUE_LABELS_TABLE_DDL,
    ISSUE_PULL_REQUESTS_TABLE_DDL,
]


def _normalize(ddl: str) -> str:
    s = ddl.strip()
    if not s.endswith(";"):
        s += ";"
    return s + "\n"


def main() -> None:
    out = ROOT / "src" / "sqls" / "schema.sql"
    out.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(_normalize(d) for d in DDLS)
    out.write_text(content)
    print(f"wrote {out} ({len(DDLS)} tables)")


if __name__ == "__main__":
    main()
