from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_claims, get_current_user
from app.core.audit import audit
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_password_reset,
    decode_refresh,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.models import AuthRateLimitEvent, PasswordResetToken, RefreshToken, Tenant, TenantUser, User
from app.db.session import get_db
from app.schemas.auth import (
    AuthUserResponse,
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RefreshRequest,
    TokenResponse,
)

router = APIRouter()
_RATE_LIMIT_WINDOW = timedelta(minutes=15)
_RATE_LIMIT_MAX = 5
_RESET_TOKEN_GRACE = timedelta(minutes=5)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ua(req: Request) -> str:
    return req.headers.get("user-agent", "")


def _ip(req: Request) -> str:
    return req.client.host if req.client else ""


def _build_user_response(*, user: User, tenant: Tenant, role: str) -> AuthUserResponse:
    display_name = user.email.split("@", 1)[0] if getattr(user, "email", None) else None
    return AuthUserResponse(
        email=user.email,
        tenant=tenant.name,
        tenant_id=str(tenant.id),
        role=role,
        name=display_name,
    )


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _normalize_tenant(tenant: str | None) -> str:
    return (tenant or "demo").strip().lower()


def _ensure_password_policy(password: str) -> None:
    if len(password or "") < 8:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 8 tekens bevatten")
    if not any(ch.isalpha() for ch in password):
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 1 letter bevatten")
    if not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 1 cijfer bevatten")


def _rate_limit_key(req: Request, email: str, tenant: str | None = None) -> str:
    return f"password_reset:{_ip(req)}:{_normalize_tenant(tenant)}:{_normalize_email(email)}"


def _prune_rate_limit_events(db: Session, *, action: str, cutoff: datetime) -> None:
    db.query(AuthRateLimitEvent).filter(
        AuthRateLimitEvent.action == action,
        AuthRateLimitEvent.created_at < cutoff.replace(tzinfo=None),
    ).delete(synchronize_session=False)
    db.flush()


def _check_reset_rate_limit(db: Session, req: Request, email: str, tenant: str | None = None) -> None:
    now = _utcnow()
    cutoff = now - _RATE_LIMIT_WINDOW
    key = _rate_limit_key(req, email, tenant)
    _prune_rate_limit_events(db, action='password_reset_request', cutoff=cutoff)
    attempts = (
        db.query(AuthRateLimitEvent)
        .filter(
            AuthRateLimitEvent.action == 'password_reset_request',
            AuthRateLimitEvent.subject_key == key,
            AuthRateLimitEvent.created_at >= cutoff.replace(tzinfo=None),
        )
        .count()
    )
    if attempts >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Te veel resetverzoeken. Probeer het later opnieuw.")
    db.add(AuthRateLimitEvent(action='password_reset_request', subject_key=key, created_at=now.replace(tzinfo=None)))
    db.commit()


def _find_membership(db: Session, tenant: Tenant, user: User) -> TenantUser | None:
    return (
        db.query(TenantUser)
        .filter(TenantUser.tenant_id == tenant.id, TenantUser.user_id == user.id)
        .first()
    )


def _store_refresh_token(db: Session, *, token: str, refresh_exp: datetime, user_id, tenant_id) -> None:
    db.add(
        RefreshToken(
            user_id=user_id,
            tenant_id=tenant_id,
            token_hash=hash_token(token),
            revoked=False,
            expires_at=refresh_exp.replace(tzinfo=None),
        )
    )
    db.flush()


def _issue_tokens(db: Session, tenant: Tenant, user: User, role: str) -> TokenResponse:
    access, _ = create_access_token(user_id=str(user.id), tenant_id=str(tenant.id), tenant=tenant.name, role=role)
    refresh, refresh_exp = create_refresh_token(user_id=str(user.id), tenant_id=str(tenant.id), tenant=tenant.name, role=role)
    _store_refresh_token(db, token=refresh, refresh_exp=refresh_exp, user_id=user.id, tenant_id=tenant.id)
    db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=_build_user_response(user=user, tenant=tenant, role=role),
    )


def _prune_password_reset_tokens(db: Session, *, now: datetime) -> None:
    cutoff = now - _RESET_TOKEN_GRACE
    db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at < cutoff.replace(tzinfo=None)
    ).delete(synchronize_session=False)
    db.flush()


def _store_password_reset_token(db: Session, *, token: str, claims: dict, expires_at: datetime, user_id, tenant_id, email: str) -> None:
    now = _utcnow()
    _prune_password_reset_tokens(db, now=now)
    db.add(
        PasswordResetToken(
            token_hash=hash_token(token),
            jti=str(claims.get('jti') or ''),
            user_id=user_id,
            tenant_id=tenant_id,
            email=_normalize_email(email),
            issued_at=now.replace(tzinfo=None),
            expires_at=expires_at.replace(tzinfo=None),
        )
    )
    db.commit()


def _get_password_reset_record(db: Session, token: str) -> PasswordResetToken | None:
    now = _utcnow()
    _prune_password_reset_tokens(db, now=now)
    return db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == hash_token(token)).first()


def _mark_reset_token_used(db: Session, record: PasswordResetToken) -> None:
    record.used_at = _utcnow().replace(tzinfo=None)
    db.flush()


def _revoke_all_refresh_tokens(db: Session, *, user_id, tenant_id) -> int:
    rows = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.tenant_id == tenant_id,
        RefreshToken.revoked == False,
    ).all()
    for row in rows:
        row.revoked = True
    db.flush()
    return len(rows)


def _revoke_refresh_token_record(db: Session, record: RefreshToken | None) -> bool:
    if not record or record.revoked:
        return False
    record.revoked = True
    db.flush()
    return True


def _generic_reset_response(reset_token: str | None = None) -> MessageResponse:
    reset_url = None
    if reset_token:
        base_url = settings.APP_URL.rstrip('/')
        reset_url = f"{base_url}/reset-password?token={reset_token}"
    return MessageResponse(
        ok=True,
        message="Als dit account bestaat, is een resetlink verstuurd.",
        reset_token=reset_token,
        reset_url=reset_url,
    )


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    normalized_tenant = _normalize_tenant(payload.tenant)
    normalized_email = _normalize_email(payload.email)

    tenant = db.query(Tenant).filter(Tenant.name == normalized_tenant).first()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not tenant or not user:
        if tenant:
            audit(db, tenant_id=str(tenant.id), user_id=None, action='login_fail', ip=_ip(request), user_agent=_ua(request), meta={'email': normalized_email})
        raise HTTPException(status_code=401, detail='Invalid credentials')

    link = _find_membership(db, tenant, user)
    if not link or not user.is_active or not tenant.is_active:
        audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action='login_fail', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'no_membership_or_inactive'})
        raise HTTPException(status_code=401, detail='Invalid credentials')

    if not verify_password(payload.password, user.password_hash):
        audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action='login_fail', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'bad_password'})
        raise HTTPException(status_code=401, detail='Invalid credentials')

    response = _issue_tokens(db, tenant, user, link.role)
    audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action='login_success', ip=_ip(request), user_agent=_ua(request))
    return response


@router.post('/refresh', response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    try:
        claims = decode_refresh(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid refresh token')

    if claims.get('type') != 'refresh':
        raise HTTPException(status_code=401, detail='Invalid token type')

    token_h = hash_token(payload.refresh_token)
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_h).first()
    if not rt:
        raise HTTPException(status_code=401, detail='Refresh token revoked')

    if rt.revoked:
        raise HTTPException(status_code=401, detail='Refresh token revoked')

    if str(rt.user_id) != str(claims.get('sub')) or str(rt.tenant_id) != str(claims.get('tenant_id')):
        _revoke_refresh_token_record(db, rt)
        db.commit()
        audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action='refresh_denied', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'token_claim_mismatch'})
        raise HTTPException(status_code=401, detail='Invalid session')

    if rt.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        _revoke_refresh_token_record(db, rt)
        db.commit()
        audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action='refresh_denied', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'token_expired'})
        raise HTTPException(status_code=401, detail='Refresh token expired')

    user = db.query(User).filter(User.id == rt.user_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == rt.tenant_id).first()
    if not user or not tenant or not user.is_active or not tenant.is_active:
        _revoke_refresh_token_record(db, rt)
        db.commit()
        audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action='refresh_denied', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'user_or_tenant_inactive'})
        raise HTTPException(status_code=401, detail='Invalid session')

    membership = _find_membership(db, tenant, user)
    if not membership:
        _revoke_refresh_token_record(db, rt)
        db.commit()
        audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action='refresh_denied', ip=_ip(request), user_agent=_ua(request), meta={'reason': 'membership_missing'})
        raise HTTPException(status_code=401, detail='Invalid session')

    _revoke_refresh_token_record(db, rt)
    response = _issue_tokens(db, tenant, user, membership.role)
    audit(db, tenant_id=str(rt.tenant_id), user_id=str(rt.user_id), action='refresh', ip=_ip(request), user_agent=_ua(request))
    return response


@router.post('/logout', response_model=MessageResponse)
def logout(
    request: Request,
    payload: LogoutRequest | None = Body(default=None),
    claims=Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    revoked_count = 0
    refresh_token = payload.refresh_token if payload else None
    if refresh_token:
        token_h = hash_token(refresh_token)
        rt = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_h,
            RefreshToken.user_id == claims.get('sub'),
            RefreshToken.tenant_id == claims.get('tenant_id'),
        ).first()
        revoked_count = int(_revoke_refresh_token_record(db, rt))
        db.commit()
    else:
        revoked_count = _revoke_all_refresh_tokens(db, user_id=claims.get('sub'), tenant_id=claims.get('tenant_id'))
        db.commit()

    audit(db, tenant_id=str(claims.get('tenant_id')), user_id=str(claims.get('sub')), action='logout', ip=_ip(request), user_agent=_ua(request), meta={'revoked_count': revoked_count})
    return MessageResponse(ok=True, message='Je bent uitgelogd.')


@router.post('/reset-password/request', response_model=MessageResponse)
def request_password_reset(payload: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    normalized_tenant = _normalize_tenant(payload.tenant)
    normalized_email = _normalize_email(payload.email)
    _check_reset_rate_limit(db, request, normalized_email, normalized_tenant)

    tenant = db.query(Tenant).filter(Tenant.name == normalized_tenant).first()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not tenant or not user or not user.is_active or not tenant.is_active:
        return _generic_reset_response()

    membership = _find_membership(db, tenant, user)
    if not membership:
        return _generic_reset_response()

    token, expires_at = create_password_reset_token(user_id=str(user.id), tenant_id=str(tenant.id), tenant=tenant.name, email=user.email)
    claims = decode_password_reset(token)
    _store_password_reset_token(db, token=token, claims=claims, expires_at=expires_at, user_id=user.id, tenant_id=tenant.id, email=user.email)
    audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action='password_reset_request', ip=_ip(request), user_agent=_ua(request))

    expose = getattr(settings, 'ENV', 'dev').lower() != 'prod'
    return _generic_reset_response(token if expose else None)


@router.post('/reset-password/confirm', response_model=MessageResponse)
def confirm_password_reset(payload: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)):
    _ensure_password_policy(payload.password)
    try:
        claims = decode_password_reset(payload.token)
    except Exception:
        raise HTTPException(status_code=400, detail='Ongeldige of verlopen resetlink')

    if claims.get('type') != 'password_reset':
        raise HTTPException(status_code=400, detail='Ongeldig token type')

    record = _get_password_reset_record(db, payload.token)
    if not record:
        raise HTTPException(status_code=400, detail='Ongeldige of verlopen resetlink')
    if record.used_at:
        raise HTTPException(status_code=400, detail='Deze resetlink is al gebruikt')
    if record.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status_code=400, detail='Ongeldige of verlopen resetlink')
    if record.jti and str(record.jti) != str(claims.get('jti') or ''):
        raise HTTPException(status_code=400, detail='Ongeldige resetaanvraag')
    if str(record.user_id) != str(claims.get('sub')) or str(record.tenant_id) != str(claims.get('tenant_id')):
        raise HTTPException(status_code=400, detail='Ongeldige resetaanvraag')

    user = db.query(User).filter(User.id == claims.get('sub')).first()
    tenant = db.query(Tenant).filter(Tenant.id == claims.get('tenant_id')).first()
    if not user or not tenant:
        raise HTTPException(status_code=400, detail='Ongeldige resetaanvraag')

    membership = _find_membership(db, tenant, user)
    if not membership:
        raise HTTPException(status_code=400, detail='Ongeldige resetaanvraag')

    user.password_hash = hash_password(payload.password)
    _mark_reset_token_used(db, record)
    revoked_count = _revoke_all_refresh_tokens(db, user_id=user.id, tenant_id=tenant.id)
    db.commit()

    audit(db, tenant_id=str(tenant.id), user_id=str(user.id), action='password_reset_confirm', ip=_ip(request), user_agent=_ua(request), meta={'revoked_count': revoked_count})
    return MessageResponse(ok=True, message='Je wachtwoord is succesvol ingesteld.')




@router.post('/set-password', response_model=MessageResponse)
def set_password(payload: PasswordResetConfirmRequest, request: Request, db: Session = Depends(get_db)):
    return confirm_password_reset(payload, request, db)


@router.post('/change-password', response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    claims=Depends(get_current_claims),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_password_policy(payload.new_password)

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail='Huidig wachtwoord is onjuist')
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail='Nieuwe wachtwoord moet verschillen van het huidige wachtwoord')

    user.password_hash = hash_password(payload.new_password)
    tenant_id = claims.get('tenant_id')
    revoked_count = _revoke_all_refresh_tokens(db, user_id=user.id, tenant_id=tenant_id)
    db.commit()

    audit(db, tenant_id=str(tenant_id), user_id=str(user.id), action='change_password', ip=_ip(request), user_agent=_ua(request), meta={'revoked_count': revoked_count})
    return MessageResponse(ok=True, message='Wachtwoord gewijzigd')


@router.get('/me', response_model=MeResponse)
def me(
    claims=Depends(get_current_claims),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == claims.get('sub')).first()
    tenant = db.query(Tenant).filter(Tenant.id == claims.get('tenant_id')).first()
    if not user or not tenant:
        raise HTTPException(status_code=401, detail='Invalid session')
    membership = _find_membership(db, tenant, user)
    if not membership:
        raise HTTPException(status_code=401, detail='Invalid session')
    return MeResponse(email=user.email, tenant=tenant.name, tenant_id=str(tenant.id), role=membership.role, name=getattr(user, 'name', None))
