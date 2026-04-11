#!/bin/bash
set -a
source "$(dirname "$0")/.env"
set +a

cd "$(dirname "$0")/backend"
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
