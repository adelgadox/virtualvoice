import logging
import httpx

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


def publish_reply(comment_id: str, message: str, access_token: str) -> str:
    """Post a reply to a comment. Returns the platform reply ID."""
    url = f"{GRAPH_API_BASE}/{comment_id}/replies"
    response = httpx.post(
        url,
        params={"access_token": access_token},
        json={"message": message},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    return data["id"]
