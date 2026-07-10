"""Iteration 3 tests: workflow execution engine, auto-triggers, PWA, JWT token in login response."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@streamline.app"
ADMIN_PASSWORD = "StreamAdmin#2026"


def _s():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_login():
    """Login as admin, return (session, token)."""
    s = _s()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" in body and body["token"], "Login response must include 'token'"
    return s, body["token"]


# ---------- Login response includes token ----------
def test_login_response_includes_jwt_token(admin_login):
    _, token = admin_login
    # JWT has 3 parts
    assert token.count(".") == 2


def test_bearer_token_works_on_me(admin_login):
    _, token = admin_login
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_bearer_token_works_on_workflows(admin_login):
    _, token = admin_login
    r = requests.get(f"{BASE_URL}/api/workflows",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_register_response_includes_token():
    email = f"tok_{uuid.uuid4().hex[:8]}@example.com"
    r = _s().post(f"{BASE_URL}/api/auth/register",
                  json={"name": "TokUser", "email": email, "password": "Pass#1234"}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("token") and body["token"].count(".") == 2


# ---------- Workflow execution engine (real webhook) ----------
def test_webhook_workflow_success(admin_login):
    s, _ = admin_login
    payload = {
        "name": f"TEST_WH_SUCCESS_{uuid.uuid4().hex[:6]}",
        "trigger": "Manual",
        "steps": [
            {"name": "Ping httpbin", "type": "webhook", "url": "https://httpbin.org/post"},
            {"name": "Log action", "type": "action"},
        ],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    assert r.status_code == 200
    wid = r.json()["id"]
    try:
        rr = s.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=30)
        assert rr.status_code == 200, rr.text
        run = rr.json()
        assert run["status"] == "success", run
        results = run["steps_results"]
        assert len(results) == 2
        webhook_r = next(x for x in results if x["type"] == "webhook")
        action_r = next(x for x in results if x["type"] == "action")
        assert webhook_r["status"] == "success"
        assert "HTTP 200" in webhook_r["detail"]
        assert action_r["status"] == "success"
        assert "action logged" in action_r["detail"].lower()
        assert run["duration_ms"] >= 1
        assert run["triggered_by"] == "manual"
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


def test_webhook_workflow_failure(admin_login):
    s, _ = admin_login
    payload = {
        "name": f"TEST_WH_FAIL_{uuid.uuid4().hex[:6]}",
        "trigger": "Manual",
        "steps": [{"name": "Bad endpoint", "type": "webhook", "url": "https://httpbin.org/status/500"}],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    assert r.status_code == 200
    wid = r.json()["id"]
    try:
        rr = s.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=30)
        assert rr.status_code == 200
        run = rr.json()
        assert run["status"] == "failed", run
        step = run["steps_results"][0]
        assert step["status"] == "failed"
        assert "HTTP 500" in step["detail"]
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


# ---------- Auto-triggers ----------
def test_auto_trigger_on_contact_submission(admin_login):
    s, _ = admin_login
    # Create active workflow for contact trigger
    payload = {
        "name": f"TEST_AUTO_CONTACT_{uuid.uuid4().hex[:6]}",
        "trigger": "New contact form submission",
        "steps": [{"name": "webhook step", "type": "webhook", "url": "https://httpbin.org/post"}],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    wid = r.json()["id"]
    try:
        # Fire trigger via public contact endpoint (no auth)
        marker_email = f"auto_{uuid.uuid4().hex[:8]}@example.com"
        cr = _s().post(f"{BASE_URL}/api/contact", json={
            "name": "TEST Auto Contact", "email": marker_email,
            "company": "AutoCo", "message": "Fire the trigger",
        }, timeout=15)
        assert cr.status_code == 200
        # BackgroundTasks: wait for auto-run to be recorded
        deadline = time.time() + 25
        matched = None
        while time.time() < deadline:
            runs = s.get(f"{BASE_URL}/api/runs?limit=50", timeout=15).json()
            matched = next((r for r in runs if r.get("workflow_id") == wid and r.get("triggered_by") == "auto"), None)
            if matched:
                break
            time.sleep(1.5)
        assert matched is not None, "Auto-triggered run not found for contact submission"
        assert matched["status"] in ("success", "failed")
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


def test_paused_workflow_does_not_auto_run(admin_login):
    s, _ = admin_login
    payload = {
        "name": f"TEST_PAUSED_{uuid.uuid4().hex[:6]}",
        "trigger": "New contact form submission",
        "steps": [{"name": "should not run", "type": "action"}],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    wid = r.json()["id"]
    # Pause it
    s.patch(f"{BASE_URL}/api/workflows/{wid}/status", timeout=15)
    try:
        cr = _s().post(f"{BASE_URL}/api/contact", json={
            "name": "TEST Paused", "email": f"paused_{uuid.uuid4().hex[:6]}@example.com",
            "message": "Should not fire paused wf",
        }, timeout=15)
        assert cr.status_code == 200
        time.sleep(5)
        runs = s.get(f"{BASE_URL}/api/runs?limit=100", timeout=15).json()
        auto = [r for r in runs if r.get("workflow_id") == wid and r.get("triggered_by") == "auto"]
        assert not auto, f"Paused workflow should not auto-run, got {auto}"
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


def test_auto_trigger_on_client_creation_scoped_to_user():
    """Verify New-client trigger is scoped to the creating user."""
    # Two users A and B; A has a workflow, B creates a client. A must NOT receive an auto run.
    sA = _s(); sB = _s()
    eA = f"ownerA_{uuid.uuid4().hex[:6]}@ex.com"
    eB = f"ownerB_{uuid.uuid4().hex[:6]}@ex.com"
    sA.post(f"{BASE_URL}/api/auth/register", json={"name": "A", "email": eA, "password": "Pass#1234"}, timeout=15)
    sB.post(f"{BASE_URL}/api/auth/register", json={"name": "B", "email": eB, "password": "Pass#1234"}, timeout=15)

    wf_payload = {
        "name": f"TEST_CLIENT_TRIG_{uuid.uuid4().hex[:6]}",
        "trigger": "New client added",
        "steps": [{"name": "log", "type": "action"}],
    }
    wA = sA.post(f"{BASE_URL}/api/workflows", json=wf_payload, timeout=15).json()
    try:
        # B creates a client -> should NOT trigger A's workflow
        sB.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_BClient", "email": f"bc_{uuid.uuid4().hex[:6]}@ex.com", "status": "active"
        }, timeout=15)
        time.sleep(4)
        runsA = sA.get(f"{BASE_URL}/api/runs?limit=50", timeout=15).json()
        assert not any(r["workflow_id"] == wA["id"] for r in runsA), "B's client should not trigger A's workflow"

        # A creates a client -> should auto-trigger A's workflow
        sA.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_AClient", "email": f"ac_{uuid.uuid4().hex[:6]}@ex.com", "status": "active"
        }, timeout=15)
        deadline = time.time() + 20
        matched = None
        while time.time() < deadline:
            runsA = sA.get(f"{BASE_URL}/api/runs?limit=50", timeout=15).json()
            matched = next((r for r in runsA if r["workflow_id"] == wA["id"] and r["triggered_by"] == "auto"), None)
            if matched:
                break
            time.sleep(1.5)
        assert matched is not None, "A's own client creation should auto-run A's workflow"
    finally:
        sA.delete(f"{BASE_URL}/api/workflows/{wA['id']}", timeout=15)


# ---------- PWA assets ----------
def test_pwa_manifest():
    r = requests.get(f"{BASE_URL}/manifest.json", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "StreamLine" in j.get("name", "") or "StreamLine" in j.get("short_name", "")
    assert j.get("theme_color", "").lower() == "#0d9488"


def test_pwa_service_worker():
    r = requests.get(f"{BASE_URL}/sw.js", timeout=15)
    assert r.status_code == 200
    assert len(r.text) > 0


def test_pwa_icons():
    r1 = requests.get(f"{BASE_URL}/icon-192.png", timeout=15)
    assert r1.status_code == 200
    assert r1.headers.get("content-type", "").startswith("image/")
    r2 = requests.get(f"{BASE_URL}/icon-512.png", timeout=15)
    assert r2.status_code == 200
