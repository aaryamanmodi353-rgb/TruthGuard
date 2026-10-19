from app.agents.critic import check_staleness


def test_staleness_explicit_supersedes():
    chunks = [
        {
            "doc_id": "doc1",
            "metadata": {
                "doc_id": "doc1",
                "family": "leave-policy",
                "effective_date": "2023-01-01",
                "supersedes": "",
            },
        },
        {
            "doc_id": "doc2",
            "metadata": {
                "doc_id": "doc2",
                "family": "leave-amendment",
                "effective_date": "2024-01-01",
                "supersedes": "doc1",
            },
        },
    ]
    findings = check_staleness(chunks)
    assert len(findings) == 1
    assert findings[0].stale_doc_id == "doc1"
    assert findings[0].superseded_by_doc_id == "doc2"
    assert findings[0].basis == "explicit_supersedes"


def test_staleness_newer_version():
    chunks = [
        {
            "doc_id": "doc1",
            "metadata": {
                "doc_id": "doc1",
                "family": "leave-policy",
                "effective_date": "2023-01-01",
                "supersedes": "",
            },
        },
        {
            "doc_id": "doc2",
            "metadata": {
                "doc_id": "doc2",
                "family": "leave-policy",
                "effective_date": "2024-01-01",
                "supersedes": "",
            },
        },
    ]
    findings = check_staleness(chunks)
    assert len(findings) == 1
    assert findings[0].stale_doc_id == "doc1"
    assert findings[0].superseded_by_doc_id == "doc2"
    assert findings[0].basis == "newer_version_same_family"


def test_staleness_negative():
    chunks = [
        {
            "doc_id": "doc1",
            "metadata": {
                "doc_id": "doc1",
                "family": "expenses",
                "effective_date": "2023-01-01",
                "supersedes": "",
            },
        },
        {
            "doc_id": "doc2",
            "metadata": {
                "doc_id": "doc2",
                "family": "operations",
                "effective_date": "2024-01-01",
                "supersedes": "",
            },
        },
    ]
    findings = check_staleness(chunks)
    assert len(findings) == 0