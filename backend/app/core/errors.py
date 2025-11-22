"""
Определение кастомных исключений (ошибок) приложения.
"""

class AppBaseException(Exception):
    """Базовый класс для всех кастомных исключений этого приложения."""
    def __init__(self, detail: str, code: str):
        self.detail = detail
        self.code = code
        super().__init__(detail)

# --- Ошибки валидации файлов ---

class FileValidationException(AppBaseException):
    """Базовая ошибка валидации файла."""
    def __init__(self, detail: str, code: str = "file_validation_error"):
        super().__init__(detail, code)

class FileTooLargeError(FileValidationException):
    """Файл превышает допустимый размер."""
    def __init__(self, detail: str):
        super().__init__(detail, code="file_too_large") # [cite: 8]

class UnsupportedFormatError(FileValidationException):
    """Формат файла не поддерживается."""
    def __init__(self, detail: str):
        super().__init__(detail, code="unsupported_format") # [cite: 8]

# --- Ошибки обработки ---

class DocumentParsingError(AppBaseException):
    """Ошибка при извлечении текста из файла."""
    def __init__(self, detail: str):
        super().__init__(detail, code="document_parsing_error")

class SummarizationError(AppBaseException):
    """Ошибка при генерации суммаризации."""
    def __init__(self, detail: str):
        super().__init__(detail, code="summarization_error") # [cite: 12]