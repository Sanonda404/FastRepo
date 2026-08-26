CHECK_BRANCH_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        SELECT t.id AS team_id, t.parent_team_id
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        JOIN repository_collaborators rc ON rc.id = tm.member_id
        WHERE t.repository_id = $1 AND rc.user_id = $2

        UNION

        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    )
    SELECT p.allow_write
    FROM permissions p
    JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'branch'
    AND p.target_identifier = $3
    ORDER BY p.allow_write ASC -- FALSE comes first
    LIMIT 1;
"""


CHECK_FOLDER_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        SELECT t.id AS team_id, t.parent_team_id
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        JOIN repository_collaborators rc ON rc.id = tm.member_id
        WHERE t.repository_id = $1 AND rc.user_id = $2

        UNION

        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    )
    SELECT p.allow_write
    FROM permissions p
    JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'folder'
    -- Checks if file_path starts with target_identifier
    AND $3 LIKE (p.target_identifier || '%')
    ORDER BY
        p.allow_write ASC,
        length(p.target_identifier) DESC
    LIMIT 1;
"""


CHECK_IF_TEAM_MEMBER = """
    SELECT
    c.role,
    EXISTS (
        SELECT 1
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        JOIN repository_collaborators rc ON rc.id = tm.member_id
        WHERE t.repository_id = $1 AND rc.user_id = $2
    ) AS is_in_team
    FROM repository_collaborators c
    WHERE c.repository_id = $1 AND c.user_id = $2;
"""
