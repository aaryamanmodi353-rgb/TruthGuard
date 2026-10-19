from unittest.mock import patch
from app.agents.resolution import resolve_conflicts, FinalAnswerOutput
from app.schemas import Claim, StalenessFinding

def get_base_chunks():
    return [
        {
            "chunk_id": "d1#0",
            "doc_id": "d1",
            "text": "Employees receive 12 days leave.",
            "metadata": {
                "doc_id": "d1",
                "title": "Leave Policy",
                "doc_type": "policy",
                "version": "v1",
                "effective_date": "2023-01-01",
                "family": "leave-policy",
                "supersedes": ""
            }
        },
        {
            "chunk_id": "d2#0",
            "doc_id": "d2",
            "text": "Employees receive 18 days leave.",
            "metadata": {
                "doc_id": "d2",
                "title": "Leave Amendment",
                "doc_type": "amendment",
                "version": "v2",
                "effective_date": "2025-03-01",
                "family": "leave-policy",
                "supersedes": "d1"
            }
        }
    ]

def test_resolve_conflicts_superseded():
    chunks = get_base_chunks()
    claims = [
        Claim(text="12 days leave", supported=True, citations=["d1#0"]),
        Claim(text="18 days leave", supported=True, citations=["d2#0"])
    ]
    contradictions = [{
        "topic": "Annual Leave Days",
        "positions": [
            {"claim": "12 days leave", "chunk_id": "d1#0"},
            {"claim": "18 days leave", "chunk_id": "d2#0"}
        ]
    }]
    staleness = [StalenessFinding(stale_doc_id="d1", superseded_by_doc_id="d2", basis="explicit_supersedes")]

    with patch("app.agents.resolution.generate_structured") as mock_llm:
        mock_llm.return_value = FinalAnswerOutput(
            final_answer="Leave Policy (v1, 2023-01-01) states 12 days, but Leave Amendment (v2, 2025-03-01) supersedes it with 18 days."
        )
        status, final_ans, conflicts, _ = resolve_conflicts(
            "How many leave days?", "draft", claims, contradictions, staleness, [], chunks
        )

    assert status == "conflict_resolved"
    assert len(conflicts) == 1
    assert conflicts[0].resolution.type == "superseded"
    assert conflicts[0].resolution.winning_doc_id == "d2"
    assert "supersedes" in final_ans.lower()

def test_resolve_conflicts_unresolvable():
    chunks = get_base_chunks()
    claims = [
        Claim(text="Limit is $50", supported=True, citations=["d1#0"]),
        Claim(text="Limit is $75", supported=True, citations=["d2#0"])
    ]
    contradictions = [{
        "topic": "Expense Limit",
        "positions": [
            {"claim": "Limit is $50", "chunk_id": "d1#0"},
            {"claim": "Limit is $75", "chunk_id": "d2#0"}
        ]
    }]

    with patch("app.agents.resolution.generate_structured") as mock_llm:
        mock_llm.return_value = FinalAnswerOutput(
            final_answer="Leave Policy (v1, 2023-01-01) says $50 while Leave Amendment (v2, 2025-03-01) says $75. I cannot resolve this conflict with the available information."
        )
        status, final_ans, conflicts, _ = resolve_conflicts(
            "What is the limit?", "draft", claims, contradictions, [], [], chunks
        )

    assert status == "conflict_unresolved"
    assert len(conflicts) == 1
    assert conflicts[0].resolution.type == "unresolvable"
    assert conflicts[0].resolution.winning_doc_id is None
    assert "I cannot resolve this conflict with the available information." in final_ans

def test_resolve_conflicts_consistent():
    chunks = [get_base_chunks()[0]]
    claims = [Claim(text="Office hours are 9 to 5", supported=True, citations=["d1#0"])]

    status, final_ans, conflicts, _ = resolve_conflicts(
        "What are office hours?", "Office hours are 9 to 5", claims, [], [], [], chunks
    )

    assert status == "consistent"
    assert len(conflicts) == 0
    assert final_ans == "Office hours are 9 to 5"