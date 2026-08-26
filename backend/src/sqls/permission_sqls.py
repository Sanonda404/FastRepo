CHECK_BRANCH_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        -- Anchor: Direct team memberships
        SELECT t.id AS team_id, t.parent_team_id
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE t.repository_id = $1 AND tm.member_id = $2

        UNION

        -- Recursive: Parent teams
        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    )
    SELECT p.allow_write
    FROM permissions p
    LEFT JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'branch'
    AND p.target_identifier = $3
    -- Matches direct user permission OR inherited team permission
    AND (p.user_id = $2 OR ut.team_id IS NOT NULL)
    ORDER BY p.allow_write ASC -- DENY (False) takes priority over ALLOW (True)
    LIMIT 1;
"""


CHECK_FOLDER_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        -- Anchor: Direct team memberships
        SELECT t.id AS team_id, t.parent_team_id
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE t.repository_id = $1 AND tm.member_id = $2

        UNION

        -- Recursive: Parent teams
        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    )
    SELECT p.allow_write
    FROM permissions p
    LEFT JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'folder'
    -- Checks if file_path starts with target_identifier
    AND $3 LIKE (p.target_identifier || '%')
    -- Matches direct user permission OR inherited team permission
    AND (p.user_id = $2 OR ut.team_id IS NOT NULL)
    ORDER BY 
        p.allow_write ASC,           -- Explicit DENY (False) overrides ALLOW (True)
        length(p.target_identifier) DESC -- Most specific directory path wins
    LIMIT 1;
"""


CHECK_IF_TEAM_MEMBER = """
    SELECT 
    c.role,
    EXISTS (
        SELECT 1 
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE t.repository_id = $1 AND tm.member_id = $2
    ) AS is_in_team
    FROM collaborators c
    WHERE c.repository_id = $1 AND c.user_id = $2;
"""
