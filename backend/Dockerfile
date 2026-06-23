# Django + DRF API for the Shift Analytics dashboard.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install Python deps first so the layer is cached across code changes.
# gunicorn is added here (not in requirements.txt) as the production WSGI server.
COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn==23.0.0

COPY . .

# Strip any CRLF the script may have picked up on Windows so /bin/sh can run it.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
