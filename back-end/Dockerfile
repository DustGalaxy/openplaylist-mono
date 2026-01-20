FROM python:3.13.6-alpine3.22

WORKDIR /app

COPY pyproject.toml .env ./

RUN pip install uv

COPY . .

EXPOSE 8000

CMD ["uv", "run", "src/main.py"]