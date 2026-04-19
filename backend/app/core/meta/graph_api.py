import logging
import httpx

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


async def publish_reply(comment_id: str, message: str, access_token: str) -> str:
    """Post a reply to a comment. Returns the platform reply ID."""
    url = f"{GRAPH_API_BASE}/{comment_id}/replies"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            url,
            params={"access_token": access_token},
            json={"message": message},
        )
    response.raise_for_status()
    data = response.json()
    return data["id"]
