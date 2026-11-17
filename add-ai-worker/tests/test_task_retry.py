"""Transient connection errors must be retried, not recorded as a failed file."""
import httpx
import pytest
from add_ai_core.exceptions import IngestionError

from app import tasks


@pytest.fixture(autouse=True)
def _fast(monkeypatch, tmp_path):
    from celery.app.task import Task

    monkeypatch.setattr(Task, "update_state", lambda *a, **k: None)  # no Redis in unit tests
    f = tmp_path / "f.pdf"
    f.write_bytes(b"%PDF-1.4")
    monkeypatch.setattr(tasks, "TRANSIENT_RETRY_DELAY_SECONDS", 0)
    monkeypatch.setattr(tasks._data_service, "update_file_status", lambda *a, **k: statuses.append(a))
    statuses.clear()
    yield str(f)


statuses = []


def run(path):
    return tasks.process_document_task.apply(args=(path, "f.pdf", "1", "s", "7"))


def test_connection_refused_then_success_is_retried_and_indexed(monkeypatch, _fast):
    calls = {"n": 0}

    def ingest(**kw):
        calls["n"] += 1
        if calls["n"] < 3:
            raise httpx.ConnectError("[Errno 111] Connection refused")
        return 5

    monkeypatch.setattr(tasks._orchestrator, "ingest", ingest)
    res = run(_fast)
    assert res.result["status"] == "success" and res.result["total_chunks_indexed"] == 5
    assert calls["n"] == 3
    assert [s[1] for s in statuses] == ["indexed"]  # never marked failed in between


def test_wrapped_connect_error_is_also_transient(monkeypatch, _fast):
    calls = {"n": 0}

    def ingest(**kw):
        calls["n"] += 1
        if calls["n"] == 1:
            try:
                raise httpx.ConnectError("refused")
            except httpx.ConnectError as e:
                raise IngestionError("Parsing service unreachable") from e
        return 2

    monkeypatch.setattr(tasks._orchestrator, "ingest", ingest)
    assert run(_fast).result["status"] == "success"


def test_permanent_error_is_not_retried(monkeypatch, _fast):
    calls = {"n": 0}

    def ingest(**kw):
        calls["n"] += 1
        raise IngestionError("Unsupported file type")

    monkeypatch.setattr(tasks._orchestrator, "ingest", ingest)
    res = run(_fast)
    assert res.result["status"] == "failed" and calls["n"] == 1
    assert [s[1] for s in statuses] == ["failed"]


def test_gives_up_after_max_retries_and_marks_failed(monkeypatch, _fast):
    monkeypatch.setattr(tasks, "TRANSIENT_MAX_RETRIES", 2)
    calls = {"n": 0}

    def ingest(**kw):
        calls["n"] += 1
        raise httpx.ConnectError("refused")

    monkeypatch.setattr(tasks._orchestrator, "ingest", ingest)
    res = run(_fast)
    assert calls["n"] == 3  # first try + 2 retries
    assert [s[1] for s in statuses] == ["failed"]
