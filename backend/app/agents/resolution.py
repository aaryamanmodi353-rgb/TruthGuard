import uuid
from typing import List, Dict, Any, Tuple
from pydantic import BaseModel
from app.schemas import Conflict, Position, Source, Claim, StalenessFinding, Resolution as ResolutionSchema
from app.llm import generate_structured, LLMError
from app.config import settings

class FinalAnswerOutput(BaseModel):
    final_answer: str

def get_source_by_chunk_id(chunk_id: str, chunks: List[Dict]) -> Source:
    for c in chunks:
        if c["chunk_id"] == chunk_id:
            m = c["metadata"]
            return Source(
                doc_id=m["doc_id"],
                title=m["title"],
                doc_type=m["doc_type"],
                version=m["version"],
                effective_date=m["effective_date"],
                chunk_id=chunk_id,
                quote=c["text"]
            )
    raise ValueError(f"Chunk {chunk_id} not found in retrieved chunks.")

def _build_deterministic_fallback(status: str, draft_answer: str, conflicts: List[Conflict], valid_claims: List[Claim]) -> str:
    if status == "consistent":
        if valid_claims:
            return " ".join(c.text for c in valid_claims)
        return draft_answer

    if status == "conflict_resolved":
        parts = []
        for c in conflicts:
            w_doc = c.resolution.winning_doc_id
            w_pos = next((p for p in c.positions if p.source.doc_id == w_doc), c.positions[0])
            l_pos = next((p for p in c.positions if p.source.doc_id != w_doc), c.positions[-1])
            parts.append(
                f"Regarding {c.topic}, {l_pos.source.title} ({l_pos.source.version}, {l_pos.source.effective_date}) "
                f"states that {l_pos.claim}, whereas {w_pos.source.title} ({w_pos.source.version}, {w_pos.source.effective_date}) "
                f"states that {w_pos.claim}. {w_pos.source.title} ({w_pos.source.version}, {w_pos.source.effective_date}) "
                f"supersedes {l_pos.source.title} ({l_pos.source.version}, {l_pos.source.effective_date})."
            )
        return " ".join(parts)

    parts = []
    for c in conflicts:
        p1, p2 = c.positions[0], c.positions[1]
        parts.append(
            f"Regarding {c.topic}, {p1.source.title} ({p1.source.version}, {p1.source.effective_date}) "
            f"states that {p1.claim}, while {p2.source.title} ({p2.source.version}, {p2.source.effective_date}) "
            f"states that {p2.claim}."
        )
    parts.append("I cannot resolve this conflict with the available information.")
    return " ".join(parts)

def _validate_final_answer(ans: str, status: str, conflicts: List[Conflict]) -> None:
    if not ans or not ans.strip():
        raise ValueError("Final answer cannot be empty.")

    if status == "conflict_resolved":
        if "supersede" not in ans.lower():
            raise ValueError("conflict_resolved answer must explicitly state which document supersedes which.")
        for c in conflicts:
            for pos in c.positions:
                if pos.source.title.lower() not in ans.lower() and pos.source.doc_id.lower() not in ans.lower():
                    raise ValueError(f"Missing document title '{pos.source.title}' in conflict_resolved answer.")

    elif status == "conflict_unresolved":
        required_sentence = "I cannot resolve this conflict with the available information."
        if required_sentence not in ans:
            raise ValueError(f"Must contain exact sentence: '{required_sentence}'")
        for c in conflicts:
            for pos in c.positions:
                if pos.source.title.lower() not in ans.lower() and pos.source.doc_id.lower() not in ans.lower():
                    raise ValueError(f"Missing document provenance '{pos.source.title}' in conflict_unresolved answer.")

def generate_final_answer(
    question: str,
    status: str,
    draft_answer: str,
    conflicts: List[Conflict],
    valid_claims: List[Claim],
    had_filtered_claims: bool = False
) -> str:
    """
    Produces final_answer via the LLM wrapper with a post-generation validator in code
    (retries once, then falls back to a deterministic template).
    """
    if status == "consistent" and not had_filtered_claims:
        return draft_answer

    if not settings.GROQ_API_KEY:
        return _build_deterministic_fallback(status, draft_answer, conflicts, valid_claims)

    system_prompt = (
        "You generate the final verified answer for TruthGuard strictly from the provided claims and conflict decisions. "
        "Do not invent any facts absent from the claims.\n"
    )
    if status == "conflict_resolved":
        system_prompt += (
            "Hard constraints for conflict_resolved:\n"
            "- Name BOTH positions along with their exact document titles, versions, and effective dates.\n"
            "- Explicitly state which document supersedes which (using the word 'supersedes' or 'superseded').\n"
            "- Never present a single blended figure."
        )
    elif status == "conflict_unresolved":
        system_prompt += (
            "Hard constraints for conflict_unresolved:\n"
            "- Present both positions clearly with their exact document titles, versions, and effective dates.\n"
            "- Never blend the conflicting figures.\n"
            "- You MUST include the exact sentence: 'I cannot resolve this conflict with the available information.'"
        )
    else:
        system_prompt += "Answer clearly using ONLY the supported, non-stale claims provided."

    user_prompt = (
        f"Question: {question}\n"
        f"Status: {status}\n"
        f"Supported Claims: {[c.model_dump() for c in valid_claims]}\n"
        f"Conflicts: {[c.model_dump() for c in conflicts]}"
    )

    last_error = ""
    for attempt in range(2):
        try:
            prompt_to_send = user_prompt if attempt == 0 else f"{user_prompt}\n\nPrevious attempt failed validation: {last_error}. Fix this strictly."
            out = generate_structured(system_prompt, prompt_to_send, FinalAnswerOutput)
            _validate_final_answer(out.final_answer, status, conflicts)
            return out.final_answer
        except (ValueError, LLMError) as e:
            last_error = str(e)

    return _build_deterministic_fallback(status, draft_answer, conflicts, valid_claims)

def resolve_conflicts(
    question: str,
    draft_answer: str,
    claims: List[Claim],
    contradictions: List[Dict[str, Any]],
    staleness: List[StalenessFinding],
    unsupported: List[str],
    chunks: List[Dict]
) -> Tuple[str, str, List[Conflict], List[Claim]]:
    """Deterministic conflict and staleness resolution logic."""
    chunk_to_doc = {c["chunk_id"]: c["doc_id"] for c in chunks}

    # 1. Flag unsupported claims
    unsupported_set = set(unsupported)
    had_filtered_claims = False
    for claim in claims:
        if claim.text in unsupported_set:
            claim.supported = False
            had_filtered_claims = True

    # 2. Build conflicts & resolve against deterministic staleness findings
    conflicts: List[Conflict] = []
    contradiction_doc_ids = set()

    for contra in contradictions:
        pos_list: List[Position] = []
        for p in contra["positions"]:
            pos_list.append(Position(claim=p["claim"], source=get_source_by_chunk_id(p["chunk_id"], chunks)))

        if len(pos_list) != 2:
            continue

        doc_a = pos_list[0].source.doc_id
        doc_b = pos_list[1].source.doc_id
        contradiction_doc_ids.update([doc_a, doc_b])

        a_stale_by_b = any(f.stale_doc_id == doc_a and f.superseded_by_doc_id == doc_b for f in staleness)
        b_stale_by_a = any(f.stale_doc_id == doc_b and f.superseded_by_doc_id == doc_a for f in staleness)

        if a_stale_by_b:
            res = ResolutionSchema(
                type="superseded",
                winning_doc_id=doc_b,
                rationale=(
                    f"{pos_list[1].source.title} ({pos_list[1].source.version}, {pos_list[1].source.effective_date}) "
                    f"supersedes {pos_list[0].source.title} ({pos_list[0].source.version}, {pos_list[0].source.effective_date})."
                )
            )
        elif b_stale_by_a:
            res = ResolutionSchema(
                type="superseded",
                winning_doc_id=doc_a,
                rationale=(
                    f"{pos_list[0].source.title} ({pos_list[0].source.version}, {pos_list[0].source.effective_date}) "
                    f"supersedes {pos_list[1].source.title} ({pos_list[1].source.version}, {pos_list[1].source.effective_date})."
                )
            )
        else:
            res = ResolutionSchema(
                type="unresolvable",
                winning_doc_id=None,
                rationale=(
                    f"Both {pos_list[0].source.title} ({pos_list[0].source.version}, {pos_list[0].source.effective_date}) "
                    f"and {pos_list[1].source.title} ({pos_list[1].source.version}, {pos_list[1].source.effective_date}) "
                    f"have equal or non-overlapping authority metadata with no supersession link."
                )
            )

        conflicts.append(Conflict(
            conflict_id=str(uuid.uuid4()),
            topic=contra["topic"],
            positions=pos_list,
            resolution=res
        ))

    # 3. Exclude stale documents that are NOT part of any contradiction from the answer's claims
    all_stale_docs = {f.stale_doc_id for f in staleness}
    non_contradiction_stale_docs = all_stale_docs - contradiction_doc_ids

    filtered_claims: List[Claim] = []
    for claim in claims:
        claim_docs = {chunk_to_doc.get(cid) for cid in claim.citations if cid in chunk_to_doc}
        if claim_docs and claim_docs.issubset(non_contradiction_stale_docs):
            had_filtered_claims = True
            continue
        filtered_claims.append(claim)

    valid_claims = [c for c in filtered_claims if c.supported]

    # 4. Determine overall status
    if not conflicts:
        status = "consistent"
    elif all(c.resolution.type == "superseded" for c in conflicts):
        status = "conflict_resolved"
    else:
        status = "conflict_unresolved"

    # 5. Generate final answer with hard constraint validation
    final_answer = generate_final_answer(
        question=question,
        status=status,
        draft_answer=draft_answer,
        conflicts=conflicts,
        valid_claims=valid_claims,
        had_filtered_claims=had_filtered_claims
    )

    return status, final_answer, conflicts, filtered_claims