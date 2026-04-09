from pydantic import BaseModel
from typing import List, Optional


class DashboardStats(BaseModel):
    total_conversations: int
    active_conversations: int
    total_leads: int
    qualified_leads: int
    closed_won: int
    conversion_rate: float
    avg_qualification_score: float
    conversations_by_channel: dict
    leads_by_stage: dict


class ConversationStats(BaseModel):
    date: str
    count: int
    qualified: int
    closed: int
