from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    """Real visitor IP — reads Railway/proxy forwarded headers before falling back."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    if request.client:
        return request.client.host

    return "unknown"


limiter = Limiter(key_func=get_client_ip)
