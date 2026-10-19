import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.corpus.store import store

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_store():
    store.clear()
    yield
    store.clear()

@pytest.fixture
def mock_llm():
    with patch("app.llm.client.chat.completions.create") as mock:
        yield mock

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "documents": 0, "chunks": 0}

def test_seed():
    res = client.post("/api/seed")
    assert res.status_code == 200
    data = res.json()
    assert 10 <= data["documents"] <= 12
    assert data["chunks"] >= 10

def test_list_documents():
    client.post("/api/seed")
    res = client.get("/api/documents")
    assert res.status_code == 200
    assert len(res.json()) >= 10

def test_upload_invalid_frontmatter():
    file_data = ("test.md", b"This file has no YAML front matter.", "text/markdown")
    res = client.post("/api/documents", files=[("files", file_data)])
    assert res.status_code == 422
    assert "error" in res.json()
    assert "Missing or invalid YAML" in res.json()["error"]

def test_ask_empty_corpus():
    res = client.post("/api/ask", json={"question": "What is the policy?"})
    assert res.status_code == 409
    assert "error" in res.json()
    assert "Corpus is empty" in res.json()["error"]

def test_ask_with_mocked_llm(mock_llm):
    client.post("/api/seed")

    synth_json = '{"draft_answer": "Office hours are 9:00 AM to 5:00 PM.", "claims": [{"text": "Office hours are 9:00 AM to 5:00 PM.", "supported": true, "citations": ["office-hours-policy-v1#0"]}]}'
    contra_json = '{"contradictions": []}'
    unsupported_json = '{"unsupported_claims": []}'

    def make_choice(content: str):
        resp = MagicMock()
        resp.choices = [MagicMock(message=MagicMock(content=content))]
        return resp

    mock_llm.side_effect = [
        make_choice(synth_json),
        make_choice(contra_json),
        make_choice(unsupported_json)
    ]

    res = client.post("/api/ask", json={"question": "What are the standard company office hours?"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "consistent"
    assert "9:00 AM to 5:00 PM" in body["final_answer"]