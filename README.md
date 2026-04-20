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

## Run The App Quickly

```bash
./run-app.sh
```

Then open:

- App: http://localhost:8000

To stop it:

```bash
./stop-app.sh
```

This mode is the easiest one for Docker Desktop because it runs one app
container with port `8000` published directly.

The names you should look for in Docker Desktop are:

- Image: `asn-web-app:latest`
- Container: `asn-web-app`

## Run In Development

```bash
docker compose up --build
```

By default the backend reads ASN source files from:

- `/Users/ta/Documents/ASN`

The current app only reads:

- `ASN-Assigment.master.xlsx`

If you want a different folder on your Mac, override it when starting Docker:

```bash
HOST_ASN_DATA_DIR=/your/asn/folder ./run-app.sh
```

Then open:

- App: http://localhost:8000

For the separate frontend/backend development mode:

```bash
docker compose -f docker-compose.yml up --build
```

Then open:

- Frontend dev: http://localhost:5173
- Backend API: http://localhost:8000/api/health

## Build Production Image

```bash
docker buildx build --platform linux/amd64 -t project-1:latest .
docker run --rm \
  -p 8000:8000 \
  -e ASN_SOURCE_DIR=/asn-source \
  -v /path/to/asn-data:/asn-source:ro \
  project-1:latest
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
