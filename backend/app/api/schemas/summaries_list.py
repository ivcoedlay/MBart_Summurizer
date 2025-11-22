from pydantic import BaseModel
from typing import List
from datetime import datetime # Примечание: в спеке created_at был str, но datetime логичнее

class SummaryListItem(BaseModel):
    id: str
    method: str
    created_at: datetime # Изменено с str для консистентности
    status: str
    summary_preview: str

class SummaryListResponse(BaseModel):
    total: int
    items: List[SummaryListItem]