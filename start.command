#!/bin/bash
cd "$(dirname "$0")"
if command -v uv >/dev/null 2>&1; then
  exec uv run server.py
fi
echo "uv was not found; starting with the system Python instead. Install uv from https://docs.astral.sh/uv/"
exec python3 server.py
