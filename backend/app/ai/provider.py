"""
Vihara AI — provider.py
=======================
This module is now a thin compatibility shim.
All logic lives in app.ai.hf_provider (HuggingFaceProvider).

Existing imports across the codebase (ai_provider, AIProvider, etc.)
continue to work without changes to routers or services.
"""
from app.ai.hf_provider import HuggingFaceProvider, ai_provider  # noqa: F401

# Legacy alias so any `from app.ai.provider import AIProvider` still works
AIProvider = HuggingFaceProvider

__all__ = ["ai_provider", "AIProvider", "HuggingFaceProvider"]
