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

CREATE_PERMISSION = """
    WITH ins AS (
        INSERT INTO permissions (repository_id, team_id, target_type, target_identifier, allow_write)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, repository_id, team_id, target_type, target_identifier, allow_write
    )
    SELECT ins.*, t.name AS team_name
    FROM ins
    JOIN teams t ON t.id = ins.team_id;
"""

GET_ALL_PERMISSIONS_OF_REPO = """
    SELECT p.id, p.repository_id, p.team_id, t.name as team_name, p.target_type, p.target_identifier, p.allow_write
    FROM permissions p
    INNER JOIN teams t
    ON t.id = p.team_id
    WHERE p.repository_id = $1;
"""
DELETE_PERMISSION_BY_ID = """
    DELETE FROM permissions
    WHERE id = $1
    RETURNING id;
"""


DELETE_PERMISSIONS_BY_TEAM = """
    DELETE FROM permissions
    WHERE repository_id = $1 AND team_id = $2
    RETURNING id;
"""

DELETE_PERMISSIONS_BY_TEAM_AND_TARGET = """
    DELETE FROM permissions
    WHERE repository_id = $1
    AND team_id = $2
    AND target_type = $3
    AND target_identifier = $4
    RETURNING id;
"""

UPDATE_PERMISSION_BY_ID = """
    WITH updated AS (
        UPDATE permissions
        SET
            target_type = COALESCE($3, target_type),
            target_identifier = COALESCE($4, target_identifier),
            allow_write = COALESCE($5, allow_write)
        WHERE id = $1 AND repository_id = $2
        RETURNING id, repository_id, team_id, target_type, target_identifier, allow_write
    )
    SELECT
        u.id,
        u.repository_id,
        u.team_id,
        t.name AS team_name,
        u.target_type,
        u.target_identifier,
        u.allow_write
    FROM updated u
    INNER JOIN teams t ON t.id = u.team_id
"""

GET_PERMISSION_BY_TEAM_AND_TARGET = """
    SELECT p.id, p.repository_id, p.team_id, t.name as team_name, p.target_type, p.target_identifier, p.allow_write
    FROM permissions p
    INNER JOIN teams t
    ON t.id = p.team_id
    WHERE p.repository_id = $1
    AND team_id = $2
    AND target_type = $3
    AND target_identifier = $4
    AND allow_write = $5;
"""

