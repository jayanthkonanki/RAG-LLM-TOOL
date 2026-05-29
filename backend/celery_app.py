"""
celery_app.py — Celery application factory.
Broker: RabbitMQ (AMQP).
"""
from celery import Celery
import os

RABBITMQ_HOST     = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_USER     = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")

BROKER_URL = f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASSWORD}@{RABBITMQ_HOST}:5672//"

celery_app = Celery(
    "rag_tasks",
    broker=BROKER_URL,
    include=["celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Retry connection on startup
    broker_connection_retry_on_startup=True,
)
