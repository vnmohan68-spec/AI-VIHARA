from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
import json, logging

from app.services.database import get_db
from app.services.vectordb import retrieve_context, build_rag_prompt
from app.ai.provider import ai_provider
from app.routers.auth import get_optional_user
from app.models.models import User, ChatSession, ChatMessage

router      = APIRouter()
logger      = logging.getLogger(__name__)
MAX_HISTORY = 12
MAX_TOKENS  = 1200


class ChatRequest(BaseModel):
    message:    str       = Field(..., min_length=1, max_length=2000)
    mode:       str       = Field(default="Story Mode")
    language:   str       = Field(default="English")
    history:    List[dict] = Field(default_factory=list)
    session_id: Optional[str] = None
    use_rag:    bool      = True


@router.post("/stream")
async def stream_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """
    SSE streaming chat.
    Works with OR without API keys.
    With keys → real Qwen2.5 streaming.
    Without keys → curated offline responses with simulated streaming.
    """
    async def generate():
        # RAG context retrieval (skip if Qdrant unavailable)
        context = []
        if req.use_rag and len(req.message) >= 8:
            try:
                context = await retrieve_context(req.message, top_k=4)
            except Exception as exc:
                logger.debug("RAG skip: %s", exc)

        augmented = build_rag_prompt(req.message, context) if context else req.message
        history   = [
            m for m in req.history[-MAX_HISTORY:]
            if m.get("content") and m.get("role") in ("user", "assistant")
        ]
        messages  = [*history, {"role": "user", "content": augmented}]

        full = ""
        try:
            async for chunk in ai_provider.stream_chat(messages, req.mode, req.language, MAX_TOKENS):
                full += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.error("Chat stream error: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Persist if authenticated
        if current_user and req.session_id and full:
            try:
                db.add(ChatMessage(session_id=req.session_id, role="user",      content=req.message))
                db.add(ChatMessage(session_id=req.session_id, role="assistant", content=full))
                await db.flush()
            except Exception as exc:
                logger.warning("Persist failed: %s", exc)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/complete")
async def chat_complete(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    """Non-streaming chat — always works, online or offline."""
    context = []
    if req.use_rag:
        try:
            context = await retrieve_context(req.message, top_k=3)
        except Exception:
            pass

    augmented = build_rag_prompt(req.message, context) if context else req.message
    history   = req.history[-MAX_HISTORY:]
    messages  = [*history, {"role": "user", "content": augmented}]

    # ai_provider.chat_completion never raises — falls back to offline
    response = await ai_provider.chat_completion(messages, req.mode, req.language, MAX_TOKENS)
    return {"response": response, "context_chunks": len(context)}


@router.post("/session")
async def create_session(
    mode:     str = "Story Mode",
    language: str = "English",
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if not current_user:
        return {"session_id": None}
    session = ChatSession(user_id=current_user.id, mode=mode, language=language, title="New Conversation")
    db.add(session)
    await db.flush()
    return {"session_id": session.id}


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if not current_user:
        return []
    from sqlalchemy import select, desc
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.created_at))
        .limit(20)
    )
    return [{"id": s.id, "title": s.title, "mode": s.mode, "created_at": s.created_at} for s in result.scalars()]
