from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from pydantic import BaseModel, Field
from app.corpus.store import store
from app.corpus.ingest import process_document, IngestionError
from app.corpus.seed import RAW_SEED_DOCS, SEED_QUESTIONS
from app.schemas import DocumentMeta, AskResponse
from app.agents.pipeline import run_pipeline

router = APIRouter()

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)

@router.get("/health")
def health():
    return {
        "status": "ok",
        "documents": len(store.documents),
        "chunks": len(store.chunks_cache)
    }

@router.post("/seed")
def seed():
    store.clear()
    for raw_doc in RAW_SEED_DOCS:
        meta, chunks = process_document(raw_doc)
        store.add_document(meta, chunks)
    return {
        "documents": len(store.documents),
        "chunks": len(store.chunks_cache)
    }

@router.post("/documents", response_model=List[DocumentMeta])
async def upload_documents(files: List[UploadFile] = File(...)):
    added = []
    for f in files:
        filename = f.filename or ""
        if not (filename.endswith(".md") or filename.endswith(".txt")):
            raise HTTPException(
                status_code=422,
                detail=f"File '{filename}' has an unsupported extension. Only .md and .txt files are allowed."
            )
        try:
            content = (await f.read()).decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=422, detail=f"File '{filename}' is not valid UTF-8 text.")

        try:
            meta, chunks = process_document(content)
        except IngestionError as e:
            raise HTTPException(status_code=422, detail=f"File {filename}: {str(e)}")

        store.add_document(meta, chunks)
        added.append(meta)
    return added

@router.get("/documents", response_model=List[DocumentMeta])
def get_documents():
    return list(store.documents.values())

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if doc_id not in store.documents:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")
    store.delete_document(doc_id)
    return {"deleted": doc_id}

@router.get("/seed/questions")
def get_seed_questions():
    return SEED_QUESTIONS

@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    if not store.documents:
        raise HTTPException(status_code=409, detail="Corpus is empty. Seed or upload documents before calling /api/ask.")
    return run_pipeline(request.question)