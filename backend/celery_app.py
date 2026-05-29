from celery import Celery
import os

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")

celery_app = Celery(
    "rag_tasks",
    broker=f"amqp://guest:guest@{RABBITMQ_HOST}:5672//",
    include=['celery_tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
