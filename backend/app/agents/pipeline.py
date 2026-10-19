import time
import uuid
from typing import Dict, Any, List
from app.schemas import AskResponse, Trace, TraceTimings, TraceCritic, Source, Claim
from app.agents.retriever import retrieve
from app.agents.synthesizer import synthesize
from app.agents.critic import check_contradictions, check_staleness, check_unsupported_claims
from app.agents.resolution import resolve_conflicts, get_source_by_chunk_id
from app.config import settings

def run_pipeline(question: str) -> AskResponse:
    """Orchestrates the entire multi-agent verification pipeline sequentially."""
    t0 = time.time()
    
    # 1. Retriever
    chunks, candidates = retrieve(question, top_k=settings.TOP_K)
    t1 = time.time()
    
    if not chunks:
        return AskResponse(
            run_id=str(uuid.uuid4()),
            question=question,
            status="insufficient_evidence",
            final_answer="The corpus has no relevant information.",
            conflicts=[],
            claims=[],
            staleness_findings=[],
            citations=[],
            trace=Trace(
                retriever={"candidates": candidates},
                synthesizer={"draft_answer": "", "claims": []},
                critic=TraceCritic(contradictions=[], stale=[], unsupported_claims=[]),
                resolution={"decisions": []},
                timings_ms=TraceTimings(
                    retriever=(t1 - t0) * 1000,
                    synthesizer=0, critic=0, resolution=0,
                    total=(t1 - t0) * 1000
                )
            )
        )
        
    # 2. Synthesizer
    synth_output = synthesize(question, chunks)
    t2 = time.time()
    
    # 3. Critic
    contradictions = check_contradictions(chunks)
    staleness = check_staleness(chunks)
    unsupported = check_unsupported_claims(synth_output.claims, chunks)
    t3 = time.time()
    
    # 4. Resolution
    status, final_answer, conflicts, resolved_claims = resolve_conflicts(
        question=question,
        draft_answer=synth_output.draft_answer,
        claims=synth_output.claims,
        contradictions=contradictions,
        staleness=staleness,
        unsupported=unsupported,
        chunks=chunks
    )
    t4 = time.time()
    
    # Assemble citations list (mapping supported claim chunk_ids to Sources)
    citations_map = {}
    for c in resolved_claims:
        if c.supported:
            for cid in c.citations:
                if cid not in citations_map:
                    try:
                        citations_map[cid] = get_source_by_chunk_id(cid, chunks)
                    except ValueError:
                        pass
                        
    citations = list(citations_map.values())
    
    trace = Trace(
        retriever={"candidates": candidates},
        synthesizer={
            "draft_answer": synth_output.draft_answer,
            "claims": [c.model_dump() for c in synth_output.claims]
        },
        critic=TraceCritic(
            contradictions=contradictions,
            stale=staleness,
            unsupported_claims=unsupported
        ),
        resolution={"decisions": [c.model_dump() for c in conflicts]},
        timings_ms=TraceTimings(
            retriever=(t1 - t0) * 1000,
            synthesizer=(t2 - t1) * 1000,
            critic=(t3 - t2) * 1000,
            resolution=(t4 - t3) * 1000,
            total=(t4 - t0) * 1000
        )
    )
    
    return AskResponse(
        run_id=str(uuid.uuid4()),
        question=question,
        status=status,
        final_answer=final_answer,
        conflicts=conflicts,
        claims=resolved_claims,
        staleness_findings=staleness,
        citations=citations,
        trace=trace
    )