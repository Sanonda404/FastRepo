CHECK_BRANCH_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        SELECT t.id AS team_id, t.parent_team_id
        FROM team_members tm
        JOIN repository_collaborators rc ON rc.id = tm.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE rc.repository_id = $1 
          AND rc.user_id = $2

        UNION

        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    ),
    configured_branch_rules AS (
        SELECT p.target_identifier, p.allow_write
        FROM permissions p
        JOIN user_teams ut ON p.team_id = ut.team_id
        WHERE p.target_type = 'branch'
    )
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM configured_branch_rules) THEN TRUE

        ELSE COALESCE(
            (
                SELECT allow_write 
                FROM configured_branch_rules 
                WHERE target_identifier = $3 
                ORDER BY allow_write ASC
                LIMIT 1
            ),
            FALSE
        )
    END AS allow_write;
"""

CHECK_FOLDER_PERMISSION = """
    WITH RECURSIVE user_teams AS (
        SELECT t.id AS team_id, t.parent_team_id
        FROM team_members tm
        JOIN repository_collaborators rc ON rc.id = tm.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE rc.repository_id = $1 AND rc.user_id = $2

        UNION

        SELECT parent.id AS team_id, parent.parent_team_id
        FROM teams parent
        JOIN user_teams ut ON ut.parent_team_id = parent.id
    )
    SELECT p.allow_write
    FROM permissions p
    JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.target_type = 'folder'
      AND (
          $3 = p.target_identifier 
          OR $3 LIKE (RTRIM(p.target_identifier, '/') || '/%')
          OR p.target_identifier = '/'
      )
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
        INSERT INTO permissions (team_id, target_type, target_identifier, allow_write)
        VALUES ($1, $2, $3, $4)
        RETURNING id, team_id, target_type, target_identifier, allow_write
    )
    SELECT 
        ins.id, 
        t.repository_id, 
        ins.team_id, 
        t.name AS team_name, 
        ins.target_type, 
        ins.target_identifier, 
        ins.allow_write
    FROM ins
    JOIN teams t ON t.id = ins.team_id;
"""


GET_ALL_PERMISSIONS_OF_REPO = """
    SELECT 
        p.id, 
        t.repository_id, 
        p.team_id, 
        t.name AS team_name, 
        p.target_type, 
        p.target_identifier, 
        p.allow_write
    FROM permissions p
    INNER JOIN teams t ON t.id = p.team_id
    WHERE t.repository_id = $1;
"""


DELETE_PERMISSION_BY_ID = """
    DELETE FROM permissions
    WHERE id = $1
    RETURNING id;
"""


DELETE_PERMISSIONS_BY_TEAM = """
    DELETE FROM permissions
    WHERE team_id = $1
    RETURNING id;
"""


DELETE_PERMISSIONS_BY_TEAM_AND_TARGET = """
    DELETE FROM permissions
    WHERE team_id = $1
    AND target_type = $2
    AND target_identifier = $3
    RETURNING id;
"""


UPDATE_PERMISSION_BY_ID = """
    WITH updated AS (
        UPDATE permissions
        SET
            target_type = COALESCE($2, target_type),
            target_identifier = COALESCE($3, target_identifier),
            allow_write = COALESCE($4, allow_write)
        WHERE id = $1
        RETURNING id, team_id, target_type, target_identifier, allow_write
    )
    SELECT
        u.id,
        t.repository_id,
        u.team_id,
        t.name AS team_name,
        u.target_type,
        u.target_identifier,
        u.allow_write
    FROM updated u
    INNER JOIN teams t ON t.id = u.team_id;
"""


GET_PERMISSION_BY_TEAM_AND_TARGET = """
    SELECT 
        p.id, 
        t.repository_id, 
        p.team_id, 
        t.name AS team_name, 
        p.target_type, 
        p.target_identifier, 
        p.allow_write
    FROM permissions p
    INNER JOIN teams t ON t.id = p.team_id
    WHERE p.team_id = $1
    AND p.target_type = $2
    AND p.target_identifier = $3
    AND p.allow_write = $4;
"""
