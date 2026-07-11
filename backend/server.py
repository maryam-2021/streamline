from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
import time
import bcrypt
import httpx
import asyncio
import resend
import stripe
from openai import AsyncOpenAI
import logging
import uuid
import secrets
import hashlib
import ipaddress
import socket
from urllib.parse import urlparse
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="StreamLine API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str, key: str = "access_token"):
    response.set_cookie(key=key, value=token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def send_account_email(recipient: str, subject: str, html: str):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.info("Account email skipped because RESEND_API_KEY is not configured")
        return
    resend.api_key = api_key
    await asyncio.to_thread(resend.Emails.send, {
        "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
        "to": [recipient],
        "subject": subject,
        "html": html,
    })


async def issue_account_token(user: dict, purpose: str, path: str, background_tasks: BackgroundTasks):
    raw = secrets.token_urlsafe(48)
    await db.account_tokens.delete_many({"user_id": user["user_id"], "purpose": purpose})
    await db.account_tokens.insert_one({
        "user_id": user["user_id"],
        "purpose": purpose,
        "token_hash": token_digest(raw),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "created_at": datetime.now(timezone.utc),
    })
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    if frontend_url:
        url = f"{frontend_url}{path}?token={raw}"
        label = "Reset password" if purpose == "password_reset" else "Verify email"
        background_tasks.add_task(send_account_email, user["email"], f"{label} — StreamLine", f'<p>{label} by opening this secure link:</p><p><a href="{url}">{label}</a></p><p>This link expires in one hour.</p>')


# ---------- Models ----------

class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=120)
    message: str = Field(min_length=1, max_length=2000)


class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: Optional[str] = None
    message: str
    created_at: str = Field(default_factory=now_iso)


class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str = "client"
    picture: Optional[str] = None
    plan: str = "starter"
    subscription_status: str = "inactive"
    email_verified: bool = False
    token: Optional[str] = None


class CheckoutInput(BaseModel):
    plan: str = Field(pattern="^pro$")


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    password: str = Field(min_length=10, max_length=128)


class VerifyEmailInput(BaseModel):
    token: str = Field(min_length=32, max_length=256)


class DeleteAccountInput(BaseModel):
    password: Optional[str] = Field(default=None, max_length=128)
    confirmation: str = Field(pattern="^DELETE$")


class AIRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    model: str = Field(default="deepseek-v4-flash", pattern="^deepseek-v4-(flash|pro)$")
    thinking: bool = False


class FlutterChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    thinking: bool = True


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=120)
    status: str = "active"


class ClientOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    company: Optional[str] = None
    status: str
    created_at: str


class WorkflowStep(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: str = "action"
    url: Optional[str] = Field(default=None, max_length=500)
    to: Optional[str] = Field(default=None, max_length=200)
    message: Optional[str] = Field(default=None, max_length=1000)


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    trigger: str = Field(min_length=1, max_length=120)
    steps: List[WorkflowStep] = []


class WorkflowOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    trigger: str
    steps: List[WorkflowStep]
    status: str
    runs_count: int
    created_at: str


class RunOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    duration_ms: int
    started_at: str
    triggered_by: str = "manual"
    steps_results: List[dict] = []


# ---------- Auth helpers ----------

async def get_current_user(request: Request) -> dict:
    # 1) JWT access_token cookie / bearer
    token = request.cookies.get("access_token")
    session_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization", "")
    bearer = auth_header[7:] if auth_header.startswith("Bearer ") else None

    if token or (bearer and bearer.count(".") == 2):
        jwt_token = token or bearer
        try:
            payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
        except jwt.InvalidTokenError:
            pass

    # 2) Emergent session token (cookie or bearer)
    st = session_token or bearer
    if st:
        session_doc = await db.user_sessions.find_one({"session_token": st}, {"_id": 0})
        if session_doc:
            expires_at = session_doc["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")


def owner_filter(user: dict) -> dict:
    return {} if user.get("role") == "admin" else {"user_id": user["user_id"]}


# ---------- Public endpoints ----------

@api_router.get("/")
async def root():
    return {"message": "StreamLine API"}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "disconnected"}


@api_router.post("/contact", response_model=Contact)
async def create_contact(payload: ContactCreate, background_tasks: BackgroundTasks, request: Request):
    identifier = request.client.host if request.client else "unknown"
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    recent = await db.contact_attempts.count_documents({"identifier": identifier, "created_at": {"$gte": cutoff}})
    if recent >= 5:
        raise HTTPException(status_code=429, detail="Too many contact requests. Try again later.")
    await db.contact_attempts.insert_one({"identifier": identifier, "created_at": datetime.now(timezone.utc)})
    contact = Contact(**payload.model_dump())
    await db.contacts.insert_one(contact.model_dump())
    background_tasks.add_task(notify_new_lead, contact)
    background_tasks.add_task(fire_trigger, "New contact form submission", contact.model_dump())
    return contact


async def notify_new_lead(contact: Contact):
    api_key = os.environ.get("RESEND_API_KEY")
    recipient = os.environ.get("NOTIFY_EMAIL") or os.environ.get("ADMIN_EMAIL")
    subject = f"New StreamLine lead: {contact.name}"
    html = f"""
    <table style="width:100%;max-width:560px;margin:0 auto;font-family:Arial,sans-serif;border-collapse:collapse;">
      <tr><td style="background:#0d9488;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;font-size:20px;">New lead from StreamLine</h2>
      </td></tr>
      <tr><td style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 8px;"><strong>Name:</strong> {contact.name}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> {contact.email}</p>
        <p style="margin:0 0 8px;"><strong>Company:</strong> {contact.company or "—"}</p>
        <p style="margin:16px 0 0;padding:16px;background:#f0fdfa;border-radius:8px;">{contact.message}</p>
      </td></tr>
    </table>
    """
    if not api_key:
        logger.info(f"[MOCK EMAIL] RESEND_API_KEY not set. Would notify {recipient}: {subject}")
        return
    try:
        resend.api_key = api_key
        params = {
            "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "to": [recipient],
            "subject": subject,
            "html": html,
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Lead notification sent to {recipient} (id: {email.get('id')})")
    except Exception as e:
        logger.error(f"Failed to send lead notification: {e}")


# ---------- Auth endpoints ----------

@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterInput, response: Response, background_tasks: BackgroundTasks):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "role": "client",
        "picture": None,
        "plan": "starter",
        "subscription_status": "inactive",
        "email_verified": False,
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await issue_account_token(doc, "email_verification", "/verify-email", background_tasks)
    jwt_token = create_access_token(user_id, email)
    set_auth_cookie(response, jwt_token)
    return UserOut(**doc, token=jwt_token)


@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginInput, request: Request, response: Response):
    email = payload.email.lower()
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    identifier = f"{client_ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    jwt_token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, jwt_token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return UserOut(**user, token=jwt_token)


class SessionInput(BaseModel):
    session_id: str


@api_router.post("/auth/session", response_model=UserOut)
async def google_session(payload: SessionInput, response: Response):
    async with httpx.AsyncClient() as hc:
        resp = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data["email"].lower()

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        role = "admin" if email == os.environ.get("ADMIN_EMAIL", "").lower() else "client"
        user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": data.get("name") or email,
            "role": role,
            "picture": data.get("picture"),
            "plan": "starter",
            "subscription_status": "inactive",
            "email_verified": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one({**user})
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture")}})

    session_token = data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    set_auth_cookie(response, session_token, key="session_token")
    user.pop("password_hash", None)
    return UserOut(**user)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"success": True}


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordInput, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if user:
        await issue_account_token(user, "password_reset", "/reset-password", background_tasks)
    return {"message": "If an account exists, a password reset link has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordInput):
    token = await db.account_tokens.find_one_and_delete({
        "token_hash": token_digest(payload.token),
        "purpose": "password_reset",
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not token:
        raise HTTPException(status_code=400, detail="This reset link is invalid or expired")
    await db.users.update_one({"user_id": token["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.user_sessions.delete_many({"user_id": token["user_id"]})
    return {"message": "Password updated. You can now sign in."}


@api_router.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailInput):
    token = await db.account_tokens.find_one_and_delete({
        "token_hash": token_digest(payload.token),
        "purpose": "email_verification",
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not token:
        raise HTTPException(status_code=400, detail="This verification link is invalid or expired")
    await db.users.update_one({"user_id": token["user_id"]}, {"$set": {"email_verified": True}})
    return {"message": "Email verified successfully."}


@api_router.post("/auth/resend-verification")
async def resend_verification(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        return {"message": "Email is already verified."}
    await issue_account_token(user, "email_verification", "/verify-email", background_tasks)
    return {"message": "Verification email sent."}


@api_router.delete("/account")
async def delete_account(payload: DeleteAccountInput, response: Response, user: dict = Depends(get_current_user)):
    stored = await db.users.find_one({"user_id": user["user_id"]})
    if not stored:
        raise HTTPException(status_code=404, detail="Account not found")
    if stored.get("role") == "admin":
        raise HTTPException(status_code=403, detail="The primary admin account cannot be deleted here")
    if stored.get("password_hash") and (not payload.password or not verify_password(payload.password, stored["password_hash"])):
        raise HTTPException(status_code=401, detail="Password is incorrect")
    customer_id = stored.get("stripe_customer_id")
    if customer_id and os.environ.get("STRIPE_SECRET_KEY"):
        stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
        await asyncio.to_thread(stripe.Customer.delete, customer_id)
    user_id = user["user_id"]
    workflow_ids = [item["id"] async for item in db.workflows.find({"user_id": user_id}, {"id": 1, "_id": 0})]
    await asyncio.gather(
        db.clients.delete_many({"user_id": user_id}),
        db.workflows.delete_many({"user_id": user_id}),
        db.runs.delete_many({"$or": [{"user_id": user_id}, {"workflow_id": {"$in": workflow_ids}}]}),
        db.user_sessions.delete_many({"user_id": user_id}),
        db.account_tokens.delete_many({"user_id": user_id}),
        db.users.delete_one({"user_id": user_id}),
    )
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"success": True}


# ---------- AI assistant ----------

@api_router.post("/ai/ask")
async def ask_ai(payload: AIRequest, user: dict = Depends(get_current_user)):
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI assistant is not configured")
    client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    try:
        response = await client.chat.completions.create(
            model=payload.model,
            messages=[
                {"role": "system", "content": "You are StreamLine's concise workflow automation assistant. Never reveal secrets or claim an action was executed unless the application confirms it."},
                {"role": "user", "content": payload.prompt},
            ],
            extra_body={"thinking": {"type": "enabled" if payload.thinking else "disabled"}},
        )
    except Exception:
        logger.exception("DeepSeek request failed")
        raise HTTPException(status_code=502, detail="AI provider request failed")
    message = response.choices[0].message
    return {
        "content": message.content or "",
        "model": payload.model,
        "usage": response.usage.model_dump() if response.usage else None,
    }


@api_router.post("/chat")
async def flutter_chat(payload: FlutterChatRequest, user: dict = Depends(get_current_user)):
    result = await ask_ai(
        AIRequest(prompt=payload.message, model="deepseek-v4-flash", thinking=payload.thinking),
        user,
    )
    return {"reply": result["content"]}


# ---------- Billing ----------

def stripe_configured() -> bool:
    return all(os.environ.get(key) for key in ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRO_PRICE_ID"))


@api_router.get("/billing/status")
async def billing_status(user: dict = Depends(get_current_user)):
    return {
        "configured": stripe_configured(),
        "plan": user.get("plan", "starter"),
        "subscription_status": user.get("subscription_status", "inactive"),
        "current_period_end": user.get("subscription_current_period_end"),
        "cancel_at_period_end": user.get("subscription_cancel_at_period_end", False),
    }


@api_router.post("/billing/checkout")
async def create_checkout(payload: CheckoutInput, user: dict = Depends(get_current_user)):
    secret = os.environ.get("STRIPE_SECRET_KEY")
    price_id = os.environ.get("STRIPE_PRO_PRICE_ID")
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    if not secret or not price_id or not frontend_url:
        raise HTTPException(status_code=503, detail="Billing is not configured")

    stripe.api_key = secret
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = await asyncio.to_thread(
            stripe.Customer.create,
            email=user["email"],
            name=user.get("name"),
            metadata={"user_id": user["user_id"]},
        )
        customer_id = customer.id
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"stripe_customer_id": customer_id}})

    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{frontend_url}/dashboard/billing?checkout=success",
        cancel_url=f"{frontend_url}/dashboard/billing?checkout=cancelled",
        client_reference_id=user["user_id"],
        metadata={"user_id": user["user_id"], "plan": payload.plan},
        allow_promotion_codes=True,
    )
    return {"url": session.url}


@api_router.post("/billing/portal")
async def create_billing_portal(user: dict = Depends(get_current_user)):
    secret = os.environ.get("STRIPE_SECRET_KEY")
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    customer_id = user.get("stripe_customer_id")
    if not secret or not frontend_url or not customer_id:
        raise HTTPException(status_code=400, detail="No billing account is available")
    stripe.api_key = secret
    session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=customer_id,
        return_url=f"{frontend_url}/dashboard/billing",
    )
    return {"url": session.url}


@api_router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    secret = os.environ.get("STRIPE_SECRET_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not secret or not webhook_secret:
        raise HTTPException(status_code=503, detail="Billing is not configured")
    stripe.api_key = secret
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook")

    obj = event["data"]["object"]
    event_type = event["type"]
    if event_type == "checkout.session.completed":
        user_id = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
        if user_id:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "stripe_customer_id": obj.get("customer"),
                    "stripe_subscription_id": obj.get("subscription"),
                    "plan": "pro",
                    "subscription_status": "active",
                }},
            )
    elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        status = obj.get("status", "inactive")
        active = status in {"active", "trialing"}
        await db.users.update_one(
            {"stripe_customer_id": obj.get("customer")},
            {"$set": {
                "stripe_subscription_id": obj.get("id"),
                "plan": "pro" if active else "starter",
                "subscription_status": status,
                "subscription_current_period_end": datetime.fromtimestamp(obj["current_period_end"], timezone.utc).isoformat() if obj.get("current_period_end") else None,
                "subscription_cancel_at_period_end": obj.get("cancel_at_period_end", False),
            }},
        )
    return {"received": True}


# ---------- Leads (admin only) ----------

@api_router.get("/leads", response_model=List[Contact])
async def list_leads(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


# ---------- Clients CRM ----------

@api_router.get("/clients", response_model=List[ClientOut])
async def list_clients(user: dict = Depends(get_current_user)):
    return await db.clients.find(owner_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/clients", response_model=ClientOut)
async def create_client(payload: ClientCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        **payload.model_dump(),
        "created_at": now_iso(),
    }
    await db.clients.insert_one({**doc})
    background_tasks.add_task(fire_trigger, "New client added", {k: v for k, v in doc.items() if k != "user_id"}, user["user_id"])
    return ClientOut(**doc)


@api_router.put("/clients/{client_id}", response_model=ClientOut)
async def update_client(client_id: str, payload: ClientCreate, user: dict = Depends(get_current_user)):
    q = {"id": client_id, **owner_filter(user)}
    result = await db.clients.find_one_and_update(q, {"$set": payload.model_dump()}, projection={"_id": 0}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientOut(**result)


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id, **owner_filter(user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True}


# ---------- Workflows ----------

@api_router.get("/workflows", response_model=List[WorkflowOut])
async def list_workflows(user: dict = Depends(get_current_user)):
    return await db.workflows.find(owner_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/workflows", response_model=WorkflowOut)
async def create_workflow(payload: WorkflowCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and user.get("plan", "starter") != "pro":
        active_count = await db.workflows.count_documents({"user_id": user["user_id"], "status": "active"})
        if active_count >= 3:
            raise HTTPException(status_code=403, detail="Starter plans support up to 3 active workflows. Upgrade to Pro to add more.")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "name": payload.name,
        "description": payload.description,
        "trigger": payload.trigger,
        "steps": [s.model_dump() for s in payload.steps],
        "status": "active",
        "runs_count": 0,
        "created_at": now_iso(),
    }
    await db.workflows.insert_one({**doc})
    return WorkflowOut(**doc)


@api_router.patch("/workflows/{workflow_id}/status", response_model=WorkflowOut)
async def toggle_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    q = {"id": workflow_id, **owner_filter(user)}
    wf = await db.workflows.find_one(q, {"_id": 0})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    new_status = "paused" if wf["status"] == "active" else "active"
    await db.workflows.update_one(q, {"$set": {"status": new_status}})
    wf["status"] = new_status
    return WorkflowOut(**wf)


@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    result = await db.workflows.delete_one({"id": workflow_id, **owner_filter(user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.runs.delete_many({"workflow_id": workflow_id})
    return {"success": True}


# ---------- Workflow execution engine ----------

async def validate_outbound_url(value: str):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Workflow URLs must use HTTPS and cannot contain credentials")
    try:
        addresses = await asyncio.to_thread(socket.getaddrinfo, parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("Workflow URL hostname could not be resolved") from exc
    for entry in addresses:
        address = ipaddress.ip_address(entry[4][0])
        if not address.is_global:
            raise ValueError("Workflow URLs cannot target private or local networks")

async def _run_step(step: dict, wf: dict, triggered_by: str, event: Optional[dict]) -> dict:
    stype = step.get("type", "action")
    name = step["name"]
    text = step.get("message") or f"StreamLine: workflow '{wf['name']}' step '{name}' executed ({triggered_by})"
    if stype == "webhook" and step.get("url"):
        await validate_outbound_url(step["url"])
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.post(step["url"], json={
                "workflow": wf["name"], "trigger": wf["trigger"], "step": name,
                "triggered_by": triggered_by, "event": event or {},
            })
        return {"name": name, "type": stype, "status": "success" if r.status_code < 400 else "failed", "detail": f"HTTP {r.status_code}"}
    if stype == "slack" and step.get("url"):
        await validate_outbound_url(step["url"])
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.post(step["url"], json={"text": text})
        return {"name": name, "type": stype, "status": "success" if r.status_code < 400 else "failed", "detail": f"Slack HTTP {r.status_code}"}
    if stype == "email" and step.get("to"):
        api_key = os.environ.get("RESEND_API_KEY")
        if not api_key:
            logger.info(f"[MOCK EMAIL STEP] Would email {step['to']}: {text}")
            return {"name": name, "type": stype, "status": "success", "detail": "email mocked — set RESEND_API_KEY to send"}
        resend.api_key = api_key
        params = {
            "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
            "to": [step["to"]],
            "subject": f"StreamLine: {wf['name']} — {name}",
            "html": f"<p>{text}</p><p style='color:#5c7a78;font-size:12px'>Trigger: {wf['trigger']} · {triggered_by}</p>",
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"name": name, "type": stype, "status": "success", "detail": f"email sent ({email.get('id')})"}
    return {"name": name, "type": "action", "status": "success", "detail": "action logged"}


async def execute_workflow(wf: dict, triggered_by: str = "manual", event: Optional[dict] = None) -> dict:
    results = []
    overall = "success"
    total_ms = 0
    for step in wf.get("steps", []):
        t0 = time.monotonic()
        try:
            result = await _run_step(step, wf, triggered_by, event)
        except Exception as e:
            result = {"name": step["name"], "type": step.get("type", "action"), "status": "failed", "detail": str(e)[:200]}
        if result["status"] == "failed":
            overall = "failed"
        results.append(result)
        total_ms += int((time.monotonic() - t0) * 1000)
    run = {
        "id": str(uuid.uuid4()),
        "workflow_id": wf["id"],
        "workflow_name": wf["name"],
        "user_id": wf["user_id"],
        "status": overall,
        "duration_ms": max(total_ms, 1),
        "started_at": now_iso(),
        "triggered_by": triggered_by,
        "steps_results": results,
    }
    await db.runs.insert_one({**run})
    await db.workflows.update_one({"id": wf["id"]}, {"$inc": {"runs_count": 1}})
    return run


async def fire_trigger(trigger: str, event: dict, user_id: Optional[str] = None):
    q = {"trigger": trigger, "status": "active"}
    if user_id:
        q["user_id"] = user_id
    workflows = await db.workflows.find(q, {"_id": 0}).to_list(100)
    for wf in workflows:
        try:
            await execute_workflow(wf, triggered_by="auto", event=event)
        except Exception as e:
            logger.error(f"Auto-run failed for workflow {wf['id']}: {e}")


@api_router.post("/workflows/{workflow_id}/run", response_model=RunOut)
async def run_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    q = {"id": workflow_id, **owner_filter(user)}
    wf = await db.workflows.find_one(q, {"_id": 0})
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf["status"] != "active":
        raise HTTPException(status_code=400, detail="Workflow is paused. Activate it to run.")
    if user.get("role") != "admin" and user.get("plan", "starter") != "pro":
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        monthly_runs = await db.runs.count_documents({"user_id": user["user_id"], "started_at": {"$gte": month_start}})
        if monthly_runs >= 100:
            raise HTTPException(status_code=403, detail="Starter plans include 100 runs per month. Upgrade to Pro to continue.")
    run = await execute_workflow(wf, triggered_by="manual")
    return RunOut(**run)


@api_router.get("/runs", response_model=List[RunOut])
async def list_runs(user: dict = Depends(get_current_user), limit: int = 20, workflow_id: Optional[str] = None):
    q = owner_filter(user)
    if workflow_id:
        q = {**q, "workflow_id": workflow_id}
    return await db.runs.find(q, {"_id": 0}).sort("started_at", -1).to_list(min(limit, 100))


# ---------- Dashboard stats ----------

@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    f = owner_filter(user)
    clients_count = await db.clients.count_documents(f)
    workflows_count = await db.workflows.count_documents(f)
    active_workflows = await db.workflows.count_documents({**f, "status": "active"})
    runs_count = await db.runs.count_documents(f)
    recent_runs = await db.runs.find(f, {"_id": 0}).sort("started_at", -1).to_list(8)
    stats = {
        "clients": clients_count,
        "workflows": workflows_count,
        "active_workflows": active_workflows,
        "runs": runs_count,
        "recent_runs": recent_runs,
    }
    if user.get("role") == "admin":
        stats["leads"] = await db.contacts.count_documents({})
    return stats


app.include_router(api_router)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed = {item.strip() for item in os.environ.get("CORS_ORIGINS", "").split(",") if item.strip()}
    unsafe = request.method in {"POST", "PUT", "PATCH", "DELETE"}
    stripe_hook = request.url.path == "/api/billing/webhook"
    if unsafe and origin and not stripe_hook and origin not in allowed:
        return Response(content='{"detail":"Origin not allowed"}', status_code=403, media_type="application/json")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[item.strip() for item in os.environ.get('CORS_ORIGINS', '').split(',') if item.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token")
    await db.login_attempts.create_index("identifier")
    await db.contact_attempts.create_index("created_at", expireAfterSeconds=900)
    await db.account_tokens.create_index("token_hash", unique=True)
    await db.account_tokens.create_index("expires_at", expireAfterSeconds=0)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "picture": None,
            "password_hash": hash_password(admin_password),
            "created_at": now_iso(),
        })
    elif not existing.get("password_hash") or not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
