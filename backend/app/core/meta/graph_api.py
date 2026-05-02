import logging
import httpx

logger = logging.getLogger(__name__)

from app.core.meta import GRAPH_API_VERSION
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


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


async def get_recent_posts(account_id: str, access_token: str, limit: int = 5) -> list[str]:
    """
    Fetch captions from the most recent Instagram posts for an account.
    Returns a list of caption strings (posts without captions are skipped).
    Fails silently — returns [] on any API error.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{GRAPH_API_BASE}/{account_id}/media",
                params={
                    "fields": "caption,media_type,timestamp",
                    "limit": limit,
                    "access_token": access_token,
                },
            )
            if resp.status_code != 200:
                logger.warning("get_recent_posts: non-200 response %d for account %s", resp.status_code, account_id)
                return []
            data = resp.json().get("data", [])
            captions = [item["caption"] for item in data if item.get("caption")]
            return captions
    except Exception as exc:
        logger.warning("get_recent_posts: failed for account %s: %s", account_id, exc)
        return []
