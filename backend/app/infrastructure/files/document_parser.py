import asyncio
from typing import IO
import docx  # Для .docx
from odf.opendocument import load as load_odt
from odf.text import P
from odf import teletype
from backend.app.core.errors import DocumentParsingError, UnsupportedFormatError


class DocumentParser:
    """
    Извлекает сырой текст из разных форматов файлов.
    """

    async def parse(self, file_stream: IO, mime_type: str) -> str:
        """
        Главный метод, который запускает парсинг в отдельном потоке,
        чтобы не блокировать основной (асинхронный) event loop.
        """
        try:
            loop = asyncio.get_running_loop()

            if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                # .docx [cite: 8]
                text = await loop.run_in_executor(None, self._parse_docx, file_stream)
            elif mime_type == "application/vnd.oasis.opendocument.text":
                # .odt [cite: 8]
                text = await loop.run_in_executor(None, self._parse_odt, file_stream)
            elif mime_type == "text/plain":
                # .txt [cite: 8]
                text = await loop.run_in_executor(None, self._parse_txt, file_stream)
            elif mime_type == "application/msword":
                # .doc [cite: 8]
                raise UnsupportedFormatError(
                    "Парсинг старого формата .doc не поддерживается. "
                    "Пожалуйста, сохраните файл в .docx или .txt."
                )
            else:
                raise UnsupportedFormatError(f"Неизвестный MIME-тип для парсинга: {mime_type}")

            return text

        except Exception as e:
            # Ловим любые ошибки парсинга (битые файлы, ошибки библиотек)
            print(f"Error parsing file: {e}")
            raise DocumentParsingError(f"Не удалось извлечь текст из файла: {e}")

    def _parse_docx(self, file_stream: IO) -> str:
        """Синхронный парсер для .docx"""
        doc = docx.Document(file_stream)
        paragraphs = [para.text for para in doc.paragraphs]
        return "\n".join(paragraphs)

    def _parse_odt(self, file_stream: IO) -> str:
        """Синхронный парсер для .odt (используя odfpy)"""
        doc = load_odt(file_stream)
        text_nodes = []
        for para in doc.getElementsByType(P):
            text_nodes.append(teletype.extractText(para))
        return "\n".join(text_nodes)

    def _parse_txt(self, file_stream: IO) -> str:
        """Синхронный парсер для .txt"""
        try:
            return file_stream.read().decode("utf-8")
        except UnicodeDecodeError:
            file_stream.seek(0)  # Возвращаемся в начало
            # Пробуем другую кодировку, если utf-8 не удалась
            return file_stream.read().decode("cp1251", errors="replace")