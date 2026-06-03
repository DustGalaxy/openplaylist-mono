FROM python:3.13.6-alpine3.22

WORKDIR /app

# Устанавливаем uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-cache --no-dev

COPY . .

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "main.py"]