# backend/app/main.py
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.schemas.common import HealthResponse, ErrorResponse
from backend.app.api.routes import documents, summaries
from backend.app.config import settings  # Импорт настроек
from backend.app.infrastructure.database.connection import init_database  # Импорт
from backend.app.core.errors import AppBaseException  # Импорт
from backend.app.infrastructure.summarization.mbart_gateway import SummarizationGateway

# --- Настройка логирования ---
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Обработчик событий жизненного цикла приложения.
    """
    # Код на этапе запуска приложения
    # 1. Подключение к БД
    # Разделяем DSN на URL и имя БД
    mongo_url = settings.MONGO_DSN
    db_name = settings.MONGO_DSN.split("/")[-1].split("?")[0]
    await init_database(mongo_url, db_name)

    log.info("Loading summarization model...")
    app.state.summarizer = SummarizationGateway(model_name=settings.MODEL_NAME)
    log.info("Model loaded successfully.")

    yield

    # Код на этапе завершения работы приложения
    log.info("Shutting down application...")
    # Очистка ресурсов, если необходимо
    if hasattr(app.state, "summarizer"):
        del app.state.summarizer


app = FastAPI(
    title="AI Document Summarizer",
    version="0.1.0",
    description="API для загрузки документов и их суммаризации (модель mbart_ru_sum_gazeta)",
    lifespan=lifespan  # Используем новый обработчик жизненного цикла
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Глобальный обработчик кастомных ошибок ---
@app.exception_handler(AppBaseException)
async def app_exception_handler(request: Request, exc: AppBaseException):
    """
    Перехватывает наши кастомные ошибки (FileTooLargeError, etc.)
    и возвращает стандартизированный ErrorResponse.
    """
    # По умолчанию код 400, но можно расширить логику,
    # анализируя exc.code, если нужны другие статусы (404, 500)
    status_code = status.HTTP_400_BAD_REQUEST
    if exc.code == "document_not_found":
        status_code = status.HTTP_404_NOT_FOUND
    elif exc.code == "summarization_error":
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(detail=exc.detail, code=exc.code).model_dump()
    )


# --- Системный эндпоинт ---
@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return {"status": "ok", "uptime": "PT0M1S"}


# --- Подключение API-роутеров ---
app.include_router(documents.router)
app.include_router(summaries.router)