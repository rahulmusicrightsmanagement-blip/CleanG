from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import MasterColumn, User
from ..schemas import MasterColumnOut

router = APIRouter(prefix="/api/master", tags=["master"])


@router.get("/columns", response_model=list[MasterColumnOut])
def master_columns(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """The canonical output schema every cleaned file is mapped onto."""
    return db.scalars(select(MasterColumn).order_by(MasterColumn.position)).all()
