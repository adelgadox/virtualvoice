"""
Mock optional heavy SDK dependencies so tests can run without installing them.
google-generativeai and anthropic are only needed inside Docker/CI.
"""
import sys
from unittest.mock import MagicMock

# Mock google.generativeai before any test imports app.core.llm.gemini
google_mock = MagicMock()
sys.modules.setdefault("google", google_mock)
sys.modules.setdefault("google.generativeai", google_mock)
sys.modules.setdefault("google.api_core", MagicMock())
sys.modules.setdefault("google.api_core.exceptions", MagicMock())

# Mock anthropic SDK
sys.modules.setdefault("anthropic", MagicMock())
