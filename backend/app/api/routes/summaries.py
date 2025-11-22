# backend/app/api/routes/summaries.py
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.api.schemas.summaries import SummaryCreateRequest, SummaryResponse
from backend.app.api.schemas.common import ErrorResponse

# Сервисы и модели
from backend.app.infrastructure.database.models import DocumentModel, SummaryModel
from backend.app.infrastructure.summarization.mbart_gateway import SummarizationGateway
from backend.app.api.dependencies import get_summarizer
from backend.app.core.errors import SummarizationError

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
async def create_summary(
        body: SummaryCreateRequest,
        summarizer: SummarizationGateway = Depends(get_summarizer)
):
    """
    Создаёт (синхронно) суммаризацию для документа.
    """

    text_to_summarize = ""

    # 1. Получаем текст
    if body.document_id:
        doc = await DocumentModel.get(body.document_id)
        if not doc or not doc.parsed_text:
            # Используем HTTPException, т.к. это не наша кастомная ошибка
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Документ не найден или еще не обработан.",
            )
        text_to_summarize = doc.parsed_text

    elif body.text:
        text_to_summarize = body.text

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Необходимо предоставить 'document_id' или 'text'.",
        )

    # 2. Вызов модели (выбросит SummarizationError в случае сбоя)
    # Глобальный обработчик его поймает
    summary_text = await summarizer.summarize(
        text=text_to_summarize,
        min_length=body.min_length,
        max_length=body.max_length
    )

    # 3. Сохранение результата
    new_summary = SummaryModel(
        document_id=body.document_id,  # Сохраняем ID, если он был
        method=body.method,
        params={"min_length": body.min_length, "max_length": body.max_length},
        summary_text=summary_text,
        status="done"
    )
    await new_summary.insert()

    # 4. Ответ
    return SummaryResponse(
        id=str(new_summary.id),
        document_id=new_summary.document_id,
        method=new_summary.method,
        params=new_summary.params,
        summary_text=new_summary.summary_text,
        created_at=new_summary.created_at,
        status=new_summary.status
    )