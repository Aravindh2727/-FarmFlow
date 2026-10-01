from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseAIProvider(ABC):
    """Abstract Base Class for AgriFlow AI providers."""

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Generate an AI response from system prompt, user prompt, and chat history."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Perform a safe health check without exposing secrets."""
        pass
