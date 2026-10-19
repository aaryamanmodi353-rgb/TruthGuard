from typing import List, Dict
from pydantic import BaseModel
from app.llm import generate_structured
from app.schemas import Claim

class SynthesizerOutput(BaseModel):
    draft_answer: str
    claims: List[Claim]

def synthesize(question: str, chunks: List[Dict]) -> SynthesizerOutput:
    """Drafts an initial answer and extracts citations strictly from retrieved chunks."""
    system_prompt = (
        "You are an AI assistant answering questions based STRICTLY on the provided documents. "
        "Do not use outside knowledge. If the documents contain conflicting information, include both "
        "sides in your draft, do not try to reconcile them. "
        "Extract every factual claim you make and list the chunk_ids that support it. "
        "Each claim must have 'supported': true."
    )
    
    context = "\n\n".join(
        f"CHUNK_ID: {c['chunk_id']}\nDOC_ID: {c['doc_id']}\nTEXT: {c['text']}" 
        for c in chunks
    )
    
    user_prompt = f"Context:\n{context}\n\nQuestion: {question}"
    
    result = generate_structured(system_prompt, user_prompt, SynthesizerOutput)
    return result