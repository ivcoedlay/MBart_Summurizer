# backend/app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DSN (Data Source Name) для подключения к MongoDB
    MONGO_DSN: str = "mongodb://localhost:27017/summarizer_db"

    # Имя модели (важно для transformers)
    MODEL_NAME: str = "IlyaGusev/mbart_ru_sum_gazeta"

    class Config:
        # Это позволит Pydantic читать переменные из .env файла
        env_file = ".env"
        env_file_encoding = "utf-8"


# Создаем один экземпляр настроек для всего приложения
settings = Settings()