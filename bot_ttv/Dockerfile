FROM python:3.13.6-alpine3.22

WORKDIR /app

COPY pyproject.toml .docker.env ./

RUN pip install uv

COPY . .

CMD ["uv", "run", "faststream", "run", "main:app"]