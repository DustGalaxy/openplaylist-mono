FROM python:3.13.6-alpine3.22

WORKDIR /app

# Устанавливаем uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-cache --no-dev

COPY . .

EXPOSE 8000

# Пример изменения CMD в Dockerfile
CMD ["uv", "run", "--no-dev" "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]