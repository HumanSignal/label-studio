FROM python:3.11-slim
WORKDIR /app

# System deps for building some Python packages and gettext for Django
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gettext git curl && rm -rf /var/lib/apt/lists/*

# Copy project metadata for dependency install
COPY pyproject.toml poetry.lock* ./

# Install poetry and dependencies (including test extras)
RUN pip install --upgrade pip setuptools wheel && pip install poetry
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --with test

# Copy the rest of the repository
COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["pytest", "-q"]
