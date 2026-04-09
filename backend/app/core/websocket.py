"""
Manager de conexiones WebSocket para chat en tiempo real.
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import structlog

logger = structlog.get_logger()


class ConnectionManager:
    def __init__(self):
        # conversation_id → lista de websockets conectados
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)
        logger.info("ws_connected", conversation_id=conversation_id)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        logger.info("ws_disconnected", conversation_id=conversation_id)

    async def send_to_conversation(self, conversation_id: str, data: dict):
        """Envía un mensaje a todos los websockets de una conversación."""
        if conversation_id in self.active_connections:
            dead = []
            for ws in self.active_connections[conversation_id]:
                try:
                    await ws.send_text(json.dumps(data, default=str))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[conversation_id].remove(ws)

    async def broadcast_to_business(self, business_id: str, data: dict):
        """Broadcast a todas las conexiones de un negocio (para el dashboard)."""
        key = f"business_{business_id}"
        await self.send_to_conversation(key, data)


ws_manager = ConnectionManager()
