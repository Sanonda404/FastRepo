CREATE_TEAM = """
    INSERT INTO teams(repository_id, name, parent_team_id)
        VALUES (
            $1, $2, $3)
    RETURNING id, repository_id, name, parent_team_id
"""


GET_ALL_TEAMS_IN_REPO = """
    SELECT t.id, t.repository_id, t.name, t.parent_team_id,
        COALESCE((
            SELECT ARRAY_AGG(ROW(u.id, tm.member_id, u.username))
            FROM team_members tm
            INNER JOIN repository_collaborators rc
            ON tm.member_id = rc.id
            INNER JOIN users u
            ON u.id = rc.user_id
            WHERE tm.team_id = t.id
            ),
            '{}'
        ) AS members
    FROM teams t
    WHERE t.repository_id = $1
"""

DELETE_TEAM_BY_ID = """
    DELETE FROM teams
    WHERE id = $1
    RETURNING id
"""

UPDATE_TEAM_BY_ID = """
    UPDATE teams t
    SET name = $2
    WHERE id = $1
    RETURNING t.id, t.repository_id, t.name, t.parent_team_id,
    COALESCE((
        SELECT ARRAY_AGG(ROW(u.id, tm.member_id, u.username))
        FROM team_members tm
        INNER JOIN repository_collaborators rc
        ON tm.member_id = rc.id
        INNER JOIN users u
        ON u.id = rc.user_id
        WHERE tm.team_id = t.id
        ),
        '{}'
    ) AS members
"""

