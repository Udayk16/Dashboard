import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database settings
    database_url: str = "postgresql+psycopg://postgres:password@localhost:5432/analytics_db"

    # API settings
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"

    # Groq API settings
    groq_api_key: Optional[str] = None
    groq_model: str = "mixtral-8x7b-32768"

    # CORS settings
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-app.vercel.app",
    ]

    # Settings for Vanna AI
    max_query_results: int = 1000
    query_timeout: int = 30
    enable_sql_validation: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()