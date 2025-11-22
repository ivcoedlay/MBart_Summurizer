from fastapi import FastAPI
from backend.app.api.schemas.common import HealthResponse
from backend.app.api.routes import documents, summaries # Импорт наших роутеров

# (TODO: Позже здесь будет инициализация настроек из config.py)

app = FastAPI(
    title="AI Document Summarizer",
    version="0.1.0",
    description="API для загрузки документов и их суммаризации (модель mbart_ru_sum_gazeta)"
)

# --- Системный эндпоинт ---

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"]
)
def health_check():
    """
    Проверка работоспособности сервиса. [cite: 6]
    """
    return {"status": "ok", "uptime": "PT0M1S"} # [cite: 6]


# --- Подключение API-роутеров ---

# Подключаем роутер из app/api/routes/documents.py
app.include_router(documents.router)

# Подключаем роутер из app/api/routes/summaries.py
app.include_router(summaries.router)


# --- (TODO) Обработчики жизненного цикла ---

# @app.on_event("startup")
# async def startup_event():
#     # Здесь будет инициализация клиента к MongoDB (Beanie / Motor)
#     # (Пример: await init_database())
#     pass

# @app.on_event("shutdown")
# async def shutdown_event():
#     # Здесь будет закрытие соединений
#     pass