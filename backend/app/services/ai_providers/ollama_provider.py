import httpx
import logging
from typing import List, Dict, Any, Optional
from app.services.ai_providers.base import BaseAIProvider

logger = logging.getLogger(__name__)

class OllamaProvider(BaseAIProvider):
    """Local inference provider communicating with an Ollama instance."""

    def __init__(self, base_url: str = "http://127.0.0.1:11434", model: str = "gemma2:2b"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def _matches_model(self, candidate_name: str, target_name: str) -> bool:
        c = candidate_name.strip().lower()
        t = target_name.strip().lower()
        if c == t:
            return True
        if c == f"{t}:latest" or t == f"{c}:latest":
            return True
        c_base = c.split(":")[0]
        t_base = t.split(":")[0]
        return bool(c_base and c_base == t_base)

    async def check_health(self) -> Dict[str, Any]:
        """Safe health check to verify Ollama server reachable and model available."""
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return {
                        "provider": "ollama",
                        "available": False,
                        "model": self.model,
                        "error": f"http_status_{res.status_code}"
                    }
                data = res.json()
                models = data.get("models", [])
                installed_names = [m.get("name", "") for m in models if isinstance(m, dict)]
                
                model_found = any(self._matches_model(name, self.model) for name in installed_names)
                if model_found:
                    return {
                        "provider": "ollama",
                        "available": True,
                        "model": self.model
                    }
                else:
                    return {
                        "provider": "ollama",
                        "available": False,
                        "model": self.model,
                        "error": "model_not_installed"
                    }
        except httpx.ConnectError:
            return {
                "provider": "ollama",
                "available": False,
                "model": self.model,
                "error": "service_unavailable"
            }
        except Exception as e:
            logger.debug("Ollama health check failed: %s", e)
            return {
                "provider": "ollama",
                "available": False,
                "model": self.model,
                "error": "check_failed"
            }

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Call Ollama /api/chat endpoint with formatted conversation messages."""
        chat_url = f"{self.base_url}/api/chat"
        messages: List[Dict[str, str]] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        if history:
            for item in history:
                role = item.get("role", "user")
                # Normalize role
                if role not in ["system", "user", "assistant"]:
                    role = "user"
                messages.append({"role": role, "content": item.get("content", "")})

        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(chat_url, json=payload)
                
                if res.status_code == 404:
                    # Model not found or endpoint not found
                    err_body = res.text.lower()
                    if "model" in err_body:
                        raise RuntimeError("The configured local AI model is not installed. Please install the configured model and try again.")
                    raise RuntimeError("The configured local AI model is not installed. Please install the configured model and try again.")
                
                if res.status_code != 200:
                    logger.error("Ollama /api/chat error HTTP %s: %s", res.status_code, res.text)
                    raise RuntimeError(f"Local AI service returned error (HTTP {res.status_code}).")

                data = res.json()
                answer = data.get("message", {}).get("content", "")
                if not answer:
                    raise RuntimeError("Local AI service returned an empty response.")
                return answer

        except (httpx.ConnectError, httpx.ConnectTimeout):
            raise RuntimeError("Local AI service is not running. Please start Ollama and try again.")
        except httpx.ReadTimeout:
            raise RuntimeError("Local AI service took too long to respond. Please try again.")
        except RuntimeError:
            raise
        except Exception as e:
            logger.error("Unexpected error contacting Ollama: %s", e)
            raise RuntimeError("Local AI service is currently unavailable.")
