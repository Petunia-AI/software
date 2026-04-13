from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    agent_type: Optional[str] = None
    sentiment: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    business_id: str
    lead_id: Optional[str] = None
    channel: str
    status: str
    current_agent: Optional[str] = None
    message_count: Optional[int] = 0
    sentiment_score: Optional[float] = None
    is_human_takeover: Optional[bool] = False
    started_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    messages: Optional[List[MessageOut]] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: str
    channel: str = "webchat"
