#!/bin/bash
set -a
source "$(dirname "$0")/.env"
set +a

export NEXT_PUBLIC_API_URL="http://localhost:8000/api"
export NEXT_PUBLIC_WS_URL="ws://localhost:8000"

cd "$(dirname "$0")/frontend"
exec npm run dev
