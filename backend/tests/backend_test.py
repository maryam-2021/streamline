"""StreamLine backend regression + auth/dashboard tests (iteration 2)."""
import os
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

ADMIN_EMAIL = "admin@streamline.app"
ADMIN_PASSWORD = "StreamAdmin#2026"


def _s():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health / public ----------
def test_health():
    r = _s().get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert j["database"] == "connected"


def test_contact_create():
    payload = {"name": "TEST_User", "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
               "company": "TestCo", "message": "Hello from pytest"}
    r = _s().post(f"{BASE_URL}/api/contact", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["name"] == payload["name"] and b["email"] == payload["email"]
    assert "id" in b and "_id" not in b


def test_contact_invalid_email():
    r = _s().post(f"{BASE_URL}/api/contact", json={"name": "x", "email": "bad", "message": "hi"}, timeout=15)
    assert r.status_code == 422


# ---------- Auth ----------
@pytest.fixture(scope="module")
def admin_session():
    s = _s()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    assert "access_token" in s.cookies
    return s


def test_admin_login_and_me(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 200
    u = r.json()
    assert u["email"] == ADMIN_EMAIL
    assert u["role"] == "admin"


def test_login_wrong_password():
    s = _s()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": "wrong-password-xx"}, timeout=15)
    assert r.status_code == 401


def test_register_new_client_and_duplicate():
    s = _s()
    email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"name": "TEST User", "email": email, "password": "Pass#1234"}, timeout=15)
    assert r.status_code == 200, r.text
    u = r.json()
    assert u["email"] == email and u["role"] == "client"
    assert "access_token" in s.cookies
    # /me works with the cookie set
    me = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert me.status_code == 200 and me.json()["email"] == email
    # duplicate
    r2 = _s().post(f"{BASE_URL}/api/auth/register",
                   json={"name": "TEST User", "email": email, "password": "Pass#1234"}, timeout=15)
    assert r2.status_code == 400


def test_bruteforce_lockout():
    # Register a fresh user, then hit login with wrong pw 6 times
    email = f"test_brute_{uuid.uuid4().hex[:6]}@example.com"
    _s().post(f"{BASE_URL}/api/auth/register",
              json={"name": "Brute", "email": email, "password": "Pass#1234"}, timeout=15)
    codes = []
    for _ in range(6):
        r = _s().post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": "definitely-wrong"}, timeout=15)
        codes.append(r.status_code)
    # first 5 should be 401, then 429
    assert codes[:5] == [401] * 5, codes
    assert codes[5] == 429, codes


def test_unauth_me_returns_401():
    r = _s().get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- Emergent Google session simulation ----------
@pytest.fixture(scope="module")
def google_session_token():
    token = f"test_session_{uuid.uuid4().hex}"
    user_id = f"user_test_{uuid.uuid4().hex[:8]}"
    email = f"test.user.{uuid.uuid4().hex[:6]}@example.com"
    js = f"""
    use('test_database');
    db.users.insertOne({{user_id: '{user_id}', email: '{email}', name: 'Test Google', role: 'client', picture: null, created_at: new Date().toISOString()}});
    db.user_sessions.insertOne({{user_id: '{user_id}', session_token: '{token}', expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(), created_at: new Date().toISOString()}});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", js], check=True, capture_output=True)
    yield token, user_id, email
    subprocess.run(["mongosh", "--quiet", "--eval",
                    f"use('test_database'); db.users.deleteOne({{user_id:'{user_id}'}}); db.user_sessions.deleteOne({{session_token:'{token}'}});"],
                   check=False, capture_output=True)


def test_google_session_bearer_me(google_session_token):
    token, user_id, email = google_session_token
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == email


def test_google_session_can_access_workflows(google_session_token):
    token, _, _ = google_session_token
    r = requests.get(f"{BASE_URL}/api/workflows",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200


# ---------- Clients CRUD ----------
def test_client_crud_admin(admin_session):
    payload = {"name": "TEST_Client", "email": f"c_{uuid.uuid4().hex[:6]}@ex.com",
               "company": "Acme", "status": "active"}
    r = admin_session.post(f"{BASE_URL}/api/clients", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    # list contains
    r2 = admin_session.get(f"{BASE_URL}/api/clients", timeout=15)
    assert r2.status_code == 200
    assert any(c["id"] == cid for c in r2.json())
    # update
    upd = {**payload, "name": "TEST_ClientUpd"}
    r3 = admin_session.put(f"{BASE_URL}/api/clients/{cid}", json=upd, timeout=15)
    assert r3.status_code == 200 and r3.json()["name"] == "TEST_ClientUpd"
    # delete
    r4 = admin_session.delete(f"{BASE_URL}/api/clients/{cid}", timeout=15)
    assert r4.status_code == 200
    # verify gone
    r5 = admin_session.get(f"{BASE_URL}/api/clients", timeout=15)
    assert not any(c["id"] == cid for c in r5.json())


def test_client_scoping_between_users():
    # register two clients, ensure each only sees their own
    s1 = _s(); s2 = _s()
    e1 = f"scope1_{uuid.uuid4().hex[:6]}@ex.com"
    e2 = f"scope2_{uuid.uuid4().hex[:6]}@ex.com"
    s1.post(f"{BASE_URL}/api/auth/register", json={"name": "A", "email": e1, "password": "Pass#1234"}, timeout=15)
    s2.post(f"{BASE_URL}/api/auth/register", json={"name": "B", "email": e2, "password": "Pass#1234"}, timeout=15)
    c1 = s1.post(f"{BASE_URL}/api/clients", json={"name": "TEST_S1", "email": "s1c@ex.com", "status": "active"}).json()
    c2 = s2.post(f"{BASE_URL}/api/clients", json={"name": "TEST_S2", "email": "s2c@ex.com", "status": "active"}).json()
    l1 = s1.get(f"{BASE_URL}/api/clients").json()
    l2 = s2.get(f"{BASE_URL}/api/clients").json()
    ids1 = [c["id"] for c in l1]; ids2 = [c["id"] for c in l2]
    assert c1["id"] in ids1 and c2["id"] not in ids1
    assert c2["id"] in ids2 and c1["id"] not in ids2


# ---------- Workflows ----------
def test_workflow_crud_and_run(admin_session):
    payload = {"name": "TEST_WF", "trigger": "webhook", "steps": [{"name": "Step1"}, {"name": "Step2"}]}
    r = admin_session.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    wf = r.json()
    wid = wf["id"]
    assert wf["status"] == "active" and wf["runs_count"] == 0
    # run
    rr = admin_session.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=15)
    assert rr.status_code == 200
    run = rr.json()
    assert run["workflow_id"] == wid
    assert run["status"] in ("success", "failed")
    # runs_count increments
    lw = admin_session.get(f"{BASE_URL}/api/workflows", timeout=15).json()
    got = next(w for w in lw if w["id"] == wid)
    assert got["runs_count"] == 1
    # pause
    rp = admin_session.patch(f"{BASE_URL}/api/workflows/{wid}/status", timeout=15)
    assert rp.status_code == 200 and rp.json()["status"] == "paused"
    # running paused returns 400
    rr2 = admin_session.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=15)
    assert rr2.status_code == 400
    # resume
    rp2 = admin_session.patch(f"{BASE_URL}/api/workflows/{wid}/status", timeout=15)
    assert rp2.status_code == 200 and rp2.json()["status"] == "active"
    # delete
    rd = admin_session.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)
    assert rd.status_code == 200


# ---------- Dashboard stats + leads scoping ----------
def test_dashboard_stats_admin(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("clients", "workflows", "active_workflows", "runs", "recent_runs", "leads"):
        assert k in j, f"missing {k}"


def test_leads_admin_only(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/leads", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_leads_forbidden_for_client():
    s = _s()
    email = f"leadscope_{uuid.uuid4().hex[:6]}@ex.com"
    s.post(f"{BASE_URL}/api/auth/register", json={"name": "L", "email": email, "password": "Pass#1234"}, timeout=15)
    r = s.get(f"{BASE_URL}/api/leads", timeout=15)
    assert r.status_code == 403


# ---------- Logout ----------
def test_logout_clears_cookie():
    s = _s()
    s.post(f"{BASE_URL}/api/auth/login",
           json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert "access_token" in s.cookies
    r = s.post(f"{BASE_URL}/api/auth/logout", timeout=15)
    assert r.status_code == 200
    # After logout, /me should be 401 with a fresh session (cookie cleared server-side)
    s2 = _s()
    assert s2.get(f"{BASE_URL}/api/auth/me", timeout=15).status_code == 401
