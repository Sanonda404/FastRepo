CHECK_BRANCH_PERMISSION = """
    SELECT p.allow_write
    FROM permissions p
    LEFT JOIN team_members tm ON p.team_id = tm.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'branch'
    AND p.target_identifier = $2
    AND (p.user_id = $3 OR tm.member_id = $3)
    ORDER BY p.allow_write ASC
    LIMIT 1;
"""
CHECK_FOLDER_PERMISSION = """
    SELECT p.allow_write
    FROM permissions p
    LEFT JOIN team_members tm ON p.team_id = tm.team_id
    WHERE p.repository_id = $1
    AND p.target_type = 'folder'
    AND (p.user_id = $3 OR tm.member_id = $3)
    AND $2 LIKE (p.target_identifier || '%')
    ORDER BY length(p.target_identifier) DESC
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
