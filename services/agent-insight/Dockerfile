FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY agent-insight/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy common module (build context should be from services/ directory)
COPY common /app/common

# Copy service code
COPY agent-insight/ /app/

ENV PORT=8082
EXPOSE 8082

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]

