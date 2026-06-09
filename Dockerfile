FROM python:3.11-slim

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y \
    nodejs npm curl libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Build frontend ──────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Setup backend ───────────────────────────────────────────────
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# Copy frontend dist into backend for static serving
RUN cp -r frontend/dist backend/dist

# ── HuggingFace uses port 7860 ──────────────────────────────────
EXPOSE 7860

WORKDIR /app/backend

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
