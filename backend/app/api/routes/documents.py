from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.app.api.schemas.documents import DocumentCreateResponse
from backend.app.api.schemas.common import ErrorResponse
from datetime import datetime  # Для имитации ответа

# Создаем роутер для документов
router = APIRouter(
    prefix="/documents",
    tags=["Documents"]  # Группировка в Swagger/OpenAPI
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
        file: UploadFile = File(..., description="Файл для суммаризации (doc, docx, txt, odt)"),
        title: str | None = None
):
    """
    Принимает файл, валидирует его, парсит текст и сохраняет метаданные. 

    Возвращает метаданные созданного документа. [cite: 8]
    """

    # --- TODO: Реальная бизнес-логика ---
    # Здесь будет вызов сервиса, который:
    # 1. Валидирует file.filename, file.content_type и file.size (<= 15MB) 
    #    (Пример: if file.size > 15 * 1024 * 1024: 
    #              raise HTTPException(400, detail="File too large", code="file_too_large"))
    #
    # 2. Вызывает DocumentParser (из infrastructure/files/document_parser.py)
    #    (Пример: parsed_text = await DocumentParser.parse(file.file))
    #
    # 3. Сохраняет DocumentModel в MongoDB (через Repository)
    #    (Пример: new_doc = DocumentModel(filename=file.filename, ...))
    #    (Пример: await new_doc.insert())
    # ---

    # Имитация успешного ответа (согласно схеме DocumentCreateResponse)
    # В реальном коде данные будут взяты из сохраненной new_doc

    print(f"File '{file.filename}' uploaded, size: {file.size}, title: {title}")

    return DocumentCreateResponse(
        id="64b7f0db4f1c2c3a9e2f1a9b",  # Это будет ID из Mongo
        filename=file.filename,
        mime_type=file.content_type,
        size_bytes=file.size,
        uploaded_at=datetime.utcnow(),
        parsed=True,
        parsed_preview="Первый абзац или первые 200 символов..."
    )