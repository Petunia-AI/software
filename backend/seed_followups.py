"""
Seed demo follow-up data for the seguimiento module.
Run from backend/ directory:  python3 seed_followups.py
"""
import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from sqlalchemy import text
from app.database import AsyncSessionLocal


async def seed():
    async with AsyncSessionLocal() as session:
        # ── Get business with most leads ─────────────────────────────────────
        biz_result = await session.execute(
            text("""
                SELECT b.id, b.name, COUNT(l.id) AS lead_count
                FROM businesses b
                LEFT JOIN leads l ON l.business_id = b.id
                GROUP BY b.id, b.name
                ORDER BY lead_count DESC
                LIMIT 1
            """)
        )
        biz = biz_result.fetchone()
        if not biz:
            print("❌  No business found. Run the app and register first.")
            return
        business_id = biz[0]
        print(f"✅  Business: {biz[1]} ({business_id}) — {biz[2]} leads")

        # ── Get leads ────────────────────────────────────────────────────────
        leads_result = await session.execute(
            text("SELECT id, name FROM leads WHERE business_id = :bid LIMIT 8"),
            {"bid": business_id},
        )
        leads = leads_result.fetchall()
        if not leads:
            print("❌  No leads found. Create some leads first.")
            return
        print(f"✅  Found {len(leads)} leads")

        now = datetime.now(timezone.utc)

        # ── Wipe existing demo followups ─────────────────────────────────────
        await session.execute(
            text("DELETE FROM followups WHERE business_id = :bid AND title LIKE '%(demo)%'"),
            {"bid": business_id},
        )
        await session.execute(
            text("DELETE FROM lead_activities WHERE business_id = :bid AND title LIKE '%(demo)%'"),
            {"bid": business_id},
        )

        def lead(i):
            return leads[i % len(leads)]

        # ── Follow-ups seed data ─────────────────────────────────────────────
        followups = [
            # OVERDUE (past)
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(0)[0],
                "followup_type": "call",
                "title": f"Llamada de seguimiento — {lead(0)[1]} (demo)",
                "description": "Confirmar interés en el producto después de propuesta enviada.",
                "status": "overdue",
                "priority": "urgent",
                "scheduled_at": now - timedelta(days=2, hours=3),
                "assigned_to": "manual",
                "notify_email": True,
                "notify_whatsapp": False,
                "is_ai_generated": False,
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(1)[0],
                "followup_type": "email",
                "title": f"Enviar propuesta comercial — {lead(1)[1]} (demo)",
                "description": "Reenviar propuesta con descuento especial del 15%.",
                "status": "overdue",
                "priority": "high",
                "scheduled_at": now - timedelta(hours=5),
                "assigned_to": "ai",
                "notify_email": True,
                "notify_whatsapp": True,
                "is_ai_generated": True,
            },
            # TODAY (due soon)
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(2)[0],
                "followup_type": "whatsapp",
                "title": f"WhatsApp de bienvenida — {lead(2)[1]} (demo)",
                "description": "Primer contacto post-registro, verificar necesidades.",
                "status": "pending",
                "priority": "high",
                "scheduled_at": now + timedelta(minutes=45),
                "assigned_to": "ai",
                "notify_email": False,
                "notify_whatsapp": True,
                "is_ai_generated": True,
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(3)[0],
                "followup_type": "meeting",
                "title": f"Demo del producto — {lead(3)[1]} (demo)",
                "description": "Videollamada de 30 min para demo en vivo.",
                "status": "pending",
                "priority": "urgent",
                "scheduled_at": now + timedelta(hours=2),
                "assigned_to": "manual",
                "notify_email": True,
                "notify_whatsapp": True,
                "is_ai_generated": False,
            },
            # THIS WEEK (upcoming)
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(4)[0],
                "followup_type": "call",
                "title": f"Cierre de venta — {lead(4)[1]} (demo)",
                "description": "Lead caliente, listo para cerrar. Preparar contrato.",
                "status": "pending",
                "priority": "high",
                "scheduled_at": now + timedelta(days=1, hours=10),
                "assigned_to": "ai",
                "notify_email": True,
                "notify_whatsapp": False,
                "is_ai_generated": True,
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(0)[0],
                "followup_type": "task",
                "title": f"Preparar contrato — {lead(0)[1]} (demo)",
                "description": "Redactar y enviar contrato de servicio por correo.",
                "status": "pending",
                "priority": "medium",
                "scheduled_at": now + timedelta(days=2),
                "assigned_to": "manual",
                "notify_email": False,
                "notify_whatsapp": False,
                "is_ai_generated": False,
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(1)[0],
                "followup_type": "email",
                "title": f"Seguimiento post-demo — {lead(1)[1]} (demo)",
                "description": "Enviar resumen de la demo y preguntar dudas.",
                "status": "pending",
                "priority": "medium",
                "scheduled_at": now + timedelta(days=3),
                "assigned_to": "ai",
                "notify_email": True,
                "notify_whatsapp": False,
                "is_ai_generated": True,
            },
            # COMPLETED
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(2)[0],
                "followup_type": "call",
                "title": f"Llamada inicial — {lead(2)[1]} (demo)",
                "description": "Primera llamada completada exitosamente.",
                "status": "completed",
                "priority": "medium",
                "scheduled_at": now - timedelta(days=5),
                "completed_at": now - timedelta(days=5, hours=-1),
                "outcome": "interested",
                "assigned_to": "manual",
                "notify_email": False,
                "notify_whatsapp": False,
                "is_ai_generated": False,
            },
        ]

        for fu in followups:
            completed_at = fu.pop("completed_at", None)
            outcome = fu.pop("outcome", None)
            await session.execute(
                text("""
                    INSERT INTO followups
                      (id, business_id, lead_id, followup_type, title, description,
                       status, priority, scheduled_at, completed_at,
                       assigned_to, notify_email, notify_whatsapp, is_ai_generated,
                       created_by, reminder_count, created_at, updated_at)
                    VALUES
                      (:id, :business_id, :lead_id, :followup_type, :title, :description,
                       :status, :priority, :scheduled_at, :completed_at,
                       :assigned_to, :notify_email, :notify_whatsapp, :is_ai_generated,
                       :created_by, 0, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {**fu, "completed_at": completed_at,
                 "created_by": "ai" if fu.get("is_ai_generated") else "manual"},
            )

        # ── Lead activities seed data ────────────────────────────────────────
        activities = [
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(0)[0],
                "activity_type": "call",
                "title": f"Llamada introductoria (demo)",
                "description": "Primer contacto. Mostró interés en el plan Pro.",
                "outcome": "interested",
                "created_by": "manual",
                "is_ai_generated": False,
                "completed_at": now - timedelta(days=7),
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(0)[0],
                "activity_type": "email",
                "title": f"Propuesta enviada (demo)",
                "description": "Se envió PDF con propuesta comercial personalizada.",
                "outcome": "other",
                "created_by": "ai",
                "is_ai_generated": True,
                "completed_at": now - timedelta(days=5),
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(0)[0],
                "activity_type": "stage_change",
                "title": f"Etapa actualizada a Negociación (demo)",
                "description": None,
                "outcome": None,
                "created_by": "ai",
                "is_ai_generated": True,
                "completed_at": now - timedelta(days=3),
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(1)[0],
                "activity_type": "whatsapp",
                "title": f"WhatsApp de nutrición (demo)",
                "description": "IA envió contenido de valor sobre el producto.",
                "outcome": "contacted",
                "created_by": "ai",
                "is_ai_generated": True,
                "completed_at": now - timedelta(days=4),
            },
            {
                "id": str(uuid.uuid4()),
                "business_id": business_id,
                "lead_id": lead(2)[0],
                "activity_type": "meeting",
                "title": f"Demo videollamada completada (demo)",
                "description": "30 min de demo. Muy interesado, solicitó presupuesto.",
                "outcome": "scheduled",
                "created_by": "manual",
                "is_ai_generated": False,
                "completed_at": now - timedelta(days=2),
            },
        ]

        for act in activities:
            completed_at = act.pop("completed_at")
            await session.execute(
                text("""
                    INSERT INTO lead_activities
                      (id, business_id, lead_id, activity_type, title, description,
                       outcome, created_by, is_ai_generated, completed_at, created_at)
                    VALUES
                      (:id, :business_id, :lead_id, :activity_type, :title, :description,
                       :outcome, :created_by, :is_ai_generated, :completed_at, NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {**act, "completed_at": completed_at},
            )

        await session.commit()
        print(f"\n✅  Seeded {len(followups)} follow-ups and {len(activities)} activities")
        print("   → Open http://localhost:3000/seguimiento to see them")


if __name__ == "__main__":
    asyncio.run(seed())
