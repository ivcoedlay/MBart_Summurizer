# backend/app/api/routes/summaries.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks  # << BackgroundTasks - НОВЫЙ ИМПОРТ
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


# --- НОВАЯ ФУНКЦИЯ: Блокирующая задача (имитация воркера) ---
async def run_summarization_task(
    summary_id: str,
    text_to_summarize: str,
    min_length: int,
    max_length: int,
    summarizer: SummarizationGateway,
):
    """
    Выполняет суммаризацию и обновляет модель в БД. Запускается в фоне.
    """
    summary_model = await SummaryModel.get(summary_id)
    if not summary_model:
        return  # Задача недействительна

    # Устанавливаем статус "running"
    await summary_model.set({"status": "running"})

    try:
        # 1. Вызов модели (блокирующий, запускается в потоке)
        summary_text = await summarizer.summarize(
            text=text_to_summarize,
            min_length=min_length,
            max_length=max_length
        )

        # 2. Обновление результата
        await summary_model.set({
            "summary_text": summary_text,
            "status": "done"
        })
    except Exception as e:
        # Устанавливаем статус "failed" при ошибке
        await summary_model.set({
            "status": "failed",
            "error_message": f"Summarization failed: {e}"
        })


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
        summarizer: SummarizationGateway = Depends(get_summarizer),
        background_tasks: BackgroundTasks = Depends(),  # << НОВЫЙ ПАРАМЕТР
):
    """
    Создаёт запись о суммарзиации и запускает задачу в фоне.
    """

    text_to_summarize = ""

    # 1. Получаем текст
    if body.document_id:
        doc = await DocumentModel.get(body.document_id)
        if not doc or not doc.parsed_text:
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

    # 2. Создание модели со статусом "queued"
    new_summary = SummaryModel(
        document_id=body.document_id,
        method=body.method,
        params={"min_length": body.min_length, "max_length": body.max_length},
        summary_text=None,  # Еще нет результата
        status="queued"
    )
    await new_summary.insert()

    # 3. Запуск фоновой задачи
    background_tasks.add_task(
        run_summarization_task,
        summary_id=str(new_summary.id),
        text_to_summarize=text_to_summarize,
        min_length=body.min_length,
        max_length=body.max_length,
        summarizer=summarizer
    )

    # 4. Ответ (немедленный)
    return SummaryResponse(
        id=str(new_summary.id),
        document_id=new_summary.document_id,
        method=new_summary.method,
        params=new_summary.params,
        summary_text=new_summary.summary_text,
        created_at=new_summary.created_at,
        status=new_summary.status
    )


# --- НОВЫЙ РОУТ: Проверка статуса и получение результата ---
@router.get(
    "/{summary_id}",
    response_model=SummaryResponse,
    tags=["Summaries"],
    responses={404: {"model": ErrorResponse, "description": "Суммаризация не найдена"}}
)
async def get_summary_detail(summary_id: str):
    """
    Получает статус и результат суммаризации.
    """
    summary = await SummaryModel.get(summary_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Суммаризация с ID '{summary_id}' не найдена."
        )
    return SummaryResponse(
        id=str(summary.id),
        document_id=summary.document_id,
        method=summary.method,
        params=summary.params,
        summary_text=summary.summary_text,
        created_at=summary.created_at,
        status=summary.status
    )