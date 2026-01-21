from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker

# from src.settings import settings

# 1. Настраиваем бэкенд для хранения результатов (чтобы знать, что задача выполнена)
result_backend = RedisAsyncResultBackend(redis_url="redis://localhost:6379/2")

# 2. Настраиваем брокер (очередь сообщений)
broker = ListQueueBroker(
    url="redis://localhost:6379/2",
).with_result_backend(result_backend)

print(broker.get_all_tasks())
