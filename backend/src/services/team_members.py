from fastapi import HTTPException, status
from typing import List
from schemas.teams import TeamMember, AddNewTeamMemberRequest
from sqls.teams_sqls import ADD_NEW_MEMBER_TO_TEAM, REMOVE_MEMBER_FROM_TEAM, GET_ALL_TEAM_MEMBERS_IN_TEAM, CALL_ADD_NEW_TEAM_MEMBER
from services.repository_collaborator import get_user_details
from services.user import get_user_by_username_or_email

import asyncpg

async def add_new_member_in_repo_team(pool: asyncpg.Pool, repo_id: int, team_id: int, payload: AddNewTeamMemberRequest) -> TeamMember:
    async with pool.acquire() as conn:
        await conn.execute("BEGIN")
        try:
            try:
                user = await get_user_by_username_or_email(pool, payload.member_identifier)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                )

                row = await conn.fetchrow(
                    CALL_ADD_NEW_TEAM_MEMBER, repo_id, user["id"], team_id
                )
                if row is None:
                    raise HTTPException(status_code=500, detail="Team member add failed unexpectedly")

                res = TeamMember(
                    id=user["id"],
                    collaborator_id=row["p_collaborator_id"],
                    username=user["username"]
                )
            except asyncpg.PostgresError as e:
                msg = str(e)
                if "TEAM_NOT_FOUND" in msg:
                    raise HTTPException(
                        status_code=404, detail=f"Team {team_id} does not exist"
                    )
                if "TEAM_WRONG_REPO" in msg:
                    raise HTTPException(
                        status_code=400, detail="Team does not belong to this repository"
                    )
                raise HTTPException(
                    status_code=500, detail=f"Database error: {msg}"
                )
        except BaseException:
            await conn.execute("ROLLBACK")
            raise
        await conn.execute("COMMIT")
        return res


async def add_existing_collaborator_to_team(pool: asyncpg.Pool, repo_id: int, team_id: int, collaborator_id : int) -> TeamMember:
    async with pool.acquire() as conn:
        try:
            user = await get_user_details(pool, repo_id, collaborator_id)

            row = await conn.fetchrow(
                ADD_NEW_MEMBER_TO_TEAM, team_id, collaborator_id
            )
            if row is None:
                raise HTTPException(status_code=500, detail="Issue creation failed unexpectedly")

            res = TeamMember(
                id=user.id,
                collaborator_id=row["member_id"],
                username=user.username
            )
            return res
        except asyncpg.PostgresError as e:
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}"
            )


async def get_all_team_members_in_team(pool: asyncpg.Pool, team_id: int) -> List[TeamMember]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_TEAM_MEMBERS_IN_TEAM, team_id)

        response: List[TeamMember] = []

        for row in rows:
            response.append(TeamMember(**dict(row)))

        return response


async def delete_team_member_by_id(pool: asyncpg.Pool, team_id : int, collaborator_id : int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(REMOVE_MEMBER_FROM_TEAM, collaborator_id, team_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Team or member not found")

        return

