"""
Fernet symmetric encryption for sensitive values stored in the DB.

Used to encrypt Meta Page Access Tokens at rest. The key must be a valid
32-byte URL-safe base64 key generated with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Grace-period fallback: if decryption fails (e.g. token was stored before
encryption was enabled), the raw value is returned as-is so existing accounts
keep working until they reconnect and get a freshly encrypted token.
"""
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)


def validate_encryption_key() -> None:
    """Validate TOKEN_ENCRYPTION_KEY at startup. Raises RuntimeError if missing or invalid."""
    key = settings.token_encryption_key
    if not key:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is not set. "
            "Generate one with: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    try:
        Fernet(key.encode())
    except Exception as exc:
        raise RuntimeError(f"TOKEN_ENCRYPTION_KEY is not a valid Fernet key: {exc}") from exc


def _fernet() -> Fernet:
    key = settings.token_encryption_key
    if not key:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is not configured — cannot encrypt/decrypt tokens")
    return Fernet(key.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext token for storage."""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(value: str) -> str:
    """Decrypt a stored token. Falls back to the raw value for pre-encryption tokens."""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        logger.debug("decrypt_token: value is not Fernet-encrypted, returning as-is (pre-migration token)")
        return value
