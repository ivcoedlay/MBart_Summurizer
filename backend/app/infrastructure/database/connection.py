from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.infrastructure.database.models import DocumentModel, SummaryModel


async def init_database(db_url: str, db_name: str):
    """
    Инициализирует подключение к MongoDB и Beanie.
    """
    print(f"Connecting to MongoDB: {db_url} (DB: {db_name})")
    client = AsyncIOMotorClient(db_url)
    database = client[db_name]  # Имя БД берется из DSN

    # Список всех ваших Beanie-моделей
    document_models = [
        DocumentModel,
        SummaryModel
    ]

    await init_beanie(
        database=database,
        document_models=document_models
    )
    print("Beanie initialization complete.")