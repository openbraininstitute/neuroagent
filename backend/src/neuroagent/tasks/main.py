"""Celery application for tasks."""

from celery import Celery

from neuroagent.tasks.config import Settings

settings = Settings()

celery = Celery(__name__)
celery.conf.broker_url = settings.celery.broker_url
celery.conf.result_backend = settings.celery.result_backend

# Autodiscover tasks
celery.autodiscover_tasks(["neuroagent.tasks"])
