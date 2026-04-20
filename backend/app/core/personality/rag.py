import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.knowledge_entry import KnowledgeEntry
from app.core.personality._embed import embed_text

try:
    from pgvector.sqlalchemy import Vector  # type: ignore
except ImportError:
    Vector = None  # type: ignore

logger = logging.getLogger(__name__)


def retrieve_relevant_knowledge(influencer_id: UUID, query: str, db: Session, k: int = 5) -> list[str]:
    """Return the k most relevant knowledge entries for the given query.

    Uses pgvector cosine similarity when embeddings are available.
    Falls back to returning the most recently updated entries if not.
    """
    try:
        if Vector is None:
            raise RuntimeError("pgvector not installed")

        query_vec = embed_text(query)
        rows = (
            db.query(KnowledgeEntry)
            .filter(
                KnowledgeEntry.influencer_id == influencer_id,
                KnowledgeEntry.is_active == True,  # noqa: E712
                KnowledgeEntry.embedding.isnot(None),
            )
            .order_by(KnowledgeEntry.embedding.cosine_distance(query_vec))
            .limit(k)
            .all()
        )
        return [r.content for r in rows]
    except Exception:
        logger.debug("pgvector RAG unavailable, falling back to recency order")

    rows = (
        db.query(KnowledgeEntry)
        .filter(KnowledgeEntry.influencer_id == influencer_id, KnowledgeEntry.is_active == True)  # noqa: E712
        .order_by(KnowledgeEntry.updated_at.desc())
        .limit(k)
        .all()
    )
    return [r.content for r in rows]
