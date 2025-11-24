# backend/app/api/dependencies.py
from fastapi import Depends, Request
from backend.app.services.file_validation import FileValidator
from backend.app.infrastructure.files.document_parser import DocumentParser
from backend.app.infrastructure.summarization.mbart_gateway import SummarizationGateway

# Создаем по одному экземпляру на все приложение
# Они не хранят состояние, поэтому это безопасно
_file_validator = FileValidator()
_document_parser = DocumentParser()

def get_file_validator() -> FileValidator:
    """Возвращает singleton-экземпляр FileValidator."""
    return _file_validator

def get_document_parser() -> DocumentParser:
    """Возвращает singleton-экземпляр DocumentParser."""
    return _document_parser

def get_summarizer(request: Request) -> SummarizationGateway:
    """
    Возвращает экземпляр SummarizationGateway,
    который был загружен при старте в app.state.
    """
    return request.app.state.summarizer