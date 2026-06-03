FROM python:3.13.6-alpine3.22

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-cache --no-dev

COPY . .

CMD ["uv", "run", "faststream", "run", "main:app"]