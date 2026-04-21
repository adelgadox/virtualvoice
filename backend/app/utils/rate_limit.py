from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    """Real visitor IP — use request.client.host which ProxyHeadersMiddleware already resolves.

    ProxyHeadersMiddleware (configured in main.py with trusted_proxy_ips) rewrites
    request.client.host to the originating IP from X-Forwarded-For, so we can trust it
    directly without re-parsing the raw header (which is spoofable by clients).
    """
    if request.client:
        return request.client.host
    return "unknown"


limiter = Limiter(key_func=get_client_ip)
