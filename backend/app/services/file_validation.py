import magic
from fastapi import UploadFile
from backend.app.core.errors import FileTooLargeError, UnsupportedFormatError

# Максимальный размер файла 15 МБ
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

# Разрешенные MIME-типы
# (ключ - MIME-тип, значение - расширение для логов)
ALLOWED_MIMETYPES = {
    "text/plain": ".txt",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class FileValidator:
    """
    Сервис для валидации загружаемых файлов (размер, тип).
    """

    def __init__(self, max_size: int = MAX_FILE_SIZE_BYTES, allowed_types: dict = None):
        self.max_size = max_size
        self.allowed_types = allowed_types or ALLOWED_MIMETYPES

    async def validate(self, file: UploadFile) -> str:
        """
        Проверяет файл. В случае успеха возвращает определенный MIME-тип.
        В случае неудачи - выбрасывает FileTooLargeError или UnsupportedFormatError.
        """

        # 1. Проверка размера
        # Мы доверяем `file.size`, т.к. это самый быстрый способ.
        # FastAPI/Starlette получает его из заголовка Content-Length.
        if file.size > self.max_size:
            raise FileTooLargeError(
                f"Файл превышает {self.max_size // 1024 // 1024}MB. "
            )

        # 2. Проверка MIME-типа с помощью python-magic
        # Читаем первые 2KB, чтобы определить тип, не загружая весь файл в память
        contents = await file.read(2048)
        # !! Важно: сбрасываем указатель файла в начало
        await file.seek(0)

        detected_mime = magic.from_buffer(contents, mime=True)

        # 3. Сверяем с разрешенными типами
        if detected_mime not in self.allowed_types:
            # Дополнительная проверка по расширению файла (менее надежно)
            ext = "." + file.filename.split(".")[-1].lower()
            if ext not in self.allowed_types.values():
                raise UnsupportedFormatError(
                    f"Формат файла '{file.filename}' ({detected_mime}) не поддерживается. "
                    f"Разрешены: {list(self.allowed_types.values())}. [cite: 8]"
                )

        # Особая (временная) обработка .doc
        if detected_mime == "application/msword":
            print(f"Warning: .doc ({file.filename}) detected. Parsing may fail. Recommending .docx.")
            # raise UnsupportedFormatError(
            #     "Формат .doc не поддерживается. Пожалуйста, сохраните файл как .docx."
            # )

        return detected_mime