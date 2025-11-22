from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    uptime: Optional[str]

class ErrorResponse(BaseModel):
    detail: str
    code: str

# Helper: string id (Mongo ObjectId as hex)
class IDModel(BaseModel):
    id: str = Field(..., examples=["64b7f0db4f1c2c3a9e2f1a9b"])