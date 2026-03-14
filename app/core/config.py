import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "TaskAPI"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "changeme-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./taskapi.db")
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:8000").split(",")


settings = Settings()
