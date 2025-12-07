# backend/app/infrastructure/summarization/mbart_gateway.py
import asyncio
import logging
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from backend.app.core.errors import SummarizationError

log = logging.getLogger(__name__)

class SummarizationGateway:
    """
    Обёртка для загрузки модели и выполнения инференса (суммаризации).
    """

    def __init__(self, model_name: str):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        log.info(f"Using device: {self.device}")  # <-- Изменить print на log.info

        try:
            log.info(f"Loading tokenizer '{model_name}'...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            log.info(f"Loading model '{model_name}' to {self.device}...")
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
            log.info("Model and tokenizer loaded.")
        except Exception as e:
            log.error(f"Failed to load model '{model_name}': {e}")  # <-- Добавить лог
            raise RuntimeError(f"Failed to load model '{model_name}': {e}")

    def _blocking_summarize(
            self,
            text: str,
            min_length: int,
            max_length: int
    ) -> str:
        """
        Синхронная (блокирующая) функция инференса.
        """
        try:
            # 1. Токенизация
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding="max_length",
                truncation=True,
                max_length=1024  # Ограничение на вход mbart
            ).to(self.device)

            # 2. Генерация
            summary_ids = self.model.generate(
                inputs["input_ids"],
                num_beams=4,
                min_length=min_length,
                max_length=max_length,
                early_stopping=True,
            )

            # 3. Декодирование
            summary = self.tokenizer.decode(
                summary_ids[0],
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False
            )
            return summary
        except Exception as e:
            # Ловим ошибки на уровне инференса
            print(f"Error during model inference: {e}")
            raise SummarizationError(f"Ошибка модели: {e}")

    async def summarize(
            self,
            text: str,
            min_length: int,
            max_length: int
    ) -> str:
        """
        Асинхронный вызов, запускающий блокирующую
        функцию инференса в отдельном потоке.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,  # Использует ThreadPoolExecutor по умолчанию
            self._blocking_summarize,
            text,
            min_length,
            max_length
        )