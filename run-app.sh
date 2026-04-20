#!/bin/sh
set -eu

cd "$(dirname "$0")"
docker compose up --build -d

echo "App is starting at http://localhost:8000"
