import re
from typing import List, Dict, Tuple
from app.corpus.store import store
from app.schemas import TraceRetrieverCandidate

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "company", "do",
    "does", "for", "from", "get", "have", "how", "i", "in", "is", "it", "many",
    "much", "my", "northwind", "of", "on", "or", "our", "per", "policy", "the",
    "their", "to", "what", "when", "where", "which", "who", "why", "with", "work",
    "office", "employees", "employee", "labs"
}

def _tokenize_meaningful(text: str) -> List[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]

def retrieve(question: str, top_k: int = 8) -> Tuple[List[Dict], List[TraceRetrieverCandidate]]:
    """
    Hybrid BM25 + Embedding search using Reciprocal Rank Fusion (k=60).
    Returns empty lists if no chunk meets minimum lexical or semantic relevance.
    """
    if not store.chunks_cache or store.bm25 is None:
        return [], []

    meaningful_tokens = _tokenize_meaningful(question)
    raw_tokens = question.lower().split()

    # 1. BM25 Search using meaningful content tokens
    bm25_Tokens = meaningful_tokens if meaningful_tokens else raw_tokens
    bm25_scores = store.bm25.get_scores(bm25_Tokens)
    bm25_ranked = sorted(
        [(store.chunks_cache[i], float(score)) for i, score in enumerate(bm25_scores) if score > 0.0],
        key=lambda x: x[1],
        reverse=True
    )
    bm25_ranks = {chunk["chunk_id"]: rank for rank, (chunk, _) in enumerate(bm25_ranked)}

    # 2. Embedding Search (Chroma returns L2 squared distances by default)
    query_emb = store.embedding_model.encode([question]).tolist()
    chroma_res = store.collection.query(
        query_embeddings=query_emb,
        n_results=min(20, len(store.chunks_cache)),
        include=["distances"]
    )

    chroma_ids = chroma_res["ids"][0] if chroma_res["ids"] else []
    chroma_distances = chroma_res["distances"][0] if chroma_res.get("distances") else []

    # Filter out semantically distant chunks (L2 distance threshold ~ 1.25)
    relevant_chroma_ids = [
        cid for cid, dist in zip(chroma_ids, chroma_distances) if dist <= 1.25
    ]

    # If neither BM25 found a meaningful keyword match nor Chroma found a close semantic match,
    # short-circuit for insufficient_evidence
    if not bm25_ranks and not relevant_chroma_ids:
        return [], []

    chroma_ranks = {chunk_id: rank for rank, chunk_id in enumerate(relevant_chroma_ids)}

    # 3. Reciprocal Rank Fusion (k=60)
    rrf_scores: Dict[str, float] = {}
    k = 60
    for chunk in store.chunks_cache:
        c_id = chunk["chunk_id"]
        if c_id not in bm25_ranks and c_id not in chroma_ranks:
            continue

        score = 0.0
        if c_id in bm25_ranks:
            score += 1.0 / (k + bm25_ranks[c_id])
        if c_id in chroma_ranks:
            score += 1.0 / (k + chroma_ranks[c_id])

        rrf_scores[c_id] = score

    top_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_k]

    chunk_map = {c["chunk_id"]: c for c in store.chunks_cache}
    retrieved_chunks = [chunk_map[c_id] for c_id in top_ids]

    candidates = [
        TraceRetrieverCandidate(
            chunk_id=c_id,
            score=round(rrf_scores[c_id], 6),
            doc_id=chunk_map[c_id]["doc_id"]
        )
        for c_id in top_ids
    ]

    return retrieved_chunks, candidates