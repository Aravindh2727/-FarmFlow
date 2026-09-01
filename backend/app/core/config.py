from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017/farmflow"
    DATABASE_NAME: str = "farmflow"
    SECRET_KEY: str = "super-secret-key-change-me"
    JWT_SECRET: Optional[str] = None
    ALGORITHM: str = "HS256"
    JWT_ALGORITHM: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    model_config = SettingsConfigDict(
        env_file=".env",
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
        if self.JWT_ALGORITHM:
            self.ALGORITHM = self.JWT_ALGORITHM.strip().replace("\r", "").replace("\n", "").strip('"\'')
        if self.ALGORITHM:
            self.ALGORITHM = self.ALGORITHM.strip().replace("\r", "").replace("\n", "").strip('"\'')
        return self

settings = Settings()
