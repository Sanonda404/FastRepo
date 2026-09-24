import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
for p in (str(SRC), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from models.profile_pic import PROFILE_PICS_TABLE_DDL
from models.users import USERS_TABLE_DDL
from models.repository import REPOSITORIES_TABLE_DDL, REPOSITORIES_INDEX_DDL
from models.repository_collaborators import (
    REPOSITORY_COLLABORATORS_TABLE_DDL,
    CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER_FUNCTION,
    CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER_FUNCTION,
    CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER,
    CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER,
)
from models.team import TEAMS_TABLE_DDL, TEAMS_INDEX_DDL
from models.team_members import (
    TEAM_MEMBERS_TABLE_DDL,
    TEAM_MEMBERS_INDEX_DDL,
    CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_FUNCTION,
    CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_TRIGGER,
)
from models.git import (
    BLOBS_TABLE_DDL,
    TAGS_TABLE_DDL,
    TREE_ENTRIES_TABLE_DDL,
    COMMITS_TABLE_DDL,
    REFS_TABLE_DDL,
    COMMIT_PARENT_TABLE_DDL,
)
from models.issues import ISSUES_TABLE_DDL, ISSUES_INDEX_DDL
from models.labels import LABELS_TABLE_DDL
from models.issue_comments import ISSUE_COMMENTS_TABLE_DDL, ISSUE_COMMENTS_INDEX_DDL
from models.pull_request import PULL_REQUESTS_TABLE_DDL, PULL_REQUESTS_INDEX_DDL
from models.pr_reviews import (
    PR_REVIEWS_TABLE_DDL,
    PR_REVIEWS_INDEX_DDL,
    PR_REVIEW_PRIVILEGE_FUNC,
    PR_REVIEW_PRIVILEGE_TRIGGER,
)
from models.stars import STARS_TABLE_DDL, STARS_INDEX_DDL
from models.issue_assignees import ISSUE_ASSIGNEES_TABLE_DDL
from models.issue_labels import (
    ISSUE_LABELS_TABLE_DDL,
    DELETE_ORPHAN_LABEL_FUNC,
    DELETE_ORPHAN_LABEL_TRIGGER,
    VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_FUNC,
    VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_TRIGGER,
)
from models.issue_pull_requests import (
    ISSUE_PULL_REQUESTS_TABLE_DDL,
    ISSUE_PR_SAME_REPO_FUNC,
    ISSUE_PR_SAME_REPO_TRIGGER,
)
from models.permission import (
    PERMISSIONS_TABLE_DDL,
    PERMISSIONS_INDEXES_DDL,
)
from sqls.permission_functions import PERMISSION_FUNCTIONS
from sqls.stat_functions import STAT_FUNCTIONS
from sqls.procedures import (
    CREATE_ISSUE_PR_PROCEDURE,
    ADD_NEW_TEAM_MEMBER_PROCEDURE,
    ATTACH_LABEL_PROCEDURE,
    FORK_REPOSITORY_PROCEDURE,
    UPDATE_DEFAULT_BRANCH_PROCEDURE,
)

TABLE_DDLS = [
    PROFILE_PICS_TABLE_DDL,
    USERS_TABLE_DDL,
    REPOSITORIES_TABLE_DDL,
    REPOSITORY_COLLABORATORS_TABLE_DDL,
    TEAMS_TABLE_DDL,
    TEAM_MEMBERS_TABLE_DDL,
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
    PERMISSIONS_TABLE_DDL,
]

INDEX_DDLS = [
    REPOSITORIES_INDEX_DDL,
    TEAMS_INDEX_DDL,
    TEAM_MEMBERS_INDEX_DDL,
    ISSUES_INDEX_DDL,
    ISSUE_COMMENTS_INDEX_DDL,
    PULL_REQUESTS_INDEX_DDL,
    PR_REVIEWS_INDEX_DDL,
    STARS_INDEX_DDL,
    PERMISSIONS_INDEXES_DDL,
]

FUNCTION_DDLS = [
    *PERMISSION_FUNCTIONS,
    *STAT_FUNCTIONS,
]

PROCEDURE_DDLS = [
    CREATE_ISSUE_PR_PROCEDURE,
    ADD_NEW_TEAM_MEMBER_PROCEDURE,
    ATTACH_LABEL_PROCEDURE,
    FORK_REPOSITORY_PROCEDURE,
    UPDATE_DEFAULT_BRANCH_PROCEDURE,
]

TRIGGER_FUNC_DDLS = [
    CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_FUNCTION,
    CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER_FUNCTION,
    CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER_FUNCTION,
    DELETE_ORPHAN_LABEL_FUNC,
    VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_FUNC,
    ISSUE_PR_SAME_REPO_FUNC,
    PR_REVIEW_PRIVILEGE_FUNC,
]

TRIGGER_DDLS = [
    CHECK_TEAM_COLLABORATOR_FROM_SAME_REPO_TRIGGER,
    CHECK_VIEWER_ONLY_IN_PRIVATE_REPO_TRIGGER,
    CHECK_VIEWER_IN_PRIVATE_TO_PUBLIC_REPO_UPDATE_TRIGGER,
    DELETE_ORPHAN_LABEL_TRIGGER,
    VALIDATE_UNIQUE_LABEL_NAME_PER_ISSUE_TRIGGER,
    ISSUE_PR_SAME_REPO_TRIGGER,
    PR_REVIEW_PRIVILEGE_TRIGGER,
]


def _normalize(ddl: str) -> str:
    s = ddl.strip()
    if not s.endswith(";"):
        s += ";"
    return s


def _section(title: str, ddls: list) -> str:
    return "\n\n".join(_normalize(d) for d in ddls)


def main() -> None:
    out_dir = ROOT / "src" / "sqls"
    out_dir.mkdir(parents=True, exist_ok=True)

    schema_out = out_dir / "schema.sql"
    schema_out.write_text(
        "\n\n".join(
            [
                _section("TABLES", TABLE_DDLS),
                _section("INDEXES", INDEX_DDLS),
                _section("FUNCTIONS", FUNCTION_DDLS),
                _section("PROCEDURES", PROCEDURE_DDLS),
                _section("TRIGGER FUNCTIONS", TRIGGER_FUNC_DDLS),
                _section("TRIGGERS", TRIGGER_DDLS),
            ]
        )
        + "\n"
    )
    print(f"wrote {schema_out}")

    procedures_out = out_dir / "procedures.sql"
    procedures_out.write_text(_section("PROCEDURES", PROCEDURE_DDLS) + "\n")
    print(f"wrote {procedures_out}")

    functions_out = out_dir / "functions.sql"
    functions_out.write_text(_section("FUNCTIONS", FUNCTION_DDLS) + "\n")
    print(f"wrote {functions_out}")

    triggers_out = out_dir / "triggers.sql"
    triggers_out.write_text(
        "\n\n".join(
            [
                _section("TRIGGER FUNCTIONS", TRIGGER_FUNC_DDLS),
                _section("TRIGGERS", TRIGGER_DDLS),
            ]
        )
        + "\n"
    )
    print(f"wrote {triggers_out}")


if __name__ == "__main__":
    main()
