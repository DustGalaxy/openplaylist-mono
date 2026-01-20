import asyncio
import aio_pika


async def test_rabbit_connection():
    print("Попытка подключения к RabbitMQ...")
    try:
        connection = await asyncio.wait_for(
            aio_pika.connect_robust("amqp://guest:guest@localhost:6379/"),
            timeout=10,  # Установите таймаут, чтобы не висеть бесконечно
        )
        print("Успешно подключено к RabbitMQ с помощью aio_pika!")
        await connection.close()
    except asyncio.TimeoutError:
        print("Подключение к RabbitMQ истекло по таймауту. Возможно, фаервол или брокер не слушает порт 6379.")
    except Exception as e:
        print(f"Не удалось подключиться к RabbitMQ: {e}")


if __name__ == "__main__":
    asyncio.run(test_rabbit_connection())
