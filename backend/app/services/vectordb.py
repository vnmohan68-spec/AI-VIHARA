"""
RAG Pipeline for Vihara AI
- Embeddings via sentence-transformers (BAAI/bge-small-en)
- Vector store: Qdrant
- Retrieval: semantic search + re-ranking
- Used for: monument context, hidden gems, cultural guides
"""
import logging
from typing import List, Dict, Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Lazy imports (heavy models loaded on first use)
_embedder = None
_qdrant = None


def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedder loaded: %s", settings.EMBEDDING_MODEL)
        except ImportError:
            logger.warning("sentence-transformers not available, using dummy embedder")
            _embedder = "dummy"
    return _embedder


def get_qdrant():
    global _qdrant
    if _qdrant is None:
        try:
            from qdrant_client import QdrantClient
            _qdrant = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
            )
            logger.info("Qdrant client initialized")
        except Exception as e:
            logger.warning("Qdrant not available: %s", e)
            _qdrant = "unavailable"
    return _qdrant


async def init_vector_db():
    """Initialize Qdrant collections."""
    client = get_qdrant()
    if client == "unavailable":
        logger.warning("Vector DB unavailable — RAG disabled")
        return

    try:
        from qdrant_client.http.models import Distance, VectorParams

        for collection in [
            settings.VECTOR_COLLECTION_MONUMENTS,
            settings.VECTOR_COLLECTION_GEMS,
        ]:
            existing = [c.name for c in client.get_collections().collections]
            if collection not in existing:
                client.create_collection(
                    collection_name=collection,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIM,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info("Created collection: %s", collection)
    except Exception as e:
        logger.error("Vector DB init error: %s", e)


def embed_text(text: str) -> List[float]:
    """Generate embedding for a text string."""
    embedder = get_embedder()
    if embedder == "dummy":
        return [0.0] * settings.EMBEDDING_DIM
    return embedder.encode(text, normalize_embeddings=True).tolist()


async def retrieve_context(
    query: str,
    collection: str = None,
    top_k: int = 5,
    score_threshold: float = 0.5,
) -> List[Dict]:
    """
    Semantic retrieval from vector store.
    
    RAG WORKFLOW:
    1. Embed the query
    2. Search Qdrant for similar documents
    3. Filter by relevance score
    4. Return context chunks for LLM prompt augmentation
    """
    if collection is None:
        collection = settings.VECTOR_COLLECTION_MONUMENTS

    client = get_qdrant()
    if client == "unavailable":
        return []

    try:
        query_vector = embed_text(query)
        results = client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=top_k,
            score_threshold=score_threshold,
        )
        return [
            {
                "score": r.score,
                "content": r.payload.get("content", ""),
                "name": r.payload.get("name", ""),
                "location": r.payload.get("location", ""),
                "type": r.payload.get("type", ""),
            }
            for r in results
        ]
    except Exception as e:
        logger.error("RAG retrieval error: %s", e)
        return []


async def upsert_monument(
    monument_id: str,
    name: str,
    location: str,
    content: str,
    metadata: Dict,
) -> str:
    """Add or update a monument in the vector store."""
    client = get_qdrant()
    if client == "unavailable":
        return monument_id

    from qdrant_client.http.models import PointStruct

    text = f"{name} {location} {content}"
    vector = embed_text(text)

    client.upsert(
        collection_name=settings.VECTOR_COLLECTION_MONUMENTS,
        points=[
            PointStruct(
                id=monument_id,
                vector=vector,
                payload={
                    "name": name,
                    "location": location,
                    "content": content,
                    **metadata,
                },
            )
        ],
    )
    return monument_id


def build_rag_prompt(query: str, context: List[Dict]) -> str:
    """
    Build an augmented prompt with retrieved context.
    
    RETRIEVAL WORKFLOW:
    - Top-k documents retrieved from Qdrant
    - Context is prepended to the user query
    - LLM generates a grounded, accurate response
    """
    if not context:
        return query

    context_str = "\n\n".join([
        f"[Source: {c['name']} — {c['location']}]\n{c['content']}"
        for c in context
    ])

    return f"""RETRIEVED KNOWLEDGE BASE CONTEXT (use this to ground your response):

{context_str}

---

USER QUERY: {query}

Use the context above to provide accurate, culturally rich information. Add your own knowledge to enrich the response, but ensure factual accuracy."""
