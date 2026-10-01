import time
from collections import defaultdict, deque
import threading
from typing import Tuple, Optional

class UserRateLimiter:
    """Sliding-window per-user rate limiter to protect free-tier cloud quotas."""

    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._user_requests = defaultdict(deque)
        self._lock = threading.Lock()

    def check_rate_limit(self, user_id: str) -> Tuple[bool, Optional[str]]:
        now = time.time()
        with self._lock:
            user_deque = self._user_requests[user_id]
            
            # Evict timestamps older than the sliding window
            cutoff = now - self.window_seconds
            while user_deque and user_deque[0] < cutoff:
                user_deque.popleft()

            if len(user_deque) >= self.max_requests:
                return False, "The AI service has reached its current free usage limit. Please try again later."

            user_deque.append(now)
            return True, None

    def reset(self, user_id: Optional[str] = None):
        with self._lock:
            if user_id:
                self._user_requests.pop(user_id, None)
            else:
                self._user_requests.clear()

user_rate_limiter = UserRateLimiter(max_requests=20, window_seconds=60)
