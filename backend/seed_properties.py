"""
Script para crear 2 propiedades de ejemplo con imágenes (Orlando / Lake Nona, FL)
Ejecutar: python seed_properties.py
"""
import asyncio
import uuid
from datetime import datetime, timezone
import asyncpg

DB_URL = "postgresql://postgres:password@localhost:5432/agente_ventas"

# Imágenes de Unsplash (casas de Florida, libres de uso)
PROP1_IMAGES = [
    ("https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80", "Front exterior - Lake Nona home", True),
    ("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80", "Gourmet kitchen with quartz countertops", False),
    ("https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1200&q=80", "Open living room with pool view", False),
    ("https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80", "Private pool and covered lanai", False),
    ("https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80", "Master bedroom suite", False),
]

PROP2_IMAGES = [
    ("https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80", "Modern condo exterior - Dr. Phillips", True),
    ("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80", "Open floor plan living area", False),
    ("https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80", "Modern kitchen with island", False),
    ("https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80", "Master bath with soaking tub", False),
    ("https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=80", "Rooftop terrace with city view", False),
]

async def main():
    conn = await asyncpg.connect(DB_URL)

    # Get demo business_id
    row = await conn.fetchrow("SELECT business_id FROM users WHERE email='demo@agenteventas.ai'")
    if not row:
        print("ERROR: demo user not found")
        return
    biz_id = row["business_id"]
    print(f"Business ID: {biz_id}")

    now = datetime.now(timezone.utc)

    # ── Property 1: Casa Lake Nona ────────────────────────────────────────
    p1_id = str(uuid.uuid4())
    await conn.execute("""
        INSERT INTO properties (
            id, business_id, title, property_type, operation_type, status,
            price, currency, bedrooms, bathrooms, parking_spaces,
            area_m2, construction_m2, age_years,
            address, neighborhood, city, state,
            description, amenities, features,
            cover_image_url, is_active, created_at
        ) VALUES ($1,$2,$3,'casa','venta','disponible',
            549000,'USD',4,3.0,2,2850,2100,3,
            '8742 Tavistock Lakes Blvd','Lake Nona','Orlando','FL',
            $4,$5,$6,$7,true,$8)
        ON CONFLICT (id) DO NOTHING
    """,
        p1_id, biz_id,
        "Modern 4BR Home in Lake Nona",
        "Stunning 4-bedroom, 3-bath home in the heart of Lake Nona. Open floor plan, gourmet kitchen with quartz countertops, master suite with spa-like bath, covered lanai, and a private pool. Located minutes from Medical City, USTA, and top-rated schools. Zoned for A-rated schools.",
        '["Pool","Covered Lanai","Smart Home","2-Car Garage","Gourmet Kitchen","Walk-in Closets","HOA Community","EV Charger"]',
        '{"HOA":"$285/mo","Year Built":"2022","Lot Size":"0.18 acres","School District":"Orange County","Garage":"2-car attached"}',
        PROP1_IMAGES[0][0],
        now,
    )

    for i, (url, caption, is_cover) in enumerate(PROP1_IMAGES):
        img_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO property_images (id, property_id, url, caption, is_cover, "order", created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO NOTHING
        """, img_id, p1_id, url, caption, is_cover, i, now)

    print(f"✅ Property 1 created: {p1_id} — Modern 4BR Home in Lake Nona ($549,000)")

    # ── Property 2: Condo Dr. Phillips ───────────────────────────────────
    p2_id = str(uuid.uuid4())
    await conn.execute("""
        INSERT INTO properties (
            id, business_id, title, property_type, operation_type, status,
            price, currency, bedrooms, bathrooms, parking_spaces,
            area_m2, construction_m2, age_years, floor, total_floors,
            address, neighborhood, city, state,
            description, amenities, features,
            cover_image_url, is_active, created_at
        ) VALUES ($1,$2,$3,'departamento','venta','disponible',
            389000,'USD',3,2.0,1,1650,1650,5,8,12,
            '7601 Turkey Lake Rd, Unit 8B','Dr. Phillips','Orlando','FL',
            $4,$5,$6,$7,true,$8)
        ON CONFLICT (id) DO NOTHING
    """,
        p2_id, biz_id,
        "Luxury 3BR Condo — Dr. Phillips, Unit 8B",
        "Contemporary 3-bedroom luxury condo on the 8th floor with panoramic views of the Dr. Phillips corridor. Features include an open-concept layout, chef's kitchen with stainless steel appliances, private terrace, and access to resort-style amenities. Walking distance to Restaurant Row, Trader Joe's, and I-4.",
        '["Rooftop Terrace","Concierge","Fitness Center","Resort Pool","Dog Park","EV Charging","Secured Parking","Storage Unit"]',
        '{"HOA":"$425/mo","Year Built":"2020","Floor":"8 of 12","Parking":"1 assigned space","View":"City & Lake","Pets":"Allowed"}',
        PROP2_IMAGES[0][0],
        now,
    )

    for i, (url, caption, is_cover) in enumerate(PROP2_IMAGES):
        img_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO property_images (id, property_id, url, caption, is_cover, "order", created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (id) DO NOTHING
        """, img_id, p2_id, url, caption, is_cover, i, now)

    print(f"✅ Property 2 created: {p2_id} — Luxury 3BR Condo Dr. Phillips ($389,000)")

    await conn.close()
    print("\n🎉 Done! Open http://localhost:3000/properties to see them.")

asyncio.run(main())
