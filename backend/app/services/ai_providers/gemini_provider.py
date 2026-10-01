import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base import BaseAIProvider

logger = logging.getLogger(__name__)

class GeminiProvider(BaseAIProvider):
    """Google Gemini Free-Tier Cloud AI Provider."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-3.5-flash-lite"):
        self.api_key = api_key
        self.model = model or "gemini-3.5-flash-lite"
        # Fallback candidates for free-tier resilience during demand spikes
        self.fallback_models = ["gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"]

    async def check_health(self) -> Dict[str, Any]:
        """Safe health check without exposing API key secrets."""
        if not self.api_key:
            return {
                "provider": "gemini",
                "available": False,
                "model": self.model,
                "error": "api_key_not_configured"
            }
        return {
            "provider": "gemini",
            "available": True,
            "model": self.model
        }

    async def generate_response(
        self,
        system_prompt: str = "",
        user_prompt: str = "",
        history: Optional[List[Dict[str, str]]] = None,
        user_message: Optional[str] = None,
        **kwargs
    ) -> str:
        user_prompt = user_prompt or user_message or ""
        if not self.api_key:
            raise RuntimeError("The AI service is temporarily unavailable. Please configure the AI API key.")

        from google import genai
        from google.genai import errors as genai_errors
        from google.genai import types

        prompt = ""
        if system_prompt:
            prompt += f"{system_prompt}\n\n"
        if history:
            history_text = "\n".join([f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}" for msg in history[-5:]])
            prompt += f"Recent Conversation:\n{history_text}\n\n"
        prompt += f"User Question: {user_prompt}"

        # Clean AFC configuration
        gen_config = types.GenerateContentConfig(
            temperature=0.3,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
        )

        client = genai.Client(api_key=self.api_key)

        models_to_try = [self.model] + [m for m in self.fallback_models if m != self.model]

        last_error = None
        for current_model in models_to_try:
            try:
                response = await client.aio.models.generate_content(
                    model=current_model,
                    contents=prompt,
                    config=gen_config
                )
                answer_text = response.text
                if answer_text and answer_text.strip():
                    return answer_text.strip()
            except genai_errors.APIError as exc:
                last_error = exc
                status_code = getattr(exc, "code", None)
                if status_code == 404:
                    logger.warning("Gemini model %s returned 404, trying next candidate...", current_model)
                    continue
                elif status_code == 503:
                    logger.warning("Gemini model %s returned 503 (high demand), trying next candidate...", current_model)
                    continue
                elif status_code == 429:
                    raise RuntimeError("The AI service has reached its current free usage limit. Please try again later.")
                elif status_code == 401:
                    raise RuntimeError("The AI service authentication failed.")
                elif status_code == 400:
                    raise RuntimeError("The AI request could not be processed.")
                else:
                    logger.error("Gemini API error (HTTP %s): %s", status_code, exc)
                    raise RuntimeError("The AI service is temporarily unavailable. Please try again shortly.")
            except Exception as e:
                last_error = e
                logger.warning("Error generating with %s: %s, trying next candidate...", current_model, type(e).__name__)
                continue

        # If all candidates failed
        if last_error:
            status_code = getattr(last_error, "code", None)
            if status_code == 404:
                raise RuntimeError("The configured AI model is currently unavailable.")
            elif status_code == 429:
                raise RuntimeError("The AI service has reached its current free usage limit. Please try again later.")
            elif status_code == 503:
                raise RuntimeError("The AI service is temporarily unavailable. Please try again shortly.")
            elif status_code == 401:
                raise RuntimeError("The AI service authentication failed.")
            elif status_code == 400:
                raise RuntimeError("The AI request could not be processed.")
            
            # Check for network/timeout errors
            err_name = type(last_error).__name__
            if "ConnectError" in err_name or "Timeout" in err_name or "ConnectionError" in err_name:
                raise RuntimeError("The AI service could not be reached right now.")

            # Log other unhandled safe exception types here if needed (without secrets)
            logger.error(f"AI provider error: {status_code or '500'} {err_name}")
            
        raise RuntimeError("The AI service is temporarily unavailable. Please try again shortly.")
