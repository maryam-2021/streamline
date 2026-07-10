"""Iteration 4 tests: slack + email step types, message field, run history filter."""
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
def admin_session():
    s = _s()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200
    return s


# ---------- 4-step workflow with all step types ----------
def test_four_step_workflow_all_types_manual_run(admin_session):
    s = admin_session
    payload = {
        "name": f"TEST_ALL4_{uuid.uuid4().hex[:6]}",
        "trigger": "Manual",
        "steps": [
            {"name": "log it", "type": "action"},
            {"name": "ping wh", "type": "webhook", "url": "https://httpbin.org/post"},
            {"name": "slack msg", "type": "slack", "url": "https://httpbin.org/post", "message": "hello slack"},
            {"name": "send email", "type": "email", "to": "test@example.com", "message": "hi via email"},
        ],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    wid = r.json()["id"]
    try:
        rr = s.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=45)
        assert rr.status_code == 200, rr.text
        run = rr.json()
        assert run["status"] == "success", run
        results = {r["type"]: r for r in run["steps_results"]}
        assert len(run["steps_results"]) == 4
        assert results["action"]["status"] == "success"
        assert "action logged" in results["action"]["detail"].lower()
        assert results["webhook"]["status"] == "success"
        assert "HTTP 200" in results["webhook"]["detail"]
        assert results["slack"]["status"] == "success"
        assert "Slack HTTP 200" in results["slack"]["detail"]
        assert results["email"]["status"] == "success"
        assert "email mocked" in results["email"]["detail"].lower()
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


def test_slack_failure_returns_failed_status(admin_session):
    s = admin_session
    payload = {
        "name": f"TEST_SLACK_FAIL_{uuid.uuid4().hex[:6]}",
        "trigger": "Manual",
        "steps": [{"name": "bad slack", "type": "slack", "url": "https://httpbin.org/status/500", "message": "x"}],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    wid = r.json()["id"]
    try:
        rr = s.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=30)
        assert rr.status_code == 200
        run = rr.json()
        assert run["status"] == "failed"
        assert "Slack HTTP 500" in run["steps_results"][0]["detail"]
        assert run["steps_results"][0]["status"] == "failed"
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)


# ---------- workflow_id filter on /api/runs ----------
def test_runs_filter_by_workflow_id(admin_session):
    s = admin_session
    # Create two workflows
    a = s.post(f"{BASE_URL}/api/workflows", json={
        "name": f"TEST_FLT_A_{uuid.uuid4().hex[:6]}", "trigger": "Manual",
        "steps": [{"name": "act", "type": "action"}],
    }, timeout=15).json()
    b = s.post(f"{BASE_URL}/api/workflows", json={
        "name": f"TEST_FLT_B_{uuid.uuid4().hex[:6]}", "trigger": "Manual",
        "steps": [{"name": "act", "type": "action"}],
    }, timeout=15).json()
    try:
        s.post(f"{BASE_URL}/api/workflows/{a['id']}/run", timeout=15)
        s.post(f"{BASE_URL}/api/workflows/{a['id']}/run", timeout=15)
        s.post(f"{BASE_URL}/api/workflows/{b['id']}/run", timeout=15)

        runs_a = s.get(f"{BASE_URL}/api/runs?workflow_id={a['id']}&limit=50", timeout=15).json()
        runs_b = s.get(f"{BASE_URL}/api/runs?workflow_id={b['id']}&limit=50", timeout=15).json()
        assert len(runs_a) >= 2
        assert all(r["workflow_id"] == a["id"] for r in runs_a)
        assert len(runs_b) >= 1
        assert all(r["workflow_id"] == b["id"] for r in runs_b)
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{a['id']}", timeout=15)
        s.delete(f"{BASE_URL}/api/workflows/{b['id']}", timeout=15)


def test_runs_workflow_id_scoped_to_owner():
    """User B cannot see runs of user A even when passing A's workflow_id."""
    sA = _s(); sB = _s()
    eA = f"ownA_{uuid.uuid4().hex[:6]}@ex.com"
    eB = f"ownB_{uuid.uuid4().hex[:6]}@ex.com"
    sA.post(f"{BASE_URL}/api/auth/register", json={"name": "A", "email": eA, "password": "Pass#1234"}, timeout=15)
    sB.post(f"{BASE_URL}/api/auth/register", json={"name": "B", "email": eB, "password": "Pass#1234"}, timeout=15)
    wA = sA.post(f"{BASE_URL}/api/workflows", json={
        "name": f"TEST_SCOPE_{uuid.uuid4().hex[:6]}", "trigger": "Manual",
        "steps": [{"name": "act", "type": "action"}],
    }, timeout=15).json()
    try:
        sA.post(f"{BASE_URL}/api/workflows/{wA['id']}/run", timeout=15)
        # B queries with A's workflow_id -> should get empty list (owner filter applied)
        r = sB.get(f"{BASE_URL}/api/runs?workflow_id={wA['id']}", timeout=15)
        assert r.status_code == 200
        assert r.json() == []
    finally:
        sA.delete(f"{BASE_URL}/api/workflows/{wA['id']}", timeout=15)


# ---------- Message field default fallback ----------
def test_slack_step_without_message_still_works(admin_session):
    s = admin_session
    payload = {
        "name": f"TEST_SLACK_NOMSG_{uuid.uuid4().hex[:6]}",
        "trigger": "Manual",
        "steps": [{"name": "slack no msg", "type": "slack", "url": "https://httpbin.org/post"}],
    }
    r = s.post(f"{BASE_URL}/api/workflows", json=payload, timeout=15)
    wid = r.json()["id"]
    try:
        rr = s.post(f"{BASE_URL}/api/workflows/{wid}/run", timeout=30)
        assert rr.status_code == 200
        assert rr.json()["status"] == "success"
    finally:
        s.delete(f"{BASE_URL}/api/workflows/{wid}", timeout=15)
