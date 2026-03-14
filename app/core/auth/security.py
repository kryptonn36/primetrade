from datetime import datetime, timedelta, timezone
import logging
from typing import Any

import bcrypt
import jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

from app.core.config import settings


logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


def _is_bcrypt_hash(hashed: str) -> bool:
    return hashed.startswith(BCRYPT_PREFIXES)


def hash_password(plain: str) -> str:
    try:
        return pwd_context.hash(plain)
    except Exception as exc:
        logger.exception("Password hashing failed")
        raise RuntimeError("password hashing failed") from exc


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if _is_bcrypt_hash(hashed):
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        return pwd_context.verify(plain, hashed)
    except (TypeError, ValueError, UnknownHashError):
        return False
    except Exception:
        logger.exception("Password verification failed")
        return False


def create_access_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    try:
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    except jwt.PyJWTError as exc:
        logger.exception("Access token creation failed")
        raise RuntimeError("access token creation failed") from exc


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        raise
    except Exception as exc:
        logger.exception("Access token decoding failed")
        raise jwt.InvalidTokenError("invalid token") from exc

    if not isinstance(payload, dict):
        raise jwt.InvalidTokenError("invalid token payload")
    return payload
