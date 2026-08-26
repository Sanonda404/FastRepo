from schemas.issues import IssueCreateRequest, IssueResponse, LabelResponse, IssueSummary, IssueLabel
from sqls.issue_sqls import CREATE_ISSUE, GET_ALL_ISSUES, GET_ISSUE_BY_NUMBER, DELETE_ISSUE_BY_REPO_ID_AND_NUMBER, CLOSE_ISSUE_BY_REPO_ID_AND_NUMBER, GET_ISSUE_REPOSITORY, ADD_ASSIGNEE, IS_ISSUE_ASSIGNEE, REMOVE_ASSIGNEE, LIST_ASSIGNEES, CREATE_LABEL, ATTACH_LABEL, DETACH_LABEL, LIST_ISSUE_LABELS
from fastapi import HTTPException
from typing import List
from schemas.teams import TeamDetails, TeamCreateRequest, TeamMember
from sqls.teams_sqls import CREATE_TEAM, GET_ALL_TEAMS_IN_REPO, DELETE_TEAM_BY_ID, UPDATE_TEAM_BY_ID
import asyncpg

async def create_team_in_repo(pool: asyncpg.Pool, repo_id: int, payload: TeamCreateRequest):
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                CREATE_TEAM, repo_id, payload.name, payload.parent_team_id
            )
            if row is None:
                raise HTTPException(status_code=500, detail="Issue creation failed unexpectedly")
            row_dict = dict(row)
            row_dict["members"] = []
            return TeamDetails(**row_dict)
        except asyncpg.PostgresError as e:
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}"
            )


async def get_all_teams_in_repo(pool: asyncpg.Pool, repo_id: int) -> List[TeamDetails]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(GET_ALL_TEAMS_IN_REPO, repo_id)

        response: List[TeamDetails] = []

        for row in rows:
            members : List[TeamMember] = []
            
            for member in row["members"]:
                members.append(TeamMember(
                    id = member["id"],
                    collaborator_id=member["member_id"],
                    username=member["username"]
                )
                )
            
            
            response.append(TeamDetails(
                id = row["id"],
                repository_id= row["repository_id"],
                name= row["name"],
                parent_team_id= row["parent_team_id"],
                members=members
            ))

        return response


async def delete_team_by_id(pool: asyncpg.Pool, team_id : int) -> None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(DELETE_TEAM_BY_ID, team_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Team not found")

        return


async def update_team_name_by_id(pool: asyncpg.Pool, team_id: int, new_name : str) -> TeamDetails:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(UPDATE_TEAM_BY_ID, team_id, new_name)
        if row is None:
            raise HTTPException(status_code=404, detail="Team not found")

        members : List[TeamMember] = []

        for member in row["members"]:
            members.append(TeamMember(
                id = member["id"],
                collaborator_id=member["member_id"],
                username=member["username"]
            )
        )


        response = TeamDetails(
            id = row["id"],
            repository_id= row["repository_id"],
            name= row["name"],
            parent_team_id= row["parent_team_id"],
            members=members
        )
        return response
