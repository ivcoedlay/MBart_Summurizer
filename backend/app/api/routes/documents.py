from fastapi import APIRouter, UploadFile, File, Depends, status, HTTPException
from backend.app.api.schemas.documents import DocumentCreateResponse, DocumentListResponse, DocumentListItem, DocumentDetailResponse
from backend.app.api.schemas.common import ErrorResponse
from datetime import datetime
from typing import Optional

# Сервисы и модели
from backend.app.services.file_validation import FileValidator
from backend.app.infrastructure.files.document_parser import DocumentParser
from backend.app.api.dependencies import get_file_validator, get_document_parser
from backend.app.infrastructure.database.models import DocumentModel, SummaryModel
from backend.app.core.errors import FileValidationException, DocumentParsingError


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


@router.post(
    "/",
    response_model=DocumentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Файл слишком большой или неверный формат"},
        415: {"model": ErrorResponse, "description": "Неподдерживаемый media type"}
    }
)
async def upload_document(
        file: UploadFile = File(...),
        title: str | None = None,
        validator: FileValidator = Depends(get_file_validator),
        parser: DocumentParser = Depends(get_document_parser)
):
    """
    Принимает файл, валидирует, парсит текст и сохраняет в БД.
    """

    # 1. Валидация (выбросит исключение, если ошибка)
    # Глобальный обработчик в main.py поймает его
    mime_type = await validator.validate(file)

    # 2. Парсинг (выбросит исключение, если ошибка)
    parsed_text = await parser.parse(file.file, mime_type)

    if not parsed_text:
        # Дополнительная проверка на пустой текст
        raise DocumentParsingError("Не удалось извлечь текст (файл пустой?)")

    # 3. Создание модели
    new_doc = DocumentModel(
        filename=file.filename,
        mime_type=mime_type,
        size_bytes=file.size,
        title=title,
        parsed=True,
        parsed_text=parsed_text
        # uploaded_at установится автоматически (default_factory)
    )

    # 4. Сохранение в БД
    await new_doc.insert()

    # 5. Формирование ответа
    # Генерируем превью
    preview = (parsed_text[:200] + '...') if len(parsed_text) > 200 else parsed_text

    return DocumentCreateResponse(
        id=str(new_doc.id),  # Преобразуем ObjectId в str
        filename=new_doc.filename,
        mime_type=new_doc.mime_type,
        size_bytes=new_doc.size_bytes,
        uploaded_at=new_doc.uploaded_at,
        parsed=new_doc.parsed,
        parsed_preview=preview
    )

# 1. Роут для получения списка документов (History)
@router.get(
    "/",
    response_model=DocumentListResponse,
    tags=["Documents"]
)
async def list_documents(limit: int = 10, offset: int = 0):
    """
    Получает список всех загруженных документов с пагинацией.
    """
    total = await DocumentModel.count()
    # Сортировка по дате загрузки (от новых к старым)
    docs = await DocumentModel.find_all(
        limit=limit,
        skip=offset,
        sort="-uploaded_at"
    ).to_list()

    items = [
        DocumentListItem(
            id=str(doc.id),
            filename=doc.filename,
            size_bytes=doc.size_bytes,
            uploaded_at=doc.uploaded_at,
            parsed=doc.parsed
        ) for doc in docs
    ]

    return DocumentListResponse(total=total, limit=limit, offset=offset, items=items)


# 2. Роут для получения деталей документа
@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    tags=["Documents"],
    responses={404: {"model": ErrorResponse, "description": "Документ не найден"}}
)
async def get_document_detail(document_id: str):
    """
    Получает детали документа, включая распарсенный текст.
    """
    doc = await DocumentModel.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Документ с ID '{document_id}' не найден."
        )

    # Приводим к схеме DocumentDetailResponse
    return DocumentDetailResponse(
        id=str(doc.id),
        filename=doc.filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        uploaded_at=doc.uploaded_at,
        parsed=doc.parsed,
        parsed_text=doc.parsed_text,
        storage_ref=doc.storage_ref
    )
