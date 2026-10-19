from typing import List, Dict, Any
from pydantic import BaseModel
from app.llm import generate_structured
from app.schemas import StalenessFinding, Claim


class PositionModel(BaseModel):
    claim: str
    chunk_id: str


class ContradictionModel(BaseModel):
    topic: str
    positions: List[PositionModel]


class ContradictionsResult(BaseModel):
    contradictions: List[ContradictionModel]


class UnsupportedResult(BaseModel):
    unsupported_claims: List[str]


def check_contradictions(chunks: List[Dict]) -> List[Dict[str, Any]]:
    """
    (a) Contradiction check (LLM): returns pairs of chunks from different documents
    that make directly incompatible statements about the same fact.
    """
    if len(chunks) < 2:
        return []

    system_prompt = (
        "You are an adversarial critic analyzing retrieved document chunks. "
        "Identify pairs of chunks that make DIRECTLY incompatible statements about the exact same fact "
        "(e.g., different numbers of leave days, different remote work days per week, different expense limits). "
        "Do NOT flag differences in scope or unrelated topics. "
        "Each contradiction in 'contradictions' must contain a 'topic' and 'positions' (a list of exactly 2 items, "
        "each with 'claim' and 'chunk_id' from the provided chunks). If there are no contradictions, return an empty list."
    )
    context = "\n\n".join(
        f"CHUNK_ID: {c['chunk_id']}\nDOC_ID: {c['doc_id']}\nTITLE: {c['metadata']['title']} ({c['metadata']['version']}, {c['metadata']['effective_date']})\nTEXT: {c['text']}"
        for c in chunks
    )

    res = generate_structured(system_prompt, f"Chunks:\n{context}", ContradictionsResult)
    valid_chunk_ids = {c["chunk_id"] for c in chunks}
    filtered = []
    for contra in res.contradictions:
        positions = [p for p in contra.positions if p.chunk_id in valid_chunk_ids]
        if len(positions) >= 2:
            filtered.append({
                "topic": contra.topic,
                "positions": [p.model_dump() for p in positions[:2]]
            })
    return filtered


def check_staleness(chunks: List[Dict]) -> List[StalenessFinding]:
    """
    (b) Staleness check (DETERMINISTIC code, no LLM):
    Flags a doc as stale if:
      (i) another retrieved doc lists its doc_id in supersedes (explicit_supersedes), or
      (ii) another retrieved doc in the same family has a later effective_date (newer_version_same_family).
    """
    findings: List[StalenessFinding] = []
    docs = {c["doc_id"]: c["metadata"] for c in chunks}

    # Pass 1: Explicit supersedes takes highest priority
    for doc_id, meta in docs.items():
        supersedes_raw = meta.get("supersedes", "")
        supersedes_list = (
            [s.strip() for s in supersedes_raw.split(",") if s.strip()]
            if isinstance(supersedes_raw, str)
            else list(supersedes_raw)
        )
        for stale_id in supersedes_list:
            if stale_id in docs and stale_id != doc_id:
                findings.append(
                    StalenessFinding(
                        stale_doc_id=stale_id,
                        superseded_by_doc_id=doc_id,
                        basis="explicit_supersedes",
                    )
                )

    # Pass 2: Newer effective_date in the same family
    for doc_id, meta in docs.items():
        for other_id, other_meta in docs.items():
            if (
                other_id != doc_id
                and meta.get("family")
                and meta.get("family") == other_meta.get("family")
            ):
                if meta["effective_date"] > other_meta["effective_date"]:
                    findings.append(
                        StalenessFinding(
                            stale_doc_id=other_id,
                            superseded_by_doc_id=doc_id,
                            basis="newer_version_same_family",
                        )
                    )

    # Deduplicate by document pair so explicit_supersedes is kept first
    unique_findings: List[StalenessFinding] = []
    seen = set()
    for f in findings:
        key = (f.stale_doc_id, f.superseded_by_doc_id)
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)

    return unique_findings


def check_unsupported_claims(claims: List[Claim], chunks: List[Dict]) -> List[str]:
    """
    (c) Unsupported-claim check (LLM): verifies each synthesizer claim is entailed by its cited chunks.
    """
    if not claims:
        return []

    chunk_map = {c["chunk_id"]: c["text"] for c in chunks}

    system_prompt = (
        "You verify whether each claim is strictly entailed by its cited chunk text. "
        "Return 'unsupported_claims' containing the exact 'Claim' text of any claim that is NOT backed by its Cited Text. "
        "If all claims are supported by their cited text, return an empty list."
    )

    prompt_data = []
    for claim in claims:
        cited_text = "\n".join([chunk_map.get(cid, "") for cid in claim.citations if cid in chunk_map])
        prompt_data.append(f"Claim: {claim.text}\nCited Text: {cited_text}\n---")

    res = generate_structured(system_prompt, "\n".join(prompt_data), UnsupportedResult)
    return res.unsupported_claims