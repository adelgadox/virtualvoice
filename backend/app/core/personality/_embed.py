"""
Text embedding via Gemini text-embedding-004.

Returns a 768-dimensional float vector.
Falls back gracefully: callers should catch exceptions and store NULL.
"""
import logging

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)

_MODEL = "models/text-embedding-004"
_DIMS = 768


def embed_text(text: str) -> list[float]:
    """Return a 768-dim embedding for *text* using Gemini text-embedding-004."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is required for embeddings")

    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(
        model=_MODEL,
        content=text,
        output_dimensionality=_DIMS,
    )
    return result["embedding"]


def try_embed(text: str) -> list[float] | None:
    """Embed *text*, returning None on any failure (missing key, API error, etc.)."""
    try:
        return embed_text(text)
    except Exception as exc:
        logger.debug("Embedding skipped (%s); entry will use recency-based RAG", exc)
        return None
