#!/usr/bin/env python3
"""
NOVA RAG SERVICE
Runs alongside your Node.js server.
Handles PDF chunking, vector storage, and semantic search.

Start with: python3 rag_service.py
Runs on: http://localhost:8001

Install deps (already done):
  pip install chromadb sentence-transformers fastapi uvicorn
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import os, re, json

app = FastAPI()

# ── ChromaDB — persistent storage on disk ────────────────────────
# Data survives server restarts
chroma_client = chromadb.PersistentClient(path="./chroma_data")

# ── Embedding model — runs locally, no API needed ────────────────
# all-MiniLM-L6-v2: 80MB, fast, excellent for semantic search
# Downloads once on first run, cached forever after
print("Loading embedding model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Embedding model ready")

# ── Get or create collection per student ─────────────────────────
def get_collection(student_id: str):
    # Each student gets their own vector collection
    # Safe collection name: alphanumeric + underscores only
    safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', student_id)
    return chroma_client.get_or_create_collection(
        name=f"nova_{safe_id}",
        metadata={"hnsw:space": "cosine"}
    )

# ─────────────────────────────────────────────────────────────────
# CHUNK TEXT — split document into overlapping 500-word chunks
# Overlap ensures context is not lost at chunk boundaries
# ─────────────────────────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk = ' '.join(chunk_words)
        chunks.append(chunk)
        i += chunk_size - overlap  # slide forward with overlap
    return chunks

# ─────────────────────────────────────────────────────────────────
# POST /index — index a document into ChromaDB
# Called by nova.js after a PDF is uploaded and parsed
# ─────────────────────────────────────────────────────────────────
class IndexRequest(BaseModel):
    student_id: str
    material_id: str
    file_name: str
    course_code: Optional[str] = None
    content: str  # full extracted text from PDF

@app.post("/index")
async def index_document(req: IndexRequest):
    try:
        collection = get_collection(req.student_id)
        chunks = chunk_text(req.content)

        if not chunks:
            raise HTTPException(status_code=400, detail="No text to index")

        # Delete old chunks for this material if re-uploading
        try:
            existing = collection.get(where={"material_id": req.material_id})
            if existing['ids']:
                collection.delete(ids=existing['ids'])
        except Exception:
            pass

        # Generate embeddings for all chunks
        embeddings = embedder.encode(chunks, show_progress_bar=False).tolist()

        # Build chunk IDs and metadata
        ids = [f"{req.material_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{
            "material_id": req.material_id,
            "file_name":   req.file_name,
            "course_code": req.course_code or "",
            "chunk_index": i,
            "total_chunks": len(chunks)
        } for i in range(len(chunks))]

        # Store in ChromaDB
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )

        return {
            "success": True,
            "chunks_indexed": len(chunks),
            "file_name": req.file_name,
            "material_id": req.material_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────
# POST /search — semantic search across student's documents
# Returns the most relevant chunks for a given query
# ─────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    student_id: str
    query: str
    course_code: Optional[str] = None  # filter by course if provided
    n_results: int = 4  # number of chunks to return

@app.post("/search")
async def search_documents(req: SearchRequest):
    try:
        collection = get_collection(req.student_id)

        # Check if collection has any documents
        count = collection.count()
        if count == 0:
            return {"results": [], "found": 0}

        # Encode the query
        query_embedding = embedder.encode([req.query], show_progress_bar=False).tolist()

        # Build filter — optionally restrict to specific course
        where_filter = None
        if req.course_code:
            where_filter = {"course_code": req.course_code}

        # Search
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(req.n_results, count),
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        formatted = []
        for i, doc in enumerate(results['documents'][0]):
            distance = results['distances'][0][i]
            relevance = round((1 - distance) * 100, 1)  # convert to % relevance

            # Only include if relevance is meaningful (>40%)
            if relevance > 40:
                formatted.append({
                    "content":     doc,
                    "file_name":   results['metadatas'][0][i].get('file_name', ''),
                    "course_code": results['metadatas'][0][i].get('course_code', ''),
                    "chunk_index": results['metadatas'][0][i].get('chunk_index', 0),
                    "relevance":   relevance
                })

        return {"results": formatted, "found": len(formatted)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────
# DELETE /material — remove a material's chunks from ChromaDB
# Called when student deletes a material from the dashboard
# ─────────────────────────────────────────────────────────────────
class DeleteRequest(BaseModel):
    student_id: str
    material_id: str

@app.delete("/material")
async def delete_material(req: DeleteRequest):
    try:
        collection = get_collection(req.student_id)
        existing = collection.get(where={"material_id": req.material_id})
        if existing['ids']:
            collection.delete(ids=existing['ids'])
            return {"success": True, "deleted_chunks": len(existing['ids'])}
        return {"success": True, "deleted_chunks": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────
# GET /stats — how many chunks indexed for a student
# ─────────────────────────────────────────────────────────────────
@app.get("/stats/{student_id}")
async def get_stats(student_id: str):
    try:
        collection = get_collection(student_id)
        count = collection.count()
        return {"student_id": student_id, "chunks_indexed": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Nova RAG"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Nova RAG service on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
