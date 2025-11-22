from fastapi import APIRouter, UploadFile, File, Depends, status
from backend.app.api.schemas.documents import DocumentCreateResponse
from backend.app.api.schemas.common import ErrorResponse
from datetime import datetime

# Сервисы и модели
from backend.app.services.file_validation import FileValidator
from backend.app.infrastructure.files.document_parser import DocumentParser
from backend.app.api.dependencies import get_file_validator, get_document_parser
from backend.app.infrastructure.database.models import DocumentModel
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