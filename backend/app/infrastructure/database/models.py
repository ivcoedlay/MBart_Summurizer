# app/infrastructure/database/models.py
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict, Any


class DocumentModel(Document):
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    parsed: bool = False
    parsed_text: Optional[str] = None
    storage_ref: Optional[str] = None  # если используете GridFS/S3
    title: Optional[str] = None

    class Settings:
        name = "documents"
        indexes = [
            "uploaded_at",
            [("filename", 1)]
        ]


class SummaryModel(Document):
    document_id: Optional[str] = None  # ObjectId as string or DBRef if you prefer
    method: str = "mbart_ru_sum_gazeta"
    params: Dict[str, Any] = Field(default_factory=dict)
    summary_text: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field("done")  # queued|running|done|failed
    error_message: Optional[str] = None

    class Settings:
        name = "summaries"
        indexes = [
            [("document_id", 1)],
            [("created_at", -1)]
        ]