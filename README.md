# Project 1

Docker-first starter for a web app that uses:

- HTML/CSS/JS for the UI
- Node.js for frontend tooling
- Python for the backend API

The project is designed so you can develop on macOS with Docker Desktop and
then ship the built image to a Linux server.

## Stack

- Frontend: Vite + Vanilla JavaScript
- Backend: FastAPI + Uvicorn
- Dev orchestration: Docker Compose
- Production packaging: single multi-stage Docker image

## Run In Development

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/health

## Build Production Image

```bash
docker buildx build --platform linux/amd64 -t project-1:latest .
docker run --rm -p 8000:8000 project-1:latest
```

Open http://localhost:8000

## Ship To Linux Server

The target server is Linux `x86_64`, so build for `linux/amd64` from your Mac
before shipping.

You can push the image to a registry or export/import it directly.

Export:

```bash
docker buildx build --platform linux/amd64 -t project-1:latest .
docker save project-1:latest -o project-1.tar
```

Import on the server:

```bash
docker load -i project-1.tar
docker run -d --name project-1 -p 8000:8000 project-1:latest
```
