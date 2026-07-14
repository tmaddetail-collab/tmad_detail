import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.service import Service
from app.security import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        admin = await db.execute(select(User).where(User.email == "admin@detailapp.com"))
        if not admin.scalar_one_or_none():
            admin_user = User(
                name="Administrador",
                email="admin@detailapp.com",
                password_hash=hash_password("admin123"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin_user)
            print("Admin user created: admin@detailapp.com / admin123")

        client = await db.execute(select(User).where(User.email == "cliente@teste.com"))
        if not client.scalar_one_or_none():
            client_user = User(
                name="Cliente Teste",
                email="cliente@teste.com",
                password_hash=hash_password("cliente123"),
                role=UserRole.client,
                is_active=True,
            )
            db.add(client_user)
            print("Client user created: cliente@teste.com / cliente123")

        services_data = [
            {"name": "Lavagem Simples", "category": "Lavagem", "description": "Lavagem externa completa com shampoo automotivo", "estimated_time": 30, "price": Decimal("50.00")},
            {"name": "Lavagem Técnica", "category": "Lavagem", "description": "Lavagem detalhada com remoção de sujeiras incrustadas", "estimated_time": 60, "price": Decimal("90.00")},
            {"name": "Lavagem Técnica + Cera", "category": "Lavagem", "description": "Lavagem técnica com aplicação de cera protetiva", "estimated_time": 90, "price": Decimal("130.00")},
            {"name": "Higienização Interna", "category": "Interno", "description": "Limpeza completa do interior, bancos, carpetes e teto", "estimated_time": 150, "price": Decimal("200.00")},
            {"name": "Higienização Bancos Couro", "category": "Interno", "description": "Limpeza e hidratação de bancos em couro", "estimated_time": 90, "price": Decimal("150.00")},
            {"name": "Polimento", "category": "Pintura", "description": "Polimento para recuperação do brilho da pintura", "estimated_time": 180, "price": Decimal("300.00")},
            {"name": "Polimento Técnico", "category": "Pintura", "description": "Polimento em múltiplos estágios para remoção de riscos profundos", "estimated_time": 300, "price": Decimal("500.00")},
            {"name": "Cristalização", "category": "Pintura", "description": "Aplicação de resina para proteção da pintura (6 meses)", "estimated_time": 240, "price": Decimal("400.00")},
            {"name": "Vitrificação", "category": "Pintura", "description": "Revestimento cerâmico de alta durabilidade (2 anos)", "estimated_time": 480, "price": Decimal("1200.00")},
            {"name": "Espelhamento", "category": "Pintura", "description": "Processo completo para efeito espelho na pintura", "estimated_time": 600, "price": Decimal("2000.00")},
            {"name": "Revitalização de Faróis", "category": "Acabamento", "description": "Restauração de faróis opacos ou amarelados", "estimated_time": 60, "price": Decimal("100.00")},
            {"name": "Tratamento de Borrachas", "category": "Acabamento", "description": "Limpeza e proteção de guarnições e borrachas", "estimated_time": 30, "price": Decimal("60.00")},
            {"name": "Lavagem de Motor", "category": "Motor", "description": "Lavagem e desengraxe do compartimento do motor", "estimated_time": 60, "price": Decimal("120.00")},
            {"name": "Descontaminação de Pintura", "category": "Pintura", "description": "Remoção química de contaminações da pintura", "estimated_time": 120, "price": Decimal("180.00")},
            {"name": "Proteção de Pintura Líquida", "category": "Pintura", "description": "Aplicação de selante líquido de proteção (3 meses)", "estimated_time": 60, "price": Decimal("150.00")},
        ]

        existing_services = await db.execute(select(Service))
        if existing_services.scalars().first() is None:
            for svc_data in services_data:
                service = Service(**svc_data)
                db.add(service)
            print(f"{len(services_data)} services created")

        await db.commit()
        print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(seed())
