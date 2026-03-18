from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant: str = "demo"


class AuthUserResponse(BaseModel):
    email: EmailStr
    tenant: str
    tenant_id: str
    role: str
    name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthUserResponse | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr
    tenant: str = "demo"


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    ok: bool = True
    message: str
    reset_token: str | None = None
    reset_url: str | None = None


class MeResponse(BaseModel):
    email: EmailStr
    tenant: str
    tenant_id: str
    role: str
    name: str | None = None
