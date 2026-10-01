from app.core.config import settings
from app.services.ai_providers.base import BaseAIProvider
from app.services.ai_providers.ollama_provider import OllamaProvider
from app.services.ai_providers.gemini_provider import GeminiProvider

def get_ai_provider() -> BaseAIProvider:
    """Return the configured AI provider based on application settings."""
    provider_name = (settings.AI_PROVIDER or "gemini").strip().lower()

    if provider_name in ["gemini", "free", "cloud", "google"]:
        return GeminiProvider(
            api_key=settings.AI_API_KEY or settings.GEMINI_API_KEY,
            model=settings.AI_MODEL or settings.GEMINI_MODEL or "gemini-3.5-flash-lite",
        )
    elif provider_name == "ollama":
        return OllamaProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
        )
    else:
        # If API key is present, default to Gemini Cloud provider, else Ollama
        if settings.AI_API_KEY or settings.GEMINI_API_KEY:
            return GeminiProvider(
                api_key=settings.AI_API_KEY or settings.GEMINI_API_KEY,
                model=settings.AI_MODEL or settings.GEMINI_MODEL or "gemini-3.5-flash-lite",
            )
        return OllamaProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
        )
