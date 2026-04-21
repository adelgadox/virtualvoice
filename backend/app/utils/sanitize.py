"""
Input sanitization helpers used in Pydantic schema validators.

Note on SQL injection: SQLAlchemy ORM uses parameterized queries everywhere,
so SQL injection is already prevented at the data-access layer. These helpers
add defence-in-depth at the schema layer.

Note on XSS: React/Next.js auto-escapes JSX content, so stored HTML would
never be executed. Still, keeping raw HTML out of the database is good practice.
"""
import html
import re

# Matches any HTML / XML tag
_TAG_RE = re.compile(r"<[^>]+>", re.DOTALL)

# Valid slug: lowercase letters, digits, hyphens only
_SLUG_RE = re.compile(r"^[a-z0-9-]+$")


def strip_html(value: str) -> str:
    """Remove all HTML/XML tags and decode HTML entities, then strip whitespace."""
    cleaned = _TAG_RE.sub("", value)
    return html.unescape(cleaned).strip()


def validate_slug(value: str) -> str:
    value = value.strip().lower()
    if len(value) < 2:
        raise ValueError("Slug must be at least 2 characters long.")
    if len(value) > 60:
        raise ValueError("Slug must be at most 60 characters long.")
    if not _SLUG_RE.match(value):
        raise ValueError("Slug may only contain lowercase letters, numbers, and hyphens.")
    return value
