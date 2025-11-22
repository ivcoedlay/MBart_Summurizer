from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class DocumentCreateResponse(BaseModel):
    id: str = Field(..., example="64b7f0db4f1c2c3a9e2f1a9b")
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: datetime
    parsed: bool
    parsed_preview: Optional[str] = Field(None, description="Первые ~200 символов parsed_text")

class DocumentListItem(BaseModel):
    id: str
    filename: str
    size_bytes: int
    uploaded_at: datetime
    parsed: bool

class DocumentListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[DocumentListItem]

class DocumentDetailResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: datetime
    parsed: bool
    parsed_text: Optional[str] = None
    storage_ref: Optional[str] = None
