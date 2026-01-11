import os
import logging
from celery import Celery
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from backend.app.infrastructure.database.models import SummaryModel
from backend.app.core.errors import SummarizationError
from backend.app.config import settings

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация Celery
celery_app = Celery(
    "summarizer",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
)

# Конфигурация Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "summarization_task": {"queue": "summarization"},
    },
    worker_prefetch_multiplier=1,  # Важно для GPU-задач
    worker_max_tasks_per_child=10,  # Перезагрузка воркера после 10 задач для освобождения памяти
)


class Summarizer:
    """Singleton класс для загрузки и использования модели суммаризации"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Summarizer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading summarization model on device: {self.device}")

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(settings.MODEL_NAME)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(settings.MODEL_NAME).to(self.device)
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Failed to load model: {e}")

        self._initialized = True

    def summarize(self, text: str, min_length: int, max_length: int) -> str:
        """Генерирует суммаризацию текста"""
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=1024
            ).to(self.device)

            summary_ids = self.model.generate(
                inputs["input_ids"],
                num_beams=4,
                min_length=min_length,
                max_length=max_length,
                early_stopping=True,
            )

            summary = self.tokenizer.decode(
                summary_ids[0],
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False
            )

            return summary
        except Exception as e:
            logger.error(f"Error during summarization: {e}")
            raise SummarizationError(f"Ошибка модели: {e}")


# Глобальный экземпляр суммаризатора
summarizer = None


@celery_app.task(bind=True, name="summarization_task")
def summarization_task(self, summary_id: str, text: str, min_length: int, max_length: int):
    """Celery задача для асинхронной суммаризации"""
    global summarizer

    logger.info(f"Starting summarization task for summary_id: {summary_id}")

    try:
        # Инициализация суммаризатора при первом вызове задачи
        if summarizer is None:
            summarizer = Summarizer()

        # Получение записи из БД
        summary = SummaryModel.get(summary_id)
        if not summary:
            logger.error(f"Summary with ID {summary_id} not found")
            return {"status": "failed", "error": "Summary not found"}

        # Обновление статуса на "running"
        summary.status = "running"
        summary.save()

        # Генерация суммаризации
        result = summarizer.summarize(text, min_length, max_length)

        # Сохранение результата
        summary.summary_text = result
        summary.status = "done"
        summary.save()

        logger.info(f"Summarization completed successfully for ID: {summary_id}")
        return {"status": "done", "summary_id": summary_id}

    except Exception as e:
        logger.error(f"Summarization failed for ID {summary_id}: {str(e)}")
        try:
            summary = SummaryModel.get(summary_id)
            if summary:
                summary.status = "failed"
                summary.error_message = str(e)
                summary.save()
        except:
            pass

        raise self.retry(exc=e, countdown=30, max_retries=3)