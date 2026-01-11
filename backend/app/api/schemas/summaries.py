from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class SummaryCreateRequest(BaseModel):
    document_id: Optional[str] = Field(None, example="64b7f0db4f1c2c3a9e2f1a9b")
    text: Optional[str] = Field(None, description="Raw text to summarize (used if document_id not provided)")
    max_length: Optional[int] = Field(256, ge=16, le=2048)
    min_length: Optional[int] = Field(32, ge=0, le=1024)
    method: Optional[str] = Field("mbart_ru_sum_gazeta")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "64b7f0db4f1c2c3a9e2f1a9b",
                "max_length": 256,
                "min_length": 32,
                "method": "mbart_ru_sum_gazeta"
            }
        }

class SummaryResponse(BaseModel):
    id: str
    document_id: Optional[str]
    method: str
    params: Dict[str, Any]
    summary_text: Optional[str]
    created_at: datetime
    status: str = Field(..., example="done")
    error_message: Optional[str] = None