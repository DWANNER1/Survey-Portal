from functools import lru_cache
from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict[str, Any]:
    if not settings.clerk_jwks_url:
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL is not configured")

    import urllib.request
    import json

    with urllib.request.urlopen(settings.clerk_jwks_url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    token = credentials.credentials
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        keys = _fetch_jwks().get("keys", [])
        key = next((item for item in keys if item.get("kid") == kid), None)
        if key is None:
            raise HTTPException(status_code=401, detail="Invalid token key id")

        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer if settings.clerk_issuer else None,
            options={"verify_aud": False},
        )
        user_id = claims.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing subject")
        return str(user_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {exc}") from exc
