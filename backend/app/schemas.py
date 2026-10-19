import re
from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal, Dict, Any

class DocumentMeta(BaseModel):
    doc_id: str
    title: str
    doc_type: Literal["policy", "amendment", "faq", "memo"]
    version: str
    effective_date: str
    family: str
    supersedes: List[str] = []
    chunk_count: int = 0

    @field_validator("doc_id", "title", "version", "family")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("effective_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        v_str = str(v).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v_str):
            raise ValueError("effective_date must be in YYYY-MM-DD format")
        return v_str

class Source(BaseModel):
    doc_id: str
    title: str
    doc_type: str
    version: str
    effective_date: str
    chunk_id: str
    quote: str

class Claim(BaseModel):
    text: str
    supported: bool
    citations: List[str]

class Resolution(BaseModel):
    type: Literal["superseded", "unresolvable"]
    winning_doc_id: Optional[str] = None
    rationale: str

class Position(BaseModel):
    claim: str
    source: Source

class Conflict(BaseModel):
    conflict_id: str
    topic: str
    positions: List[Position]
    resolution: Resolution

class StalenessFinding(BaseModel):
    stale_doc_id: str
    superseded_by_doc_id: str
    basis: Literal["explicit_supersedes", "newer_version_same_family"]

class TraceRetrieverCandidate(BaseModel):
    chunk_id: str
    score: float
    doc_id: str

class TraceCritic(BaseModel):
    contradictions: List[Dict[str, Any]]
    stale: List[StalenessFinding]
    unsupported_claims: List[str]

class TraceTimings(BaseModel):
    retriever: float
    synthesizer: float
    critic: float
    resolution: float
    total: float

class Trace(BaseModel):
    retriever: Dict[str, List[TraceRetrieverCandidate]]
    synthesizer: Dict[str, Any]
    critic: TraceCritic
    resolution: Dict[str, Any]
    timings_ms: TraceTimings

class AskResponse(BaseModel):
    run_id: str
    question: str
    status: Literal["consistent", "conflict_resolved", "conflict_unresolved", "insufficient_evidence"]
    final_answer: str
    conflicts: List[Conflict]
    claims: List[Claim]
    staleness_findings: List[StalenessFinding]
    citations: List[Source]
    trace: Trace