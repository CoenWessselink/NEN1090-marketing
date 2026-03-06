from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Tenant, TenantUser, RefreshToken
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, MeResponse
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_token, decode_refresh
from app.core.audit import audit

router = APIRouter()

def _ua(req: Request) -> str:
    return req.headers.get("user-agent", "")

def _ip(req: Request) -> str:
    # simplistic; for prod use X-Forwarded-For handling
    return req.client.host if req.client else ""

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.name == payload.tenant).first()
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not tenant or not user:
        if tenant:
            audit(db, tenant_id=str(tenant.id), user_id=None, action="login_fail", ip=_ip(request), user_agent=_ua(request), meta={"email": payload.email})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    link = db.query(TenantUser).filter(TenantUser.tenant_id == tenant.id, TenantUser.user_id == user.id).first()
    if not link or not user.is_active:
        audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action="login_fail", ip=_ip(request), user_agent=_ua(request), meta={"reason": "no_membership_or_inactive"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action="login_fail", ip=_ip(request), user_agent=_ua(request), meta={"reason": "bad_password"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access, _ = create_access_token(user_id=str(user.id), tenant_id=str(tenant.id), role=link.role)
    refresh, refresh_exp = create_refresh_token(user_id=str(user.id), tenant_id=str(tenant.id), role=link.role)

    rt = RefreshToken(
        user_id=user.id,
        tenant_id=tenant.id,
        token_hash=hash_token(refresh),
        revoked=False,
        expires_at=refresh_exp.replace(tzinfo=None),
    )
    db.add(rt)
    db.commit()

    audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action="login_success", ip=_ip(request), user_agent=_ua(request))
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    try:
        claims = decode_refresh(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if claims.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    token_h = hash_token(payload.refresh_token)
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_h, RefreshToken.revoked == False).first()  # noqa
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    # expiry check (stored naive UTC)
    if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        rt.revoked = True
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user_id = claims.get("sub")
    tenant_id = claims.get("tenant_id")
    role = claims.get("role", "viewer")

    access, _ = create_access_token(user_id=user_id, tenant_id=tenant_id, role=role)
    new_refresh, new_exp = create_refresh_token(user_id=user_id, tenant_id=tenant_id, role=role)

    # rotate token
    rt.revoked = True
    db.commit()
    rt2 = RefreshToken(
        user_id=rt.user_id,
        tenant_id=rt.tenant_id,
        token_hash=hash_token(new_refresh),
        revoked=False,
        expires_at=new_exp.replace(tzinfo=None),
    )
    db.add(rt2)
    db.commit()

    audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action="refresh", ip=_ip(request), user_agent=_ua(request))
    return TokenResponse(access_token=access, refresh_token=new_refresh)

@router.post("/logout")
def logout(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    token_h = hash_token(payload.refresh_token)
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_h, RefreshToken.revoked == False).first()  # noqa
    if rt:
        rt.revoked = True
        db.commit()
        audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action="logout", ip=_ip(request), user_agent=_ua(request))
    return {"ok": True}

@router.get("/me", response_model=MeResponse)
def me(request: Request, claims = Depends(__import__("app.api.deps", fromlist=["get_current_claims"]).get_current_claims), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == claims.get("sub")).first()
    tenant = db.query(Tenant).filter(Tenant.id == claims.get("tenant_id")).first()
    if not user or not tenant:
        raise HTTPException(status_code=401, detail="Invalid session")
    return MeResponse(email=user.email, tenant=tenant.name, role=claims.get("role", "viewer"))
