from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import User
from ..schemas import PasswordReset, UserCreate, UserOut, UserUpdate
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: provision an account. There is no public registration."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin-only: change a user's role or active state.

    Disabling an account (or any change) bumps `token_version`, which revokes
    every outstanding session for that user immediately.
    """
    user = _get_user_or_404(user_id, db)
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account."
        )
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
        if payload.is_active is False:
            user.token_version += 1
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=UserOut)
def reset_password(
    user_id: int,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: set a new password and revoke the user's existing sessions."""
    user = _get_user_or_404(user_id, db)
    user.hashed_password = hash_password(payload.password)
    # Invalidate any token issued before the reset, and clear any lockout.
    user.token_version += 1
    user.failed_logins = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)
    return user
