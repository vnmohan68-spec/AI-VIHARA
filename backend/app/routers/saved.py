from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.database import get_db
from app.models.models import SavedPlace, User
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class SavePlaceRequest(BaseModel):
    name: str
    location: str
    type: Optional[str] = None
    monument_id: Optional[str] = None
    note: Optional[str] = None


@router.get("")
async def get_saved(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedPlace)
        .where(SavedPlace.user_id == current_user.id)
        .order_by(desc(SavedPlace.saved_at))
    )
    places = result.scalars().all()
    return [
        {"id": p.id, "name": p.name, "location": p.location, "type": p.type,
         "note": p.note, "saved_at": p.saved_at}
        for p in places
    ]


@router.post("")
async def save_place(
    req: SavePlaceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    place = SavedPlace(
        user_id=current_user.id,
        name=req.name,
        location=req.location,
        type=req.type,
        monument_id=req.monument_id,
        note=req.note,
    )
    db.add(place)
    await db.flush()
    return {"id": place.id, "message": "Place saved"}


@router.delete("/{saved_id}")
async def unsave_place(
    saved_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedPlace).where(SavedPlace.id == saved_id, SavedPlace.user_id == current_user.id)
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(404, "Saved place not found")
    await db.delete(place)
    return {"message": "Place removed"}
