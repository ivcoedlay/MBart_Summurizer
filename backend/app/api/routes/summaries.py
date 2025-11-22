from fastapi import APIRouter, HTTPException, status
from backend.app.api.schemas.summaries import SummaryCreateRequest, SummaryResponse
from backend.app.api.schemas.common import ErrorResponse
from datetime import datetime  # Для имитации ответа

router = APIRouter(
    prefix="/summaries",
    tags=["Summaries"]
)


@router.post(
    "/",
    response_model=SummaryResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"model": ErrorResponse, "description": "Документ не найден"},
        400: {"model": ErrorResponse, "description": "Невалидные параметры запроса"},
        500: {"model": ErrorResponse, "description": "Ошибка в процессе суммаризации"}
    }
)
async def create_summary(body: SummaryCreateRequest):
    """
    Создаёт (синхронно) суммаризацию для документа
    по document_id или по сырому тексту.
    """

    text_to_summarize = ""

    # --- TODO: Реальная бизнес-логика ---
    # 1. Проверить body. Если есть document_id:
    #    (Пример: doc = await DocumentModel.get(body.document_id))
    #    (Пример: if not doc or not doc.parsed_text:
    #               raise HTTPException(404, detail="Document not found or not parsed", code="document_not_found"))
    #    (Пример: text_to_summarize = doc.parsed_text)
    #
    # 2. Если нет document_id, но есть body.text:
    #    (Пример: text_to_summarize = body.text)
    #
    # 3. Если нет ни того, ни другого:
    #    (Пример: raise HTTPException(400, detail="document_id or text is required", code="invalid_params"))
    #
    # 4. Вызвать сервис суммаризации (mbart_gateway)
    #    (Пример: summary_text = await SummarizationService.summarize(text_to_summarize, ...))
    #
    # 5. Сохранить SummaryModel в MongoDB
    #    (Пример: new_summary = SummaryModel(document_id=body.document_id, summary_text=summary_text, ...))
    #    (Пример: await new_summary.insert())
    # ---

    print(f"Summarizing doc: {body.document_id}, params: {body.max_length}/{body.min_length}")

    # Имитация успешного ответа (согласно схеме SummaryResponse)
    # В реальном коде данные будут взяты из new_summary

    return SummaryResponse(
        id="64b7f2aa4f1c2c3a9e2f1b00",  # Это будет ID из Mongo
        document_id=body.document_id,
        method=body.method,
        params={"max_length": body.max_length, "min_length": body.min_length},
        summary_text="Это пример краткого содержания документа, сгенерированный моделью.",
        created_at=datetime.utcnow(),
        status="done"
    )