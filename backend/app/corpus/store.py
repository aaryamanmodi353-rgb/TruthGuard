import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from typing import List, Dict, Optional
from app.config import settings
from app.schemas import DocumentMeta

class CorpusStore:
    def __init__(self):
        os.makedirs(settings.CHROMA_DIR, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DIR, settings=ChromaSettings(anonymized_telemetry=False))
        self.collection = self.chroma_client.get_or_create_collection(name="truthguard_docs")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.documents: Dict[str, DocumentMeta] = {}
        self.chunks_cache: List[Dict] = []
        self.bm25: Optional[BM25Okapi] = None
        
        self._load_from_chroma()

    def _load_from_chroma(self):
        """Initializes in-memory registry and BM25 from ChromaDB on startup."""
        results = self.collection.get(include=["metadatas", "documents"])
        
        doc_meta_map = {}
        self.chunks_cache = []
        
        if not results["ids"]:
            return

        for id_, text, meta in zip(results["ids"], results["documents"], results["metadatas"]):
            doc_id = meta["doc_id"]
            if doc_id not in doc_meta_map:
                supersedes = meta["supersedes"].split(",") if meta["supersedes"] else []
                doc_meta_map[doc_id] = DocumentMeta(
                    doc_id=doc_id,
                    title=meta["title"],
                    doc_type=meta["doc_type"],
                    version=meta["version"],
                    effective_date=meta["effective_date"],
                    family=meta["family"],
                    supersedes=supersedes,
                    chunk_count=0 
                )
            doc_meta_map[doc_id].chunk_count += 1
            
            self.chunks_cache.append({
                "chunk_id": id_,
                "doc_id": doc_id,
                "text": text,
                "metadata": meta
            })
            
        self.documents = doc_meta_map
        self._rebuild_bm25()

    def _rebuild_bm25(self):
        if not self.chunks_cache:
            self.bm25 = None
            return
        
        tokenized_corpus = [chunk["text"].lower().split() for chunk in self.chunks_cache]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def add_document(self, meta: DocumentMeta, chunks: List[Dict]):
        self.delete_document(meta.doc_id)
        
        ids = [c["chunk_id"] for c in chunks]
        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        embeddings = self.embedding_model.encode(texts).tolist()
        
        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=embeddings
        )
        
        self.documents[meta.doc_id] = meta
        self.chunks_cache.extend(chunks)
        self._rebuild_bm25()

    def delete_document(self, doc_id: str):
        if doc_id in self.documents:
            self.collection.delete(where={"doc_id": doc_id})
            del self.documents[doc_id]
            self.chunks_cache = [c for c in self.chunks_cache if c["doc_id"] != doc_id]
            self._rebuild_bm25()

    def clear(self):
        ids = self.collection.get()["ids"]
        if ids:
            self.collection.delete(ids=ids)
        self.documents.clear()
        self.chunks_cache.clear()
        self.bm25 = None

store = CorpusStore()