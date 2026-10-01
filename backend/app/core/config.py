from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from dotenv import load_dotenv

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

# Load .env files if present into environment as fallback
for env_path in [ROOT_DIR / ".env", BACKEND_DIR / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017/farmflow"
    DATABASE_NAME: str = "farmflow"
    SECRET_KEY: Optional[str] = None
    JWT_SECRET: Optional[str] = None
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-3.5-flash-lite"
    AI_API_KEY: Optional[str] = None
    AI_BASE_URL: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: Optional[str] = "gemini-3.5-flash-lite"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "gemma2:2b"

    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(BACKEND_DIR / ".env"),
            ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def sync_and_clean_settings(self):
        if self.MONGODB_URL:
            self.MONGODB_URL = self.MONGODB_URL.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.DATABASE_NAME:
            self.DATABASE_NAME = self.DATABASE_NAME.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.JWT_SECRET:
            self.SECRET_KEY = self.JWT_SECRET.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.SECRET_KEY:
            self.SECRET_KEY = self.SECRET_KEY.strip().replace("\r", "").replace("\n", "").strip('"\'')
        
        if not self.SECRET_KEY:
            raise ValueError("JWT_SECRET or SECRET_KEY environment variable is mandatory for security.")
        if self.JWT_ALGORITHM:
            self.ALGORITHM = self.JWT_ALGORITHM.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.ALGORITHM:
            self.ALGORITHM = self.ALGORITHM.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.AI_PROVIDER:
            self.AI_PROVIDER = self.AI_PROVIDER.strip().replace("\r", "").replace("\n", "").strip('"\'').lower()
        if self.AI_API_KEY:
            self.AI_API_KEY = self.AI_API_KEY.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.GEMINI_API_KEY:
            self.GEMINI_API_KEY = self.GEMINI_API_KEY.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if not self.GEMINI_API_KEY and self.AI_API_KEY:
            self.GEMINI_API_KEY = self.AI_API_KEY
        if not self.AI_API_KEY and self.GEMINI_API_KEY:
            self.AI_API_KEY = self.GEMINI_API_KEY
        if self.AI_MODEL:
            self.AI_MODEL = self.AI_MODEL.strip().replace("\r", "").replace("\n", "").strip('"\'')
            self.GEMINI_MODEL = self.AI_MODEL
        elif self.GEMINI_MODEL:
            self.GEMINI_MODEL = self.GEMINI_MODEL.strip().replace("\r", "").replace("\n", "").strip('"\'')
            self.AI_MODEL = self.GEMINI_MODEL
        if self.OLLAMA_BASE_URL:
            self.OLLAMA_BASE_URL = self.OLLAMA_BASE_URL.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.OLLAMA_MODEL:
            self.OLLAMA_MODEL = self.OLLAMA_MODEL.strip().replace("\r", "").replace("\n", "").strip('"\'')
        return self

settings = Settings()
