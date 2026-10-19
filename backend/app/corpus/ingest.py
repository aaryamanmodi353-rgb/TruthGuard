import re
import yaml
from datetime import date, datetime
from typing import List, Dict, Any, Tuple
from app.schemas import DocumentMeta

class IngestionError(Exception):
    pass

def parse_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """Extracts YAML front-matter and the markdown body."""
    match = re.match(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n?(.*)", content.lstrip(), re.DOTALL)
    if not match:
        raise IngestionError("Missing or invalid YAML front-matter. File must start with --- block.")

    try:
        metadata = yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        raise IngestionError(f"Invalid YAML syntax in front-matter: {str(e)}")

    if not isinstance(metadata, dict):
        raise IngestionError("YAML front-matter must parse to a key-value mapping.")

    if isinstance(metadata.get("effective_date"), (date, datetime)):
        metadata["effective_date"] = metadata["effective_date"].strftime("%Y-%m-%d")

    if metadata.get("supersedes") is None:
        metadata["supersedes"] = []

    body = match.group(2).strip()
    if not body:
        raise IngestionError("Document body cannot be empty.")

    return metadata, body

def chunk_text(text: str, max_words: int = 120) -> List[str]:
    """Splits by markdown headings first, then paragraphs, up to ~120 words per chunk."""
    sections = re.split(r"(?m)(?=^#{1,6}\s+)", text)
    chunks: List[str] = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        paragraphs = re.split(r"\r?\n\s*\r?\n+", section)
        current_words: List[str] = []

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            words = para.split()

            while len(words) > max_words:
                if current_words:
                    chunks.append(" ".join(current_words))
                    current_words = []
                chunks.append(" ".join(words[:max_words]))
                words = words[max_words:]

            if len(current_words) + len(words) > max_words and current_words:
                chunks.append(" ".join(current_words))
                current_words = list(words)
            else:
                current_words.extend(words)

        if current_words:
            chunks.append(" ".join(current_words))

    return chunks

def process_document(file_content: str) -> Tuple[DocumentMeta, List[Dict[str, Any]]]:
    """Validates front-matter metadata and chunks the document."""
    raw_meta, body = parse_frontmatter(file_content)

    try:
        meta = DocumentMeta(**raw_meta)
    except Exception as e:
        raise IngestionError(f"Invalid front-matter fields: {str(e)}")

    raw_chunks = chunk_text(body, max_words=120)
    meta.chunk_count = len(raw_chunks)

    chunks = []
    for i, text in enumerate(raw_chunks):
        chunks.append({
            "chunk_id": f"{meta.doc_id}#{i}",
            "doc_id": meta.doc_id,
            "text": text,
            "metadata": {
                "doc_id": meta.doc_id,
                "title": meta.title,
                "doc_type": meta.doc_type,
                "version": meta.version,
                "effective_date": meta.effective_date,
                "family": meta.family,
                "supersedes": ",".join(meta.supersedes)
            }
        })

    return meta, chunks