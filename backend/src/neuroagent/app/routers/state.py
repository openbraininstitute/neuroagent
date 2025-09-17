"""State CRUDs."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from neuroagent.app.database.sql_schemas import State
from neuroagent.app.dependencies import (
    get_session,
    get_user_info,
)
from neuroagent.app.schemas import (
    SharedState,
    StateCreate,
    StatePatch,
    StateRead,
    StateReset,
    UserInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/state", tags=["Shared state's CRUD"])


@router.post("")
async def create_state(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    body: StateCreate = StateCreate(),
) -> StateRead:
    """Create state for a user."""
    if await session.get(State, user_info.sub):
        raise HTTPException(
            status_code=500, detail=f"State for user {user_info.sub} already exists."
        )
    new_state = State(user_id=user_info.sub, state=body.model_dump())
    session.add(new_state)
    await session.commit()
    await session.refresh(new_state)

    return StateRead(**new_state.__dict__)


@router.get("")
async def get_state(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
) -> StateRead:
    """Get an existing state."""
    result = await session.get(State, user_info.sub)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"State for user {user_info.sub} doesn't exist."
        )
    return StateRead(**result.__dict__)


@router.patch("")
async def patch_state(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    patch_body: StatePatch,
) -> dict[str, str]:
    """Patch an existing key of the state."""
    # Create a dict with just the key to update
    update_dict = {patch_body.key: patch_body.new_state.model_dump()}

    await session.execute(
        update(State)
        .where(State.user_id == user_info.sub)
        .values(state=State.state.op("||")(update_dict))
    )
    await session.commit()

    # We don't get the object for efficiency
    return {"Acknowledged": "true"}


@router.patch("/reset")
async def reset_state(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
    reset_body: StateReset,
) -> dict[str, str]:
    """Patch an existing key of the state."""
    # Create a dict with just the key to update
    update_dict = {reset_body.key: SharedState().model_dump()[reset_body.key]}

    await session.execute(
        update(State)
        .where(State.user_id == user_info.sub)
        .values(state=State.state.op("||")(update_dict))
    )
    await session.commit()

    # We don't get the object for efficiency
    return {"Acknowledged": "true"}


@router.delete("")
async def delete_state(
    session: Annotated[AsyncSession, Depends(get_session)],
    user_info: Annotated[UserInfo, Depends(get_user_info)],
) -> dict[str, str]:
    """Delete an existing state."""
    await session.execute(delete(State).where(State.user_id == user_info.sub))
    await session.commit()

    return {"Acknowledged": "true"}
