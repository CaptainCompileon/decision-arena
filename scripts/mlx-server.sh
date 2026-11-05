#!/usr/bin/env bash
# Runs elephant-1 locally: the community MLX 4-bit conversion and its own
# /v1/systemone server, on http://127.0.0.1:8765. Apple silicon only.
# First run creates .venv-mlx and downloads about 4.7 GB.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=0x36/elephant-1-9B-MLX-4bit
# Pinned: serve.py and decision_mlx.py come from this repo and run as code.
REVISION=16de0e500eea4e44fc7db79928c03c53e324bcb0
PORT="${PORT:-8765}"

if [ ! -x .venv-mlx/bin/python ]; then
  python3 -m venv .venv-mlx
  .venv-mlx/bin/pip install -q mlx-lm fastapi uvicorn pydantic huggingface_hub
fi

DIR=$(.venv-mlx/bin/hf download "$REPO" --revision "$REVISION" --quiet)
# The cache's files are symlinks into blobs/, and Python puts the resolved
# script directory on sys.path, where decision_mlx.py has a hashed name.
export PYTHONPATH="$DIR${PYTHONPATH:+:$PYTHONPATH}"
exec .venv-mlx/bin/python "$DIR/serve.py" --model "$DIR" --port "$PORT"
