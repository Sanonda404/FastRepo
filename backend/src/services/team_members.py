from fastapi import HTTPException, status
from typing import List
from schemas.teams import TeamDetails, TeamCreateRequest, TeamMember, AddNewTeamMemberRequest
from sqls.teams_sqls import ADD_NEW_MEMBER_TO_TEAM, REMOVE_MEMBER_FROM_TEAM, GET_ALL_TEAMS_IN_REPO, GET_ALL_TEAM_MEMBERS_IN_TEAM
from services.repository_collaborator import add_collaborator_to_repo, get_user_details
from services.user import get_user_by_username_or_email
from schemas.repository_collaborator import CollaboratorAddRequest

import asyncpg

async def add_new_member_in_repo_team(pool: asyncpg.Pool, repo_id: int, team_id: int, payload: AddNewTeamMemberRequest) -> TeamMember:
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                #find the user
                user = await get_user_by_username_or_email(pool, payload.member_identifier)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                )

                #first add member as collaborator
                collaborator = CollaboratorAddRequest(
                    identifier=payload.member_identifier,
                    role="Member"
                )

                collaborator = await add_collaborator_to_repo(pool, repo_id, collaborator, user)

                # now add member to team
                row = await conn.fetchrow(
                    ADD_NEW_MEMBER_TO_TEAM, team_id, collaborator.id
                )
                if row is None:
                    raise HTTPException(status_code=500, detail="Issue creation failed unexpectedly")
                
                res = TeamMember(
                    id=user["id"],
                    collaborator_id=row["member_id"],
                    username=user["username"]
                )
                return res
            except asyncpg.PostgresError as e:
                raise HTTPException(
                    status_code=500, detail=f"Database error: {str(e)}"
                )


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

