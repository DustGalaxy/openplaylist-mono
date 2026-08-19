import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.database import engine


async def check_db_connection():
    print(f"Проверка соединения с {engine.url.render_as_string(hide_password=True)}...")

    try:
        # Используем begin() для автоматического отката в случае неудачи
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))

        print("✅ Успешно: База данных доступна.")

    except SQLAlchemyError as e:
        print(f"❌ Ошибка SQLAlchemy: {e.__class__.__name__}", file=sys.stderr)
        print(f"Детали: {e}", file=sys.stderr)
        sys.exit(1)

    except Exception as e:
        print(f"⚠️ Непредвиденная ошибка: {e}", file=sys.stderr)
        sys.exit(1)

    finally:
        # Закрываем пул соединений
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_db_connection())
