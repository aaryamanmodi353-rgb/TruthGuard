# TruthGuard — Adversarial Verification for Multi-Agent Document Q&A

TruthGuard is a FastAPI backend that doesn't just retrieve and summarize documents, but actively uses an adversarial multi-agent system to detect conflicts, check document staleness, and verify claim provenance before returning a final answer. 

## Setup Instructions

1. **Initialize a Python Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate