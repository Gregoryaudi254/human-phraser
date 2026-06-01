FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WEB_CONCURRENCY=2
ENV CELERY_WORKER_CONCURRENCY=2
ENV HF_HOME=/home/appuser/.cache/huggingface
ENV TRANSFORMERS_CACHE=/home/appuser/.cache/huggingface/transformers

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos "" appuser \
    && mkdir -p /home/appuser/.cache/huggingface \
    && chown -R appuser:appuser /app /home/appuser

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)"]

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY}"]
